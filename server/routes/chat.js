import { Router } from "express";
import {
  countChatUnread,
  findUserById,
  getActiveCommunityForUser,
  getChatRoomForUser,
  getOrCreateDmRoom,
  listChatMessages,
  listChatRoomRecipientIds,
  listChatRoomsForUser,
  listCommunityMembers,
  markChatRoomRead,
  postChatMessage,
  upsertGoogleUser,
  ensureMembershipInSloveniaCommunity,
} from "../db.js";
import { googleConfigured } from "../auth/google.js";
import { MOCK_USER } from "../mock.js";
import { broadcastChatEvent } from "../chatRealtime.js";

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

function activeCommunityId(req) {
  return getActiveCommunityForUser(req.session.userId)?.id ?? null;
}

function requireCommunity(req, res) {
  const communityId = activeCommunityId(req);
  if (!communityId) {
    res.status(400).json({ error: "Join a community first." });
    return null;
  }
  return communityId;
}

router.get("/rooms", requireUser, (req, res) => {
  const communityId = requireCommunity(req, res);
  if (!communityId) return;
  try {
    const rooms = listChatRoomsForUser(req.session.userId, communityId);
    res.json({ rooms });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/unread-count", requireUser, (req, res) => {
  const communityId = requireCommunity(req, res);
  if (!communityId) return;
  res.json({
    unreadCount: countChatUnread(req.session.userId, communityId),
  });
});

router.get("/members", requireUser, (req, res) => {
  const communityId = requireCommunity(req, res);
  if (!communityId) return;
  try {
    const members = listCommunityMembers(communityId, req.session.userId)
      .filter((m) => m.id !== req.session.userId)
      .map((m) => ({
        id: m.id,
        name: m.name ?? null,
        username: m.username ?? null,
        picture: m.picture ?? null,
        discogsUsername: m.discogs_username ?? null,
        discogsAvatarUrl: m.discogs_avatar_url ?? null,
        role: m.role,
      }));
    res.json({ members });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/rooms/:roomId/messages", requireUser, (req, res) => {
  try {
    const message = postChatMessage(
      req.params.roomId,
      req.session.userId,
      req.body?.body
    );
    const recipients = listChatRoomRecipientIds(req.params.roomId);
    broadcastChatEvent(recipients, {
      type: "chat.message",
      roomId: req.params.roomId,
      message,
    });
    res.status(201).json({ message });
  } catch (err) {
    const notFound = err.message === "Chat not found.";
    res.status(notFound ? 404 : 400).json({ error: err.message });
  }
});

router.post("/dm", requireUser, (req, res) => {
  const communityId = requireCommunity(req, res);
  if (!communityId) return;
  const otherUserId = String(req.body?.userId ?? "").trim();
  if (!otherUserId) {
    return res.status(400).json({ error: "Pick a member to message." });
  }
  try {
    const room = getOrCreateDmRoom(
      communityId,
      req.session.userId,
      otherUserId
    );
    broadcastChatEvent([req.session.userId, otherUserId], {
      type: "chat.room",
      room,
    });
    res.json({ room });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/rooms/:roomId", requireUser, (req, res) => {
  try {
    const room = getChatRoomForUser(req.params.roomId, req.session.userId);
    if (!room) {
      return res.status(404).json({ error: "Chat not found." });
    }
    const after = req.query.after ? String(req.query.after) : null;
    const messages = listChatMessages(req.params.roomId, req.session.userId, {
      after,
      limit: req.query.limit,
    });
    markChatRoomRead(req.params.roomId, req.session.userId);
    res.json({
      room: { ...room, unreadCount: 0 },
      messages,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/rooms/:roomId/read", requireUser, (req, res) => {
  try {
    markChatRoomRead(req.params.roomId, req.session.userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
