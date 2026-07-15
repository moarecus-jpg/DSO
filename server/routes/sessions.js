import { Router } from "express";
import {
  addSessionLink,
  addSessionNote,
  closeGroupSession,
  deleteGroupSession,
  findDuplicateSessionLink,
  updateSessionShipping,
  updateSessionTargetDate,
  updateSessionSellerAvatar,
  updateMemberDisplayName,
  updateLinkOrdererDisplayName,
  createGroupSession,
  findUserById,
  getGroupSession,
  upsertGoogleUser,
  isSessionMember,
  joinSession,
  listAllGroupSessions,
  listGroupSessions,
  listUserOrderedItems,
  publicUser,
  removeSessionLink,
} from "../db.js";
import {
  fetchInventoryForReleaseIds,
  getDiscogsUserProfile,
  getUserWantlist,
} from "../discogs/client.js";
import { sellerMywantsUrl } from "../../shared/discogsUrls.js";
import { matchWantlistToInventory, parseDiscogsUrl } from "../discogs/match.js";
import { MOCK_INVENTORY, MOCK_SESSION, MOCK_USER, MOCK_USER_2, MOCK_WANTLIST } from "../mock.js";
import { formatOrderTitle } from "../../shared/orderTitle.js";
import { resolveRecordFromUrl, mockResolveRecordFromUrl } from "../discogs/recordMeta.js";
import { parseDiscogsUrlList } from "../../shared/parseRecordUrl.js";
import { DISPLAY_CURRENCY, toEurAmount } from "../../shared/currency.js";
import { enrichSessionOrder, recordTitle } from "../../shared/orderTotals.js";
import { sessionForViewer } from "../../shared/sessionPrivacy.js";
import { resolveSellerInput } from "../discogs/resolveSeller.js";
import { googleConfigured } from "../auth/google.js";
import { discogsAppConfigured } from "../discogs/auth.js";
import { discogsOAuthConfigured } from "../discogs/oauth.js";
import { canRemoveSessionLink, isOrderAdmin, isOrderCreator } from "../auth/orderAdmin.js";
import { appBaseUrl } from "../appUrl.js";
import {
  notifyNewOrderOpened,
  notifyOrderClosed,
  notifyOrderNotePosted,
} from "../email/notifications.js";

const router = Router();
let mockOrderSeq = 1;
let mockSessions = [{ ...MOCK_SESSION }];

function mockMembersFromLinks(links = []) {
  const catalog = {
    [MOCK_USER.id]: {
      id: MOCK_USER.id,
      name: MOCK_USER.name,
      account_name: MOCK_USER.name,
      email: MOCK_USER.email,
      discogs_username: MOCK_USER.discogs_username,
    },
    [MOCK_USER_2.id]: {
      id: MOCK_USER_2.id,
      name: MOCK_USER_2.name,
      account_name: MOCK_USER_2.name,
      email: MOCK_USER_2.email,
      discogs_username: MOCK_USER_2.discogs_username,
    },
  };

  const seen = new Set();
  const members = [];
  for (const link of links) {
    const userId = link.user_id;
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    const known = catalog[userId];
    if (known) {
      members.push(known);
      continue;
    }
    const user = findUserById(userId);
    if (user) {
      members.push({
        id: user.id,
        name: user.name,
        account_name: user.name,
        email: user.email,
        discogs_username: user.discogs_username,
      });
    }
  }
  return members;
}

