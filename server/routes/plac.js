import { Router } from "express";
import {
  countActivePlacListingsByUser,
  countPlacInboxUnread,
  userIsPlacSeller,
  createPlacListing,
  createPlacOrder,
  deletePlacListing,
  findUserById,
  getPlacSeller,
  getPlacListingById,
  getPlacShopSettings,
  getPlacThreadForUser,
  listActivePlacListings,
  listActivePlacListingsByUser,
  listPlacInboxThreads,
  listPlacListingsByUser,
  listPlacOrdersForUser,
  listPlacSellers,
  listPlacThreadMessages,
  replyPlacThreadMessage,
  startPlacListingMessage,
  updatePlacListing,
  updatePlacListingGenre,
  updatePlacOrderStatus,
  updatePlacShopSettings,
  upsertGoogleUser,
} from "../db.js";
import {
  mockFetchPlacReleaseDetails,
  mockResolvePlacReleaseFromUrl,
  fetchPlacReleaseDetails,
  resolvePlacReleaseFromUrl,
} from "../discogs/recordMeta.js";
import { discogsAppConfigured } from "../discogs/auth.js";
import { isValidGrade } from "../../shared/orderReview.js";
import {
  isSupportedPlacDiscogsUrl,
  isValidPlacCategory,
  isValidPlacOtherCondition,
} from "../../shared/plac.js";
import { normalizePlacYear } from "../../shared/placFormat.js";
import { MOCK_USER } from "../mock.js";

const router = Router();
const styleBackfillInFlight = new Set();

function useMockAuth() {
  return process.env.USE_MOCK_AUTH === "true";
}

function queuePlacStyleBackfill(listings = []) {
  if (!discogsAppConfigured()) return;

  const pending = [];
  for (const listing of listings) {
    if (!listing?.id || listing.releaseId == null) continue;
    if (styleBackfillInFlight.has(listing.id)) continue;
    styleBackfillInFlight.add(listing.id);
    pending.push(listing);
  }

  // Process one-by-one so detail-page Discogs calls are not buried behind a flood.
  (async () => {
    for (const listing of pending) {
      try {
        const release = await fetchPlacReleaseDetails(listing.releaseId, {
          enrichListenLinks: false,
        });
        if (release?.styles?.length) {
          updatePlacListingGenre(listing.id, release.styles.join(", "));
        }
      } catch {
        /* ignore backfill errors */
      }
    }
  })();
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

async function fetchReleaseMeta(url) {
  if (!discogsAppConfigured()) {
    if (useMockAuth()) {
      return mockResolvePlacReleaseFromUrl(url);
    }
    throw new Error(
      "Discogs API ni konfiguriran. Na strežniku nastavi DISCOGS_CONSUMER_KEY in DISCOGS_CONSUMER_SECRET."
    );
  }
  return resolvePlacReleaseFromUrl(url);
}

function parsePrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function resolveListingFields(release, { priceValue, mediaCondition, sleeveCondition }) {
  const price =
    release.fromListing && release.priceValue != null
      ? release.priceValue
      : priceValue;

  const media =
    release.fromListing &&
    release.mediaCondition &&
    isValidGrade(release.mediaCondition)
      ? release.mediaCondition
      : mediaCondition;

  const sleeve =
    release.fromListing &&
    release.sleeveCondition &&
    isValidGrade(release.sleeveCondition)
      ? release.sleeveCondition
      : sleeveCondition || null;

  return { price, media, sleeve };
}

async function createVinylPlacListing(userId, url, fields) {
  if (!isSupportedPlacDiscogsUrl(url)) {
    throw new Error("Neveljavna Discogs povezava.");
  }

  const release = await fetchReleaseMeta(url.trim());
  const { price, media, sleeve } = resolveListingFields(release, fields);

  if (price == null) {
    throw new Error("Vnesi veljavno ceno.");
  }
  if (!media || !isValidGrade(media)) {
    throw new Error("Izberi stanje medija.");
  }
  if (sleeve && !isValidGrade(sleeve)) {
    throw new Error("Neveljavno stanje ovoja.");
  }

  return createPlacListing({
    userId,
    listingType: "vinyl",
    category: "vinyl",
    releaseUrl: release.releaseUrl,
    releaseId: release.releaseId,
    artist: release.artist,
    title: release.title,
    thumbnailUrl: release.thumbnailUrl,
    year: normalizePlacYear(release.year),
    genre: release.genre,
    country: release.country,
    format: release.format,
    priceValue: price,
    priceCurrency: "EUR",
    mediaCondition: media,
    sleeveCondition: sleeve,
    note: fields.note?.trim() || null,
  });
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
  queuePlacStyleBackfill(listings);
});

router.get("/", requireUser, (req, res) => {
  const listings = listActivePlacListings({ query: req.query.q });
  res.json({ listings });
});

