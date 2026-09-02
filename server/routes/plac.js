import { Router } from "express";
import {
  countActivePlacListingsByUser,
  createPlacListing,
  deletePlacListing,
  findUserById,
  listActivePlacListings,
  listPlacListingsByUser,
  updatePlacListing,
  upsertGoogleUser,
} from "../db.js";
import {
  mockResolvePlacReleaseFromUrl,
  resolvePlacReleaseFromUrl,
} from "../discogs/recordMeta.js";
import { discogsAppConfigured } from "../discogs/auth.js";
import { parseDiscogsRecordUrl } from "../../shared/parseRecordUrl.js";
import { isValidGrade } from "../../shared/orderReview.js";
import { MOCK_USER } from "../mock.js";

const router = Router();

function useMockAuth() {
  return process.env.USE_MOCK_AUTH === "true";
}

function ensureRequestUser(req) {
  if (!req.session.userId) return null;

  if (findUserById(req.session.userId)) {
    return req.session.userId;
  }

  if (!useMockAuth()) return null;

  const user = upsertGoogleUser({
    googleId: MOCK_USER.google_id,
    email: MOCK_USER.email,
    name: MOCK_USER.name,
    picture: null,
  });
  req.session.userId = user.id;
  return user.id;
}

function requireUser(req, res, next) {
  if (!ensureRequestUser(req)) {
    return res.status(401).json({ error: "Prijavi se v aplikacijo." });
  }
  next();
}

function useMockDiscogs() {
  return useMockAuth() || !discogsAppConfigured();
}

async function fetchReleaseMeta(url) {
  return useMockDiscogs()
    ? mockResolvePlacReleaseFromUrl(url)
    : resolvePlacReleaseFromUrl(url);
}

function parsePrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

router.get("/", requireUser, (req, res) => {
  const listings = listActivePlacListings({ query: req.query.q });
  res.json({ listings });
});

router.get("/mine", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const listings = listPlacListingsByUser(userId);
  res.json({ listings });
});

router.get("/counts", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  res.json({ mine: countActivePlacListingsByUser(userId) });
});

router.post("/preview", requireUser, async (req, res) => {
  try {
    const { releaseUrl } = req.body ?? {};
    if (!releaseUrl?.trim()) {
      return res.status(400).json({ error: "Vnesi Discogs release povezavo." });
    }

    const parsed = parseDiscogsRecordUrl(releaseUrl);
    if (!parsed.valid || parsed.releaseId == null) {
      return res.status(400).json({
        error: "Podprte so samo Discogs release povezave (/release/).",
      });
    }

    const release = await fetchReleaseMeta(releaseUrl.trim());
    res.json({ release });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Release ni bilo mogoče naložiti." });
  }
});

router.post("/", requireUser, async (req, res) => {
  try {
    const userId = ensureRequestUser(req);
    const {
      releaseUrl,
      priceValue,
      mediaCondition,
      sleeveCondition,
      note,
    } = req.body ?? {};

    if (!releaseUrl?.trim()) {
      return res.status(400).json({ error: "Vnesi Discogs release povezavo." });
    }

    const price = parsePrice(priceValue);
    if (price == null) {
      return res.status(400).json({ error: "Vnesi veljavno ceno." });
    }

    if (!mediaCondition || !isValidGrade(mediaCondition)) {
      return res.status(400).json({ error: "Izberi stanje medija." });
    }

    if (sleeveCondition && !isValidGrade(sleeveCondition)) {
      return res.status(400).json({ error: "Neveljavno stanje ovoja." });
    }

    const release = await fetchReleaseMeta(releaseUrl.trim());
    const listing = createPlacListing({
      userId,
      releaseUrl: release.releaseUrl,
      releaseId: release.releaseId,
      artist: release.artist,
      title: release.title,
      thumbnailUrl: release.thumbnailUrl,
      year: release.year,
      genre: release.genre,
      country: release.country,
      format: release.format,
      priceValue: price,
      priceCurrency: "EUR",
      mediaCondition,
      sleeveCondition: sleeveCondition || null,
      note: note?.trim() || null,
    });

    res.status(201).json({ listing });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Oglasa ni bilo mogoče ustvariti." });
  }
});

router.patch("/:id", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const { priceValue, mediaCondition, sleeveCondition, note, status } = req.body ?? {};

  const fields = {};
  if (priceValue != null) {
    const price = parsePrice(priceValue);
    if (price == null) {
      return res.status(400).json({ error: "Vnesi veljavno ceno." });
    }
    fields.priceValue = price;
  }
  if (mediaCondition != null) {
    if (!isValidGrade(mediaCondition)) {
      return res.status(400).json({ error: "Neveljavno stanje medija." });
    }
    fields.mediaCondition = mediaCondition;
  }
  if (sleeveCondition !== undefined) {
    if (sleeveCondition && !isValidGrade(sleeveCondition)) {
      return res.status(400).json({ error: "Neveljavno stanje ovoja." });
    }
    fields.sleeveCondition = sleeveCondition || null;
  }
  if (note !== undefined) {
    fields.note = note?.trim() || null;
  }
  if (status != null) {
    if (!["active", "sold", "removed"].includes(status)) {
      return res.status(400).json({ error: "Neveljaven status." });
    }
    fields.status = status;
  }

  const listing = updatePlacListing(req.params.id, userId, fields);
  if (!listing) {
    return res.status(404).json({ error: "Oglas ni bil najden." });
  }
  res.json({ listing });
});

router.delete("/:id", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const ok = deletePlacListing(req.params.id, userId);
  if (!ok) {
    return res.status(404).json({ error: "Oglas ni bil najden." });
  }
  res.json({ ok: true });
});

export default router;