function mockSessionDetail(summary) {
  const links = summary.links ?? [];
  return enrichSessionOrder({
    ...summary,
    notes: summary.notes ?? [],
    members: mockMembersFromLinks(links),
    links,
    member_count: new Set(links.map((link) => link.user_id).filter(Boolean)).size,
    link_count: links.length,
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
  const isCreator = isOrderCreator(session, userId);
  const viewed = sessionForViewer(session, userId, isAdmin);
  return {
    ...viewed,
    canManageMembers: isAdmin,
    canManageShipping: isCreator || isAdmin,
    canManageOrder: isCreator,
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

    notifyNewOrderOpened({
      baseUrl: appBaseUrl(req),
      session,
      excludeUserId: userId,
    }).catch((err) => console.error("New order notification:", err));

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
  if (!isOrderCreator(existingSession, req.session.userId) && !isOrderAdmin(existingSession, req.session.userId)) {
    return res.status(403).json({ error: "Samo odpravitelj naročila lahko spreminja poštnino." });
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

router.patch("/:id/target-date", requireUser, (req, res) => {
  const sessionId = req.params.id;
  const userId = req.session.userId;
  const existingSession =
    useMockAuth() && sessionId.startsWith("mock")
      ? mockSessions.find((s) => s.id === sessionId)
      : getGroupSession(sessionId);

  if (!existingSession) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (!isOrderCreator(existingSession, userId)) {
    return res.status(403).json({
      error: "Samo odpravitelj naročila lahko nastavi ciljni datum.",
    });
  }
  if (existingSession.status === "closed") {
    return res.status(400).json({ error: "Zaključenega naročila ni mogoče urejati." });
  }

  let targetDate;
  try {
    targetDate = parseTargetDateInput(req.body?.targetDate);
  } catch (err) {
    return res.status(400).json({ error: err.message ?? "Neveljaven ciljni datum." });
  }

  if (useMockAuth() && sessionId.startsWith("mock")) {
    const idx = mockSessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) {
      return res.status(404).json({ error: "Session not found" });
    }
    mockSessions[idx] = { ...mockSessions[idx], target_date: targetDate };
    return res.json({
      session: withOrderPermissions(mockSessionDetail(mockSessions[idx]), userId),
    });
  }

  try {
    const updated = updateSessionTargetDate(sessionId, targetDate);
    if (!updated) return res.status(404).json({ error: "Session not found" });
    res.json({ session: withOrderPermissions(updated, userId) });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Ciljnega datuma ni bilo mogoče shraniti." });
  }
});

function parseTargetDateInput(value) {
  if (value == null || value === "") return null;
  const trimmed = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Neveljaven ciljni datum.");
  }
  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Neveljaven ciljni datum.");
  }
  return trimmed;
}

router.post("/:id/close", requireUser, (req, res) => {
  const userId = req.session.userId;

  if (useMockAuth() && req.params.id.startsWith("mock")) {
    const idx = mockSessions.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (!isOrderCreator(mockSessions[idx], userId)) {
      return res.status(403).json({
        error: "Samo odpravitelj naročila lahko zaključi naročilo.",
      });
    }
    mockSessions[idx] = { ...mockSessions[idx], status: "closed" };
    return res.json({
      session: withOrderPermissions(mockSessionDetail(mockSessions[idx]), userId),
    });
  }

  const existing = getGroupSession(req.params.id);
  if (!existing) return res.status(404).json({ error: "Session not found" });
  if (!isOrderCreator(existing, userId)) {
    return res.status(403).json({
      error: "Samo odpravitelj naročila lahko zaključi naročilo.",
    });
  }

  const session = closeGroupSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  notifyOrderClosed({
    baseUrl: appBaseUrl(req),
    session,
    excludeUserId: userId,
  }).catch((err) => console.error("Order closed notification:", err));

  res.json({ session: withOrderPermissions(session, userId) });
});

router.post("/:id/cancel", requireUser, (req, res) => {
  const userId = req.session.userId;

  if (useMockAuth() && req.params.id.startsWith("mock")) {
    const idx = mockSessions.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (!isOrderCreator(mockSessions[idx], userId)) {
      return res.status(403).json({
        error: "Samo odpravitelj naročila lahko prekliče naročilo.",
      });
    }
    mockSessions.splice(idx, 1);
    return res.json({ ok: true });
  }

  const existing = getGroupSession(req.params.id);
  if (!existing) return res.status(404).json({ error: "Session not found" });
  if (!isOrderCreator(existing, userId)) {
    return res.status(403).json({
      error: "Samo odpravitelj naročila lahko prekliče naročilo.",
    });
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
  session = await ensureSellerAvatar(getGroupSession(req.params.id));
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

async function createSessionLink(req, sessionId, trimmedUrl, note, rawForUserId) {
  const sellerUsername = resolveSessionSeller(sessionId);
  const useMockDiscogs =
    useMockAuth() &&
    sessionId.startsWith("mock") &&
    (!discogsOAuthConfigured() || findUserById(req.session.userId)?.discogs_token === "mock");

  const meta = useMockDiscogs
    ? mockResolveRecordFromUrl(trimmedUrl, note, { sellerUsername })
    : await resolveRecordFromUrl(trimmedUrl, note, { sellerUsername });

  if (useMockAuth() && sessionId.startsWith("mock")) {
    const idx = mockSessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) {
      throw new Error("Session not found");
    }

    const targetUserId = resolveLinkTargetUserId(req.session.userId, rawForUserId);
    const targetUser = findUserById(targetUserId);

    const link = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: trimmedUrl,
      user_id: targetUserId,
      user_name: targetUser?.name ?? MOCK_USER.name,
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

    const existing = (mockSessions[idx].links ?? []).find(
      (item) =>
        item.user_id === targetUserId &&
        ((meta.listingId != null && item.listing_id === meta.listingId) ||
          item.url?.trim().toLowerCase() === trimmedUrl.toLowerCase())
    );
    if (existing) {
      throw new Error("Ta listing je za tega udeleženca že v tem naročilu.");
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

  const targetUserId = resolveLinkTargetUserId(req.session.userId, rawForUserId);

  const duplicate = findDuplicateSessionLink(sessionId, targetUserId, {
    listingId: meta.listingId,
    url: trimmedUrl,
  });
  if (duplicate) {
    throw new Error("Ta listing je za tega udeleženca že v tem naročilu.");
  }

  return addSessionLink({
    sessionId,
    userId: targetUserId,
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

function resolveLinkTargetUserId(requestUserId, rawForUserId) {
  const forUserId =
    typeof rawForUserId === "string" && rawForUserId.trim()
      ? rawForUserId.trim()
      : requestUserId;

  if (findUserById(forUserId)) {
    return forUserId;
  }

  if (
    useMockAuth() &&
    (forUserId === MOCK_USER.id || forUserId === MOCK_USER_2.id)
  ) {
    return forUserId;
  }

  throw new Error("Uporabnik ne obstaja.");
}

router.post("/:id/links/batch", requireUser, async (req, res) => {
  const note = req.body?.note?.trim() ?? "";
  const forUserId = req.body?.forUserId ?? req.body?.userId;
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
      const link = await createSessionLink(req, req.params.id, trimmedUrl, note, forUserId);
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
  const { url, note, forUserId, userId } = req.body;
  if (!url?.trim()) {
    return res.status(400).json({ error: "URL is required" });
  }

  const trimmedUrl = url.trim();

  try {
    const link = await createSessionLink(
      req,
      req.params.id,
      trimmedUrl,
      note?.trim(),
      forUserId ?? userId
    );
    res.status(201).json({ link });
  } catch (err) {
    console.error(err);
    const status = err.message === "Session not found" ? 404 : 400;
    res.status(status).json({ error: err.message ?? "Failed to add record" });
  }
});

router.delete("/:id/links/:linkId", requireUser, (req, res) => {
  const { id, linkId } = req.params;
  const userId = req.session.userId;

  if (useMockAuth() && id.startsWith("mock")) {
    const idx = mockSessions.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Session not found" });
    }

    const summary = mockSessions[idx];
    if ((summary.status ?? "open") === "closed") {
      return res.status(400).json({ error: "Zaključenega naročila ni mogoče urejati." });
    }

    const link = (summary.links ?? []).find((item) => item.id === linkId);
    if (!link) {
      return res.status(404).json({ error: "Vnos ni v tem naročilu." });
    }
    if (!canRemoveSessionLink(summary, link, userId)) {
      return res.status(403).json({ error: "Lahko odstraniš samo svoje iteme." });
    }

    const links = (summary.links ?? []).filter((item) => item.id !== linkId);
    mockSessions[idx] = {
      ...summary,
      links,
      link_count: links.length,
      member_count: new Set(links.map((item) => item.user_id).filter(Boolean)).size,
    };

    return res.json({
      session: withOrderPermissions(
        mockSessionDetail(mockSessions[idx]),
        userId
      ),
    });
  }

  const session = getGroupSession(id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status === "closed") {
    return res.status(400).json({ error: "Zaključenega naročila ni mogoče urejati." });
  }

  const link = session.links?.find((item) => item.id === linkId);
  if (!link) {
    return res.status(404).json({ error: "Vnos ni v tem naročilu." });
  }
  if (!canRemoveSessionLink(session, link, userId)) {
    return res.status(403).json({ error: "Lahko odstraniš samo svoje iteme." });
  }

  const updated = removeSessionLink(id, linkId);
  if (!updated) {
    return res.status(404).json({ error: "Vnos ni v tem naročilu." });
  }

  res.json({ session: withOrderPermissions(updated, userId) });
});

router.post("/:id/notes", requireUser, (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;
  const raw = req.body?.body;
  if (raw == null || typeof raw !== "string") {
    return res.status(400).json({ error: "Komentar je obvezen." });
  }
  const body = raw.trim();
  if (!body) {
    return res.status(400).json({ error: "Komentar je obvezen." });
  }
  if (body.length > 2000) {
    return res.status(400).json({ error: "Komentar je predolg (največ 2000 znakov)." });
  }

  if (useMockAuth() && id.startsWith("mock")) {
    const idx = mockSessions.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Session not found" });
    }
    const summary = mockSessions[idx];
    if ((summary.status ?? "open") === "closed") {
      return res.status(400).json({ error: "Zaključenega naročila ni mogoče urejati." });
    }
    const user = findUserById(userId);
    const note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      session_id: id,
      user_id: userId,
      user_name: user?.name ?? MOCK_USER.name,
      body,
      created_at: new Date().toISOString(),
    };
    const notes = [...(summary.notes ?? []), note];
    mockSessions[idx] = { ...summary, notes };
    return res.status(201).json({
      note,
      session: withOrderPermissions(mockSessionDetail(mockSessions[idx]), userId),
    });
  }

  const session = getGroupSession(id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.status === "closed") {
    return res.status(400).json({ error: "Zaključenega naročila ni mogoče urejati." });
  }
  if (!isSessionMember(id, userId)) {
    return res.status(403).json({ error: "Nisi udeleženec tega naročila." });
  }

  try {
    const note = addSessionNote(id, userId, body);
    const updated = getGroupSession(id);
    const author = findUserById(userId);

    notifyOrderNotePosted({
      baseUrl: appBaseUrl(req),
      session: updated,
      note,
      authorName: author?.name ?? note.user_name ?? "Someone",
      excludeUserId: userId,
    }).catch((err) => console.error("Order note notification:", err));

    res.status(201).json({
      note,
      session: withOrderPermissions(updated, userId),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Komentarja ni bilo mogoče shraniti." });
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
