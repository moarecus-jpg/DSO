import { Router } from "express";
import {
  addSessionLink,
  closeGroupSession,
  deleteGroupSession,
  updateSessionShipping,
  updateSessionSellerAvatar,
  updateMemberDisplayName,
  updateLinkOrdererDisplayName,
  createGroupSession,
  findUserById,
  getGroupSession,
  upsertGoogleUser,
  joinSession,
  listAllGroupSessions,
  listGroupSessions,
  listUserOrderedItems,
  publicUser,
} from "../db.js";
import {
  fetchInventoryForReleaseIds,
  getDiscogsUserProfile,
  getUserWantlist,
} from "../discogs/client.js";
import { sellerMywantsUrl } from "../../shared/discogsUrls.js";
import { matchWantlistToInventory, parseDiscogsUrl } from "../discogs/match.js";
import { MOCK_INVENTORY, MOCK_SESSION, MOCK_USER, MOCK_WANTLIST } from "../mock.js";
import { formatOrderTitle } from "../../shared/orderTitle.js";
import { resolveRecordFromUrl } from "../discogs/recordMeta.js";
import { parseDiscogsUrlList } from "../../shared/parseRecordUrl.js";
import { DISPLAY_CURRENCY, toEurAmount } from "../../shared/currency.js";
import { enrichSessionOrder, recordTitle } from "../../shared/orderTotals.js";
import { sessionForViewer } from "../../shared/sessionPrivacy.js";
import { resolveSellerInput } from "../discogs/resolveSeller.js";
import { googleConfigured } from "../auth/google.js";
import { discogsAppConfigured } from "../discogs/auth.js";
import { discogsOAuthConfigured } from "../discogs/oauth.js";
import { isOrderAdmin } from "../auth/orderAdmin.js";

const router = Router();
let mockOrderSeq = 1;
let mockSessions = [{ ...MOCK_SESSION }];

function mockSessionDetail(summary) {
  return enrichSessionOrder({
    ...summary,
    members: [
      {
        id: MOCK_USER.id,
        name: MOCK_USER.name,
        account_name: MOCK_USER.name,
        email: MOCK_USER.email,
        discogs_username: MOCK_USER.discogs_username,
      },
      {
        id: "mock-user-2",
        name: "Maya",
        account_name: "Maya",
        email: "maya@example.com",
        discogs_username: null,
      },
    ],
    links: summary.links ?? [],
  });
}

function useMockAuth() {
  return process.env.USE_MOCK_AUTH === "true" || !googleConfigured();
}

/** Mock session list only for legacy demo login, not local password accounts. */
function useMockSessions(req) {
  if (!useMockAuth()) return false;
  const user = findUserById(req.session.userId);
  return !user?.password_hash;
}

function resolveSessionSeller(sessionId) {
  if (useMockAuth() && sessionId.startsWith("mock")) {
    const summary = mockSessions.find((s) => s.id === sessionId);
    return summary?.seller_username ?? null;
  }
  return getGroupSession(sessionId)?.seller_username ?? null;
}

function resolveUserForMatches(userId) {
  if (useMockAuth()) {
    const dbUser = findUserById(userId);
    if (dbUser?.discogs_token) return dbUser;
    if (userId === MOCK_USER.id || !dbUser) return MOCK_USER;
    return dbUser;
  }
  return findUserById(userId);
}

