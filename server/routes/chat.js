import express, { Router } from "express";
import {
  CHAT_ATTACHMENT_MIME_TYPES,
  MAX_CHAT_ATTACHMENT_BYTES,
  addChatAttachment,
  clearChatRoom,
  countChatUnread,
  deleteChatMessage,
  deleteChatRoom,
  findUserById,
  getActiveCommunityForUser,
  getChatAttachmentForUser,
  getChatRoomForUser,
  getCommunityMembership,
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

const chatAttachmentParser = express.raw({
  type: CHAT_ATTACHMENT_MIME_TYPES,
  limit: MAX_CHAT_ATTACHMENT_BYTES,
});

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

function broadcastMessage(roomId, message) {
  broadcastChatEvent(listChatRoomRecipientIds(roomId), {
    type: "chat.message",
    roomId,
    message,
  });
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

router.post("/rooms/:roomId/messages", requireUser, (req, res) => {
  try {
    const hasAttachments = Boolean(req.body?.hasAttachments);
    const message = postChatMessage(
      req.params.roomId,
      req.session.userId,
      req.body?.body,
      { allowEmpty: hasAttachments }
    );
    broadcastMessage(req.params.roomId, message);
    res.status(201).json({ message });
  } catch (err) {
    const notFound = err.message === "Chat not found.";
    res.status(notFound ? 404 : 400).json({ error: err.message });
  }
});

router.post(
  "/rooms/:roomId/messages/:messageId/attachments",
  requireUser,
  chatAttachmentParser,
  (req, res) => {
    try {
      const mimeType = String(req.headers["content-type"] || "");
      if (!CHAT_ATTACHMENT_MIME_TYPES.includes(mimeType)) {
        return res.status(400).json({ error: "Unsupported file type." });
      }
      const fileName = decodeURIComponent(
        String(req.headers["x-file-name"] || "file")
      );
      const message = addChatAttachment(
        req.params.messageId,
        req.session.userId,
        {
          fileName,
          mimeType,
          buffer: req.body,
        }
      );
      if (message.roomId !== req.params.roomId) {
        return res.status(404).json({ error: "Message not found." });
      }
      broadcastMessage(req.params.roomId, message);
      res.status(201).json({ message });
    } catch (err) {
      const status =
        err.message === "Chat not found." || err.message === "Message not found."
          ? 404
          : 400;
      res.status(status).json({ error: err.message });
    }
  }
);

router.get("/attachments/:attachmentId", requireUser, (req, res) => {
  const row = getChatAttachmentForUser(
    req.params.attachmentId,
    req.session.userId
  );
  if (!row) {
    return res.status(404).json({ error: "Attachment not found." });
  }
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(row.file_name)}"`
  );
  res.type(row.mime_type);
  return res.send(row.data);
});

router.post("/rooms/:roomId/read", requireUser, (req, res) => {
  try {
    markChatRoomRead(req.params.roomId, req.session.userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/rooms/:roomId/clear", requireUser, (req, res) => {
  try {
    const room = clearChatRoom(req.params.roomId, req.session.userId);
    broadcastChatEvent(listChatRoomRecipientIds(req.params.roomId), {
      type: "chat.cleared",
      roomId: req.params.roomId,
      room,
    });
    res.json({ room });
  } catch (err) {
    const status =
      err.message === "Chat not found."
        ? 404
        : err.message.includes("owners or admins")
          ? 403
          : 400;
    res.status(status).json({ error: err.message });
  }
});

router.delete("/rooms/:roomId", requireUser, (req, res) => {
  try {
    const result = deleteChatRoom(req.params.roomId, req.session.userId);
    broadcastChatEvent(result.recipients, {
      type: "chat.deleted",
      roomId: result.roomId,
    });
    res.json({ ok: true, roomId: result.roomId });
  } catch (err) {
    const status =
      err.message === "Chat not found."
        ? 404
        : err.message.includes("Only direct messages")
          ? 400
          : 400;
    res.status(status).json({ error: err.message });
  }
});

router.delete("/messages/:messageId", requireUser, (req, res) => {
  try {
    const result = deleteChatMessage(req.params.messageId, req.session.userId);
    broadcastChatEvent(result.recipients, {
      type: "chat.messageDeleted",
      roomId: result.roomId,
      messageId: result.messageId,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    const status =
      err.message === "Chat not found." || err.message === "Message not found."
        ? 404
        : err.message.includes("only delete")
          ? 403
          : 400;
    res.status(status).json({ error: err.message });
  }
});

router.get("/rooms/:roomId/capabilities", requireUser, (req, res) => {
  try {
    const room = getChatRoomForUser(req.params.roomId, req.session.userId);
    if (!room) {
      return res.status(404).json({ error: "Chat not found." });
    }
    const membership = getCommunityMembership(
      room.communityId,
      req.session.userId
    );
    const isModerator =
      membership?.role === "owner" || membership?.role === "admin";
    res.json({
      canClear:
        room.kind === "dm" || (room.kind === "community" && isModerator),
      canDelete: room.kind === "dm",
      canModerateMessages: room.kind === "community" && isModerator,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