router.get("/mine", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const listings = listPlacListingsByUser(userId);
  res.json({ listings });
  queuePlacStyleBackfill(listings);
});

router.get("/counts", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  res.json({
    mine: countActivePlacListingsByUser(userId),
    isSeller: userIsPlacSeller(userId),
    inboxUnread: countPlacInboxUnread(userId),
  });
});

router.get("/shop", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const settings = getPlacShopSettings(userId);
  res.json({ settings });
});

router.patch("/shop", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const { discountPercent, discountLabel } = req.body ?? {};
  const settings = updatePlacShopSettings(userId, {
    discountPercent,
    discountLabel,
  });
  res.json({ settings });
});

router.get("/inbox", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const threads = listPlacInboxThreads(userId);
  res.json({ threads, unread: countPlacInboxUnread(userId) });
});

router.get("/inbox/:threadId", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const thread = getPlacThreadForUser(req.params.threadId, userId);
  if (!thread) {
    return res.status(404).json({ error: "Pogovor ni bil najden." });
  }
  const messages = listPlacThreadMessages(req.params.threadId, userId);
  res.json({ thread, messages });
});

router.post("/inbox/:threadId/messages", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const result = replyPlacThreadMessage({
    threadId: req.params.threadId,
    senderId: userId,
    body: req.body?.body,
  });
  if (result?.error === "not_found") {
    return res.status(404).json({ error: "Pogovor ni bil najden." });
  }
  if (result?.error === "invalid_body") {
    return res.status(400).json({ error: "Vnesi sporočilo (do 2000 znakov)." });
  }
  res.status(201).json(result);
});

router.post("/:id/messages", requireUser, (req, res) => {
  const buyerId = ensureRequestUser(req);
  const result = startPlacListingMessage({
    listingId: req.params.id,
    buyerId,
    body: req.body?.body,
  });
  if (result?.error === "not_found") {
    return res.status(404).json({ error: "Oglas ni bil najden." });
  }
  if (result?.error === "own_listing") {
    return res.status(400).json({ error: "Ne moreš sporočiti lastnega oglasa." });
  }
  if (result?.error === "invalid_body") {
    return res.status(400).json({ error: "Vnesi sporočilo (do 2000 znakov)." });
  }
  res.status(201).json(result);
});

router.get("/orders", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const orders = listPlacOrdersForUser(userId);
  res.json({ orders });
});

router.post("/orders", requireUser, (req, res) => {
  const buyerId = ensureRequestUser(req);
  const { sellerId, listingIds, note } = req.body ?? {};

  if (!sellerId || !Array.isArray(listingIds) || listingIds.length === 0) {
    return res.status(400).json({ error: "Izberi vsaj en artikel." });
  }
  if (sellerId === buyerId) {
    return res.status(400).json({ error: "Ne moreš naročiti lastnih artiklov." });
  }
  if (!findUserById(sellerId)) {
    return res.status(404).json({ error: "Prodajalec ni bil najden." });
  }

  const order = createPlacOrder({
    buyerId,
    sellerId,
    listingIds,
    note: note?.trim() || null,
  });

  if (!order) {
    return res.status(400).json({ error: "Artikli niso na voljo ali so neveljavni." });
  }

  res.status(201).json({ order });
});

router.patch("/orders/:id", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const { status } = req.body ?? {};
  if (!status) {
    return res.status(400).json({ error: "Manjka status." });
  }

  const order = updatePlacOrderStatus(req.params.id, userId, status);
  if (!order) {
    return res.status(400).json({ error: "Naročila ni bilo mogoče posodobiti." });
  }
  res.json({ order });
});

router.post("/preview", requireUser, async (req, res) => {
  try {
    const { releaseUrl } = req.body ?? {};
    if (!releaseUrl?.trim()) {
      return res.status(400).json({ error: "Vnesi Discogs povezavo." });
    }

    if (!isSupportedPlacDiscogsUrl(releaseUrl)) {
      return res.status(400).json({
        error: "Podprte so release (/release/) ali listing (/sell/item/, /shop/item/) povezave.",
      });
    }

    const release = await fetchReleaseMeta(releaseUrl.trim());
    res.json({ release });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Podatkov ni bilo mogoče naložiti." });
  }
});

router.post("/preview-batch", requireUser, async (req, res) => {
  try {
    const urls = Array.isArray(req.body?.releaseUrls) ? req.body.releaseUrls : [];
    const trimmed = urls.map((url) => url?.trim()).filter(Boolean);

    if (trimmed.length === 0) {
      return res.status(400).json({ error: "Vnesi vsaj eno Discogs povezavo." });
    }

    const releases = [];
    const errors = [];

    await Promise.all(
      trimmed.map(async (releaseUrl) => {
        if (!isSupportedPlacDiscogsUrl(releaseUrl)) {
          errors.push({ releaseUrl, error: "Neveljavna Discogs povezava." });
          return;
        }
        try {
          const release = await fetchReleaseMeta(releaseUrl);
          releases.push({ ...release, releaseUrl });
        } catch (err) {
          errors.push({
            releaseUrl,
            error: err.message ?? "Podatkov ni bilo mogoče naložiti.",
          });
        }
      })
    );

    if (releases.length === 0) {
      return res.status(400).json({
        error: errors[0]?.error ?? "Podatkov ni bilo mogoče naložiti.",
        errors,
      });
    }

    res.json({ releases, errors });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Podatkov ni bilo mogoče naložiti." });
  }
});