async function wantlistMatchesForUser(user, seller) {
  const useMockDiscogs =
    useMockAuth() &&
    (!discogsOAuthConfigured() || user?.discogs_token === "mock");

  const discogsMywantsUrl = sellerMywantsUrl(
    seller,
    user?.discogs_username ?? null
  );

  if (!user?.discogs_token || !user.discogs_username) {
    return {
      connected: false,
      matches: [],
      inventoryCount: null,
      discogsMywantsUrl: sellerMywantsUrl(seller),
    };
  }

  if (!useMockDiscogs && !discogsAppConfigured()) {
    throw new Error(
      "V .env manjkata DISCOGS_CONSUMER_KEY in DISCOGS_CONSUMER_SECRET (Discogs Developer aplikacija)."
    );
  }

  let wantlist;
  if (useMockDiscogs) {
    wantlist = MOCK_WANTLIST;
  } else {
    wantlist = await getUserWantlist(
      user.discogs_username,
      user.discogs_token,
      user.discogs_token_secret
    );
  }

  let inventory;
  let scanNote = null;
  if (useMockDiscogs) {
    inventory = MOCK_INVENTORY;
  } else {
    const releaseIds = wantlist
      .map((w) => w.id ?? w.basic_information?.id)
      .filter((id) => id != null);
    inventory = await fetchInventoryForReleaseIds(
      seller,
      releaseIds,
      user.discogs_token,
      user.discogs_token_secret
    );
    scanNote =
      "Isti izbor kot na Discogs /seller/…/mywants — prek API (tvoja wantlist + zaloga sellerja).";
  }

  return {
    connected: true,
    matches: matchWantlistToInventory(wantlist, inventory),
    inventoryCount: null,
    discogsMywantsUrl,
    scanNote,
  };
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

function withOrderPermissions(session, userId) {
  const isAdmin = isOrderAdmin(session, userId);
  const viewed = sessionForViewer(session, userId, isAdmin);
  return {
    ...viewed,
    canManageMembers: isAdmin,
    canManageShipping: isAdmin,
  };
}

function listStatus(req) {
  const raw = req.query.status;
  if (raw === "all") return "all";
  if (raw === "closed") return "closed";
  return "open";
}

async function fetchSellerAvatarUrl(username) {
  if (!discogsAppConfigured()) return null;
  try {
    return await getDiscogsUserProfile(username);
  } catch (err) {
    console.warn("Seller avatar:", username, err.message);
    return null;
  }
}

async function ensureSellerAvatar(session) {
  if (!session?.seller_username || session.seller_avatar_url) return session;
  const url = await fetchSellerAvatarUrl(session.seller_username);
  if (!url) return session;
  if (session.id && !String(session.id).startsWith("mock")) {
    const updated = updateSessionSellerAvatar(session.id, url);
    return updated ?? { ...session, seller_avatar_url: url };
  }
  return { ...session, seller_avatar_url: url };
}

async function ensureSellerAvatars(sessions) {
  return Promise.all(sessions.map((s) => ensureSellerAvatar(s)));
}

router.get("/", requireUser, async (req, res) => {
  const status = listStatus(req);
  if (useMockSessions(req)) {
    const sessions =
      status === "all"
        ? mockSessions
        : mockSessions.filter((s) => (s.status ?? "open") === status);
    return res.json({ sessions: await ensureSellerAvatars(sessions) });
  }
  const sessions =
    status === "all" ? listAllGroupSessions() : listGroupSessions(status);
  res.json({ sessions: await ensureSellerAvatars(sessions) });
});

function serializeOrderedItem(row) {
  const priceEur = toEurAmount(row.price_value, row.price_currency);
  return {
    id: row.id,
    sessionId: row.session_id,
    url: row.url,
    listingId: row.listing_id,
    itemTitle: recordTitle(row),
    ordererName: row.user_name,
    priceValue: priceEur,
    priceCurrency: priceEur == null ? null : DISPLAY_CURRENCY,
    mediaCondition: row.media_condition,
    sleeveCondition: row.sleeve_condition,
    orderedAt: row.created_at,
    sellerUsername: row.seller_username,
    sessionStatus: row.session_status,
    orderNumber: row.order_number,
    orderTitle: formatOrderTitle(row.order_number ?? 1, row.seller_username),
  };
}

function mockUserOrderedItems(userId) {
  const items = [];
  for (const session of mockSessions) {
    for (const link of session.links ?? []) {
      if (link.user_id !== userId) continue;
      items.push(
        serializeOrderedItem({
          ...link,
          session_id: session.id,
          seller_username: session.seller_username,
          session_status: session.status ?? "open",
          order_number: session.order_number,
          created_at: link.created_at ?? session.created_at,
        })
      );
    }
  }
  return items;
}

router.get("/my-items", requireUser, (req, res) => {
  if (useMockSessions(req)) {
    return res.json({ items: mockUserOrderedItems(req.session.userId) });
  }
  const rows = listUserOrderedItems(req.session.userId);
  res.json({ items: rows.map(serializeOrderedItem) });
});

router.post("/", requireUser, async (req, res) => {
  const raw = req.body.sellerUsername ?? req.body.seller ?? "";

  try {
    const cleanSeller = await resolveSellerInput(raw, { mock: useMockAuth() });

    if (!cleanSeller) {
      return res.status(400).json({
        error:
          "Vnesi seller uporabniško ime, povezavo do seller profila (discogs.com/seller/…) ali listinga (discogs.com/sell/item/…).",
      });
    }

    if (useMockSessions(req)) {
      mockOrderSeq += 1;
      const session = {
        ...MOCK_SESSION,
        id: `mock-${Date.now()}`,
        order_number: mockOrderSeq,
        title: formatOrderTitle(mockOrderSeq, cleanSeller),
        seller_username: cleanSeller,
        status: "open",
        member_count: 1,
        link_count: 0,
        links: [],
        created_at: new Date().toISOString(),
      };
      mockSessions = [session, ...mockSessions];
      return res.status(201).json({ session });
    }

    const userId = ensureRequestUser(req);
    if (!userId) {
      return res.status(401).json({ error: "Prijavi se v aplikacijo." });
    }

    const sellerAvatarUrl = await fetchSellerAvatarUrl(cleanSeller);
    const session = createGroupSession({
      sellerUsername: cleanSeller,
      createdBy: userId,
      sellerAvatarUrl,
    });

    res.status(201).json({
      session: {
        ...session,
        member_count: session.members?.length ?? 1,
        link_count: session.links?.length ?? 0,
      },
    });
  } catch (err) {
    console.error(err);
    if (err.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return res.status(400).json({
        error: "Seja je potekla. Odjava in znova Prijava (demo).",
      });
    }
    res.status(500).json({ error: err.message ?? "Naročila ni bilo mogoče ustvariti." });
  }
});

router.patch("/:id/shipping", requireUser, (req, res) => {
  const sessionId = req.params.id;
  const existingSession =
    useMockAuth() && sessionId.startsWith("mock")
      ? mockSessions.find((s) => s.id === sessionId)
      : getGroupSession(sessionId);

  if (!existingSession) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (!isOrderAdmin(existingSession, req.session.userId)) {
    return res.status(403).json({ error: "Samo admin lahko spreminja poštnino." });
  }

  const raw = req.body?.shippingValue;
  const shippingValue =
    raw === null || raw === undefined || raw === ""
      ? null
      : Number(raw);
  if (shippingValue != null && Number.isNaN(shippingValue)) {
    return res.status(400).json({ error: "Neveljavna poštnina." });
  }
  if (shippingValue != null && shippingValue < 0) {
    return res.status(400).json({ error: "Poštnina ne sme biti negativna." });
  }

  const rawSplit = req.body?.shippingSplitCount;
  let shippingSplitCount = null;
  if (rawSplit != null && rawSplit !== "") {
    shippingSplitCount = Math.floor(Number(rawSplit));
    if (Number.isNaN(shippingSplitCount) || shippingSplitCount < 1) {
      return res.status(400).json({ error: "Število oseb mora biti vsaj 1." });
    }
  }

  const shippingEur =
    shippingValue == null
      ? null
      : toEurAmount(shippingValue, req.body?.shippingCurrency ?? DISPLAY_CURRENCY);

  if (useMockAuth() && req.params.id.startsWith("mock")) {
    const idx = mockSessions.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Session not found" });
    }
    mockSessions[idx] = {
      ...mockSessions[idx],
      shipping_value: shippingEur,
      shipping_currency: shippingEur == null ? null : DISPLAY_CURRENCY,
      shipping_split_count: shippingSplitCount,
    };
    return res.json({
      session: withOrderPermissions(mockSessionDetail(mockSessions[idx]), req.session.userId),
    });
  }

  try {
    const session = getGroupSession(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    const updated = updateSessionShipping(
      req.params.id,
      shippingEur,
      shippingEur == null ? null : DISPLAY_CURRENCY,
      shippingSplitCount
    );
    if (!updated) return res.status(404).json({ error: "Session not found" });
    res.json({ session: withOrderPermissions(updated, req.session.userId) });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Poštnine ni bilo mogoče shraniti." });
  }
});

router.post("/:id/close", requireUser, (req, res) => {
  if (useMockAuth() && req.params.id.startsWith("mock")) {
    const idx = mockSessions.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Session not found" });
    }
    mockSessions[idx] = { ...mockSessions[idx], status: "closed" };
    return res.json({
      session: withOrderPermissions(mockSessionDetail(mockSessions[idx]), req.session.userId),
    });
  }

  const session = closeGroupSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({ session: withOrderPermissions(session, req.session.userId) });
});

