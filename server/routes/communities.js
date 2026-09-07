import { Router } from "express";
import {
  createCommunity,
  findUserById,
  getActiveCommunityForUser,
  getCommunityForMember,
  getCommunityPreviewByInviteCode,
  joinCommunityByInviteCode,
  listCommunityDirectory,
  listPendingJoinRequestsForCommunity,
  listPendingJoinRequestsForUserCommunities,
  listUserCommunities,
  publicCommunity,
  publicUserWithCommunities,
  regenerateCommunityInviteCode,
  requestCommunityJoin,
  resolveCommunityJoinRequest,
  setActiveCommunity,
  upsertGoogleUser,
  ensureMembershipInSloveniaCommunity,
  setCommunityListed,
} from "../db.js";
import { googleConfigured } from "../auth/google.js";
import { MOCK_USER } from "../mock.js";
import { isAppAdmin } from "../auth/appAdmin.js";

const router = Router();

function useMockAuth() {
  return process.env.USE_MOCK_AUTH === "true" || !googleConfigured();
}

function ensureRequestUser(req) {
  if (!req.session.userId) return null;
  if (findUserById(req.session.userId)) return req.session.userId;
  if (!useMockAuth()) return null;
  const user = upsertGoogleUser({
    googleId: MOCK_USER.google_id,
    email: MOCK_USER.email,
    name: MOCK_USER.name,
    picture: null,
  });
  req.session.userId = user.id;
  ensureMembershipInSloveniaCommunity(user.id);
  return user.id;
}

function requireUser(req, res, next) {
  if (!ensureRequestUser(req)) {
    return res.status(401).json({ error: "Sign in to continue." });
  }
  next();
}

function withAdminFlag(user) {
  const publicProfile = publicUserWithCommunities(user);
  if (!publicProfile) return null;
  return { ...publicProfile, isAdmin: isAppAdmin(user.id) };
}

router.get("/", requireUser, (req, res) => {
  const communities = listUserCommunities(req.session.userId).map((row) =>
    publicCommunity(row, { includeInvite: true })
  );
  const active = getActiveCommunityForUser(req.session.userId);
  res.json({
    communities,
    activeCommunity: publicCommunity(active, { includeInvite: true }),
  });
});

router.get("/directory", requireUser, (req, res) => {
  const communities = listCommunityDirectory(req.session.userId).map((row) =>
    publicCommunity(row)
  );
  res.json({ communities });
});

router.get("/join-requests", requireUser, (req, res) => {
  try {
    const requests = listPendingJoinRequestsForUserCommunities(req.session.userId);
    res.json({ requests });
  } catch (err) {
    res.status(403).json({ error: err.message ?? "Could not load join requests." });
  }
});

router.get("/preview/:code", (req, res) => {
  const preview = getCommunityPreviewByInviteCode(req.params.code);
  if (!preview) {
    return res.status(404).json({ error: "Invalid invite code." });
  }
  res.json({ community: preview });
});

router.post("/join", requireUser, (req, res) => {
  const code = req.body?.code ?? req.body?.inviteCode ?? "";
  try {
    const community = joinCommunityByInviteCode(req.session.userId, code);
    const user = findUserById(req.session.userId);
    res.json({
      community: publicCommunity(community, { includeInvite: true }),
      user: withAdminFlag(user),
    });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Could not join community." });
  }
});

router.post("/:id/request", requireUser, (req, res) => {
  try {
    const request = requestCommunityJoin(req.params.id, req.session.userId);
    res.status(201).json({
      request: {
        id: request.id,
        communityId: request.community_id,
        status: request.status,
        createdAt: request.created_at,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Could not request to join." });
  }
});

router.get("/:id/join-requests", requireUser, (req, res) => {
  try {
    const requests = listPendingJoinRequestsForCommunity(
      req.params.id,
      req.session.userId
    );
    res.json({ requests });
  } catch (err) {
    res.status(403).json({ error: err.message ?? "Could not load join requests." });
  }
});

router.post("/join-requests/:requestId/resolve", requireUser, (req, res) => {
  const decision = req.body?.decision;
  try {
    const request = resolveCommunityJoinRequest(
      req.params.requestId,
      req.session.userId,
      decision
    );
    res.json({
      request: {
        id: request.id,
        communityId: request.community_id,
        userId: request.user_id,
        status: request.status,
      },
    });
  } catch (err) {
    const status = String(err.message || "").includes("Only community") ? 403 : 400;
    res.status(status).json({ error: err.message ?? "Could not resolve request." });
  }
});

router.post("/", requireUser, (req, res) => {
  const { name, slug, city, country, currency, listed } = req.body ?? {};
  try {
    const community = createCommunity({
      name,
      slug,
      createdBy: req.session.userId,
      city,
      country,
      currency: currency || "EUR",
      listed: Boolean(listed),
    });
    const user = findUserById(req.session.userId);
    res.status(201).json({
      community: publicCommunity(community, { includeInvite: true }),
      user: withAdminFlag(user),
    });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Could not create community." });
  }
});

router.post("/:id/listed", requireUser, (req, res) => {
  const listed = Boolean(req.body?.listed);
  try {
    const community = setCommunityListed(req.params.id, req.session.userId, listed);
    res.json({
      community: publicCommunity(community, { includeInvite: true }),
    });
  } catch (err) {
    const status = String(err.message || "").includes("Only community") ? 403 : 400;
    res.status(status).json({
      error: err.message ?? "Could not update directory listing.",
    });
  }
});

router.post("/:id/active", requireUser, (req, res) => {
  try {
    const community = setActiveCommunity(req.session.userId, req.params.id);
    const user = findUserById(req.session.userId);
    res.json({
      community: publicCommunity(community, { includeInvite: true }),
      user: withAdminFlag(user),
    });
  } catch (err) {
    res.status(400).json({ error: err.message ?? "Could not switch community." });
  }
});

router.get("/:id", requireUser, (req, res) => {
  const community = getCommunityForMember(req.params.id, req.session.userId);
  if (!community) {
    return res.status(404).json({ error: "Community not found." });
  }
  res.json({
    community: publicCommunity(community, { includeInvite: true }),
  });
});

router.post("/:id/regenerate-invite", requireUser, (req, res) => {
  try {
    const updated = regenerateCommunityInviteCode(req.params.id, req.session.userId);
    const community = getCommunityForMember(updated.id, req.session.userId);
    res.json({
      community: publicCommunity(community, { includeInvite: true }),
    });
  } catch (err) {
    res.status(403).json({ error: err.message ?? "Could not regenerate invite." });
  }
});

export default router;
