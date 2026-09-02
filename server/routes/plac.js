import { Router } from "express";
import {
  countActivePlacListingsByUser,
  createPlacListing,
  deletePlacListing,
  findUserById,
  getPlacSeller,
  listActivePlacListings,
  listActivePlacListingsByUser,
  listPlacListingsByUser,
  listPlacSellers,
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
import {
  isValidPlacCategory,
  isValidPlacOtherCondition,
} from "../../shared/plac.js";
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

router.get("/sellers", requireUser, (req, res) => {
  const sellers = listPlacSellers({ query: req.query.q });
  res.json({ sellers });
});

router.get("/user/:userId", requireUser, (req, res) => {
  const seller = getPlacSeller(req.params.userId);
  if (!seller || !findUserById(req.params.userId)) {
    return res.status(404).json({ error: "Prodajalec ni bil najden." });
  }
  const listings = listActivePlacListingsByUser(req.params.userId);
  res.json({ seller, listings });
});

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

router.post("/preview-batch", requireUser, async (req, res) => {
  try {
    const urls = Array.isArray(req.body?.releaseUrls) ? req.body.releaseUrls : [];
    const trimmed = urls.map((url) => url?.trim()).filter(Boolean);

    if (trimmed.length === 0) {
      return res.status(400).json({ error: "Vnesi vsaj eno Discogs release povezavo." });
    }

    const releases = [];
    const errors = [];

    await Promise.all(
      trimmed.map(async (releaseUrl) => {
        const parsed = parseDiscogsRecordUrl(releaseUrl);
        if (!parsed.valid || parsed.releaseId == null) {
          errors.push({ releaseUrl, error: "Neveljavna Discogs release povezava." });
          return;
        }
        try {
          const release = await fetchReleaseMeta(releaseUrl);
          releases.push({ ...release, releaseUrl });
        } catch (err) {
          errors.push({ releaseUrl, error: err.message ?? "Release ni bilo mogoče naložiti." });
        }
      })
    );

    if (releases.length === 0) {
      return res.status(400).json({
        error: errors[0]?.error ?? "Release ni bilo mogoče naložiti.",
        errors,
      });
    }

    res.json({ releases, errors });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Release ni bilo mogoče naložiti." });
  }
});

router.post("/", requireUser, async (req, res) => {
  try {
    const userId = ensureRequestUser(req);
    const body = req.body ?? {};
    const listingType = body.listingType === "other" ? "other" : "vinyl";

    const price = parsePrice(body.priceValue);
    if (price == null) {
      return res.status(400).json({ error: "Vnesi veljavno ceno." });
    }

    if (listingType === "other") {
      const title = body.title?.trim();
      if (!title) {
        return res.status(400).json({ error: "Vnesi naslov oglasa." });
      }

      const category = body.category?.trim() || "other";
      if (!isValidPlacCategory(category)) {
        return res.status(400).json({ error: "Izberi veljavno kategorijo." });
      }

      const mediaCondition = body.mediaCondition?.trim() || "Good";
      if (!isValidPlacOtherCondition(mediaCondition)) {
        return res.status(400).json({ error: "Izberi stanje predmeta." });
      }

      const listing = createPlacListing({
        userId,
        listingType: "other",
        category,
        releaseUrl: body.externalUrl?.trim() || "",
        artist: body.brand?.trim() || null,
        title,
        thumbnailUrl: body.thumbnailUrl?.trim() || null,
        priceValue: price,
        priceCurrency: "EUR",
        mediaCondition,
        note: body.note?.trim() || null,
      });

      return res.status(201).json({ listing });
    }

    const { releaseUrl, mediaCondition, sleeveCondition, note } = body;

    if (!releaseUrl?.trim()) {
      return res.status(400).json({ error: "Vnesi Discogs release povezavo." });
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
      listingType: "vinyl",
      category: "vinyl",
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

router.post("/batch", requireUser, async (req, res) => {
  try {
    const userId = ensureRequestUser(req);
    const body = req.body ?? {};
    const urls = Array.isArray(body.releaseUrls) ? body.releaseUrls : [];
    const trimmed = urls.map((url) => url?.trim()).filter(Boolean);

    if (trimmed.length === 0) {
      return res.status(400).json({ error: "Vnesi vsaj eno Discogs release povezavo." });
    }

    const price = parsePrice(body.priceValue);
    if (price == null) {
      return res.status(400).json({ error: "Vnesi veljavno ceno." });
    }

    const { mediaCondition, sleeveCondition, note } = body;

    if (!mediaCondition || !isValidGrade(mediaCondition)) {
      return res.status(400).json({ error: "Izberi stanje medija." });
    }

    if (sleeveCondition && !isValidGrade(sleeveCondition)) {
      return res.status(400).json({ error: "Neveljavno stanje ovoja." });
    }

    const listings = [];
    const errors = [];

    for (const releaseUrl of trimmed) {
      const parsed = parseDiscogsRecordUrl(releaseUrl);
      if (!parsed.valid || parsed.releaseId == null) {
        errors.push({ releaseUrl, error: "Neveljavna Discogs release povezava." });
        continue;
      }
      try {
        const release = await fetchReleaseMeta(releaseUrl);
        const listing = createPlacListing({
          userId,
          listingType: "vinyl",
          category: "vinyl",
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
        listings.push(listing);
      } catch (err) {
        errors.push({ releaseUrl, error: err.message ?? "Oglasa ni bilo mogoče ustvariti." });
      }
    }

    if (listings.length === 0) {
      return res.status(400).json({
        error: errors[0]?.error ?? "Oglasov ni bilo mogoče ustvariti.",
        errors,
      });
    }

    res.status(201).json({ listings, errors });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Oglasov ni bilo mogoče ustvariti." });
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
    if (!isValidGrade(mediaCondition) && !isValidPlacOtherCondition(mediaCondition)) {
      return res.status(400).json({ error: "Neveljavno stanje." });
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