router.post("/:id/cancel", requireUser, (req, res) => {
  if (useMockAuth() && req.params.id.startsWith("mock")) {
    const idx = mockSessions.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Session not found" });
    }
    mockSessions.splice(idx, 1);
    return res.json({ ok: true });
  }

  if (!deleteGroupSession(req.params.id)) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json({ ok: true });
});

router.get("/:id", requireUser, async (req, res) => {
  if (useMockAuth() && req.params.id.startsWith("mock")) {
    const summary = mockSessions.find((s) => s.id === req.params.id);
    if (!summary) {
      return res.status(404).json({ error: "Session not found" });
    }
    const withAvatar = await ensureSellerAvatar(summary);
    return res.json({
      session: withOrderPermissions(mockSessionDetail(withAvatar), req.session.userId),
    });
  }

  let session = getGroupSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  joinSession(req.params.id, req.session.userId);
  session = await ensureSellerAvatar(session);
  res.json({ session: withOrderPermissions(session, req.session.userId) });
});

router.patch("/:id/members/:userId", requireUser, (req, res) => {
  const { id, userId: memberUserId } = req.params;
  const raw = req.body?.displayName;
  if (raw != null && typeof raw !== "string") {
    return res.status(400).json({ error: "Neveljavno ime." });
  }
  const displayName = raw?.trim() ?? "";
  if (displayName.length > 80) {
    return res.status(400).json({ error: "Ime je predolgo (največ 80 znakov)." });
  }

  if (useMockAuth() && id.startsWith("mock")) {
    const summary = mockSessions.find((s) => s.id === id);
    if (!summary) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (!isOrderAdmin(summary, req.session.userId)) {
      return res.status(403).json({ error: "Samo admin lahko spreminja imena." });
    }
    const detail = mockSessionDetail(summary);
    const members = detail.members.map((m) =>
      m.id === memberUserId ? { ...m, name: displayName || m.account_name || m.name } : m
    );
    const links = detail.links.map((l) =>
      l.user_id === memberUserId
        ? { ...l, user_name: displayName || members.find((m) => m.id === memberUserId)?.name }
        : l
    );
    return res.json({
      session: withOrderPermissions(
        { ...summary, members, links },
        req.session.userId
      ),
    });
  }

  const session = getGroupSession(id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status === "closed") {
    return res.status(400).json({ error: "Zaključenega naročila ni mogoče urejati." });
  }
  if (!isOrderAdmin(session, req.session.userId)) {
    return res.status(403).json({ error: "Samo admin lahko spreminja imena." });
  }
  if (!session.members?.some((m) => m.id === memberUserId)) {
    return res.status(404).json({ error: "Sodelujoč ni v tem naročilu." });
  }

  try {
    const updated = updateMemberDisplayName(id, memberUserId, displayName);
    if (!updated) {
      return res.status(404).json({ error: "Sodelujoč ni v tem naročilu." });
    }
    res.json({ session: withOrderPermissions(updated, req.session.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Imena ni bilo mogoče shraniti." });
  }
});

router.patch("/:id/links/:linkId", requireUser, (req, res) => {
  const { id, linkId } = req.params;
  const raw = req.body?.ordererDisplayName;
  if (raw != null && typeof raw !== "string") {
    return res.status(400).json({ error: "Neveljavno ime." });
  }
  const ordererDisplayName = raw?.trim() ?? "";
  if (ordererDisplayName.length > 80) {
    return res.status(400).json({ error: "Ime je predolgo (največ 80 znakov)." });
  }

  if (useMockAuth() && id.startsWith("mock")) {
    const summary = mockSessions.find((s) => s.id === id);
    if (!summary) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (!isOrderAdmin(summary, req.session.userId)) {
      return res.status(403).json({ error: "Samo admin lahko spreminja imena." });
    }
    const detail = mockSessionDetail(summary);
    const links = detail.links.map((l) =>
      l.id === linkId
        ? {
            ...l,
            orderer_display_name: ordererDisplayName || null,
            user_name: ordererDisplayName || l.member_name || l.user_name,
          }
        : l
    );
    return res.json({
      session: withOrderPermissions({ ...summary, links }, req.session.userId),
    });
  }

  const session = getGroupSession(id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status === "closed") {
    return res.status(400).json({ error: "Zaključenega naročila ni mogoče urejati." });
  }
  if (!isOrderAdmin(session, req.session.userId)) {
    return res.status(403).json({ error: "Samo admin lahko spreminja imena." });
  }
  if (!session.links?.some((l) => l.id === linkId)) {
    return res.status(404).json({ error: "Vnos ni v tem naročilu." });
  }

  try {
    const updated = updateLinkOrdererDisplayName(id, linkId, ordererDisplayName);
    if (!updated) {
      return res.status(404).json({ error: "Vnos ni v tem naročilu." });
    }
    res.json({ session: withOrderPermissions(updated, req.session.userId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Imena ni bilo mogoče shraniti." });
  }
});

async function createSessionLink(req, sessionId, trimmedUrl, note) {
  const meta = await resolveRecordFromUrl(trimmedUrl, note);

  if (useMockAuth() && sessionId.startsWith("mock")) {
    const user = findUserById(req.session.userId);
    const link = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: trimmedUrl,
      user_id: req.session.userId,
      user_name: user?.name ?? MOCK_USER.name,
      listing_id: meta.listingId,
      release_id: meta.releaseId,
      label: meta.label,
      artist: meta.artist,
      title: meta.title,
      item_description: meta.itemDescription,
      price_value: meta.priceValue,
      price_currency: meta.priceCurrency,
      media_condition: meta.mediaCondition,
      sleeve_condition: meta.sleeveCondition,
    };

    const idx = mockSessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) {
      throw new Error("Session not found");
    }

    const links = [...(mockSessions[idx].links ?? []), link];
    mockSessions[idx] = {
      ...mockSessions[idx],
      links,
      link_count: links.length,
    };

    return link;
  }

  const session = getGroupSession(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  return addSessionLink({
    sessionId,
    userId: req.session.userId,
    url: trimmedUrl,
    releaseId: meta.releaseId,
    listingId: meta.listingId,
    label: meta.label,
    note,
    artist: meta.artist,
    title: meta.title,
    priceValue: meta.priceValue,
    priceCurrency: meta.priceCurrency,
    mediaCondition: meta.mediaCondition,
    sleeveCondition: meta.sleeveCondition,
    itemDescription: meta.itemDescription,
  });
}

router.post("/:id/links/batch", requireUser, async (req, res) => {
  const note = req.body?.note?.trim() ?? "";
  const raw = req.body?.urls ?? req.body?.url ?? "";
  const text = Array.isArray(raw) ? raw.join("\n") : String(raw);
  const { valid: urls, invalid } = parseDiscogsUrlList(text);

  if (invalid.length && !urls.length) {
    return res.status(400).json({
      error: "Nobena povezava ni veljavna. Uporabi /sell/item/… ali /shop/item/…",
      invalid,
    });
  }

  if (!urls.length) {
    return res.status(400).json({ error: "Vnesi vsaj eno Discogs povezavo." });
  }

  const links = [];
  const errors = invalid.map((url) => ({
    url,
    error: "Neveljavna Discogs povezava",
  }));

  for (const trimmedUrl of urls) {
    try {
      const link = await createSessionLink(req, req.params.id, trimmedUrl, note);
      links.push(link);
    } catch (err) {
      errors.push({ url: trimmedUrl, error: err.message ?? "Napaka" });
    }
  }

  if (!links.length) {
    return res.status(400).json({
      error: errors[0]?.error ?? "Nobena povezava ni bila dodana.",
      errors,
    });
  }

  res.status(201).json({ links, errors, added: links.length, failed: errors.length });
});

router.post("/:id/links", requireUser, async (req, res) => {
  const { url, note } = req.body;
  if (!url?.trim()) {
    return res.status(400).json({ error: "URL is required" });
  }

  const trimmedUrl = url.trim();

  try {
    const link = await createSessionLink(req, req.params.id, trimmedUrl, note?.trim());
    res.status(201).json({ link });
  } catch (err) {
    console.error(err);
    const status = err.message === "Session not found" ? 404 : 400;
    res.status(status).json({ error: err.message ?? "Failed to add record" });
  }
});

router.get("/:id/my-matches", requireUser, async (req, res) => {
  const seller =
    req.query.seller?.trim().replace(/^@/, "") ||
    resolveSessionSeller(req.params.id);

  if (!seller) {
    return res.status(404).json({ error: "Session not found" });
  }

  try {
    const userId = ensureRequestUser(req);
    const user = resolveUserForMatches(userId);
    const result = await wantlistMatchesForUser(user, seller);

    res.json({
      seller,
      ...result,
      user: publicUser(user),
    });
  } catch (err) {
    console.error(err);
    const msg = err.message ?? "";
    const rateLimited = /429|too quickly/i.test(msg);
    const unauthorized = /401|authenticate/i.test(msg);
    res.status(rateLimited ? 429 : unauthorized ? 401 : 500).json({
      error: rateLimited
        ? "Discogs omejuje hitrost. Počakaj približno minuto in poskusi znova."
        : unauthorized
          ? "Discogs zavrnjen dostop. Preveri DISCOGS_CONSUMER_KEY/SECRET v .env in znova poveži Discogs v Nastavitvah."
          : msg || "Failed to load wantlist matches",
    });
  }
});

router.get("/:id/matches", requireUser, async (req, res) => {
  const seller =
    req.query.seller?.trim().replace(/^@/, "") ||
    resolveSessionSeller(req.params.id);

  if (!seller) {
    return res.status(400).json({ error: "Seller username required" });
  }

  try {
    const session = useMockAuth() && req.params.id.startsWith("mock")
      ? mockSessions.find((s) => s.id === req.params.id)
      : getGroupSession(req.params.id);

    const members = session?.members ?? [];
    const results = [];
    let inventoryCount = 0;

    for (const member of members) {
      const user = resolveUserForMatches(member.id);
      const { connected, matches, inventoryCount: inv } = await wantlistMatchesForUser(
        user,
        seller
      );
      if (inventoryCount === 0) inventoryCount = inv;

      results.push({
        user: publicUser(
          user ?? { id: member.id, name: member.name, email: member.email }
        ),
        connected,
        matches,
      });
    }

    res.json({
      seller,
      inventoryCount,
      memberMatches: results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Failed to load matches" });
  }
});

export default router;