router.post("/", requireUser, async (req, res) => {
  try {
    const userId = ensureRequestUser(req);
    const body = req.body ?? {};
    const listingType = body.listingType === "other" ? "other" : "vinyl";

    if (listingType === "other") {
      const price = parsePrice(body.priceValue);
      if (price == null) {
        return res.status(400).json({ error: "Vnesi veljavno ceno." });
      }
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
    const price = parsePrice(body.priceValue);

    if (!releaseUrl?.trim()) {
      return res.status(400).json({ error: "Vnesi Discogs povezavo." });
    }

    if (mediaCondition && !isValidGrade(mediaCondition)) {
      return res.status(400).json({ error: "Neveljavno stanje medija." });
    }

    if (sleeveCondition && !isValidGrade(sleeveCondition)) {
      return res.status(400).json({ error: "Neveljavno stanje ovoja." });
    }

    const listing = await createVinylPlacListing(userId, releaseUrl, {
      priceValue: price,
      mediaCondition,
      sleeveCondition,
      note,
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
      return res.status(400).json({ error: "Vnesi vsaj eno Discogs povezavo." });
    }

    const price = parsePrice(body.priceValue);
    const { mediaCondition, sleeveCondition, note } = body;

    if (mediaCondition && !isValidGrade(mediaCondition)) {
      return res.status(400).json({ error: "Neveljavno stanje medija." });
    }

    if (sleeveCondition && !isValidGrade(sleeveCondition)) {
      return res.status(400).json({ error: "Neveljavno stanje ovoja." });
    }

    const listings = [];
    const errors = [];

    for (const releaseUrl of trimmed) {
      try {
        const listing = await createVinylPlacListing(userId, releaseUrl, {
          priceValue: price,
          mediaCondition,
          sleeveCondition,
          note,
        });
        listings.push(listing);
      } catch (err) {
        errors.push({
          releaseUrl,
          error: err.message ?? "Oglasa ni bilo mogoče ustvariti.",
        });
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

router.get("/:id", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const listing = getPlacListingById(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: "Oglas ni bil najden." });
  }
  const isOwner = listing.userId === userId;
  if (!isOwner && listing.status !== "active") {
    return res.status(404).json({ error: "Oglas ni bil najden." });
  }
  res.json({ listing });
});

router.get("/:id/release", requireUser, async (req, res) => {
  try {
    const userId = ensureRequestUser(req);
    const listing = getPlacListingById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: "Oglas ni bil najden." });
    }
    const isOwner = listing.userId === userId;
    if (!isOwner && listing.status !== "active") {
      return res.status(404).json({ error: "Oglas ni bil najden." });
    }
    if (listing.releaseId == null) {
      return res.json({ release: null });
    }

    const release = discogsAppConfigured()
      ? await fetchPlacReleaseDetails(listing.releaseId)
      : useMockAuth()
        ? mockFetchPlacReleaseDetails(listing.releaseId)
        : null;

    if (!release && !discogsAppConfigured()) {
      return res.status(503).json({
        error:
          "Discogs API ni konfiguriran. Na strežniku nastavi DISCOGS_CONSUMER_KEY in DISCOGS_CONSUMER_SECRET.",
      });
    }

    if (release?.styles?.length) {
      updatePlacListingGenre(listing.id, release.styles.join(", "));
    }

    res.json({ release });
  } catch (err) {
    res.status(502).json({
      error: err.message ?? "Discogs release details could not be loaded.",
    });
  }
});

router.patch("/:id", requireUser, (req, res) => {
  const userId = ensureRequestUser(req);
  const existing = getPlacListingById(req.params.id);
  if (!existing || existing.userId !== userId) {
    return res.status(404).json({ error: "Oglas ni bil najden." });
  }

  const {
    priceValue,
    mediaCondition,
    sleeveCondition,
    note,
    status,
    title,
    artist,
    category,
  } = req.body ?? {};

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
  if (title !== undefined) {
    const nextTitle = title?.trim();
    if (!nextTitle) {
      return res.status(400).json({ error: "Vnesi naslov oglasa." });
    }
    fields.title = nextTitle;
  }
  if (artist !== undefined) {
    fields.artist = artist?.trim() || null;
  }
  if (category !== undefined) {
    if (!isValidPlacCategory(category)) {
      return res.status(400).json({ error: "Izberi veljavno kategorijo." });
    }
    fields.category = category;
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
