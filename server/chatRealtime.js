import cookie from "cookie";
import signature from "cookie-signature";
import { WebSocketServer } from "ws";
import { findUserById } from "./db.js";
import { sessionStore } from "./sessionStore.js";

/** @type {Map<string, Set<import('ws').WebSocket>>} */
const socketsByUser = new Map();

function parseSessionId(cookieHeader, secret) {
  if (!cookieHeader || !secret) return null;
  const parsed = cookie.parse(cookieHeader);
  const raw = parsed["connect.sid"];
  if (!raw) return null;
  if (raw.startsWith("s:")) {
    const unsigned = signature.unsign(raw.slice(2), secret);
    return unsigned || null;
  }
  return raw;
}

function getSession(sessionId) {
  return new Promise((resolve, reject) => {
    sessionStore.get(sessionId, (err, sess) => {
      if (err) reject(err);
      else resolve(sess || null);
    });
  });
}

function trackSocket(userId, ws) {
  let set = socketsByUser.get(userId);
  if (!set) {
    set = new Set();
    socketsByUser.set(userId, set);
  }
  set.add(ws);
  ws.userId = userId;
}

function untrackSocket(ws) {
  const userId = ws.userId;
  if (!userId) return;
  const set = socketsByUser.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) socketsByUser.delete(userId);
}

function sendJson(ws, payload) {
  if (ws.readyState !== 1) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    /* ignore closed sockets */
  }
}

export function broadcastChatEvent(recipientIds, payload) {
  const ids = Array.isArray(recipientIds) ? recipientIds : [];
  for (const userId of ids) {
    const set = socketsByUser.get(userId);
    if (!set) continue;
    for (const ws of set) {
      sendJson(ws, payload);
    }
  }
}

export function attachChatRealtime(httpServer, { sessionSecret }) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws/chat",
  });

  wss.on("connection", async (ws, req) => {
    let userId = null;
    try {
      const sessionId = parseSessionId(req.headers.cookie, sessionSecret);
      if (!sessionId) {
        ws.close(4401, "Unauthorized");
        return;
      }
      const sess = await getSession(sessionId);
      userId = sess?.userId ?? null;
      if (!userId || !findUserById(userId)) {
        ws.close(4401, "Unauthorized");
        return;
      }
    } catch {
      ws.close(4401, "Unauthorized");
      return;
    }

    trackSocket(userId, ws);
    sendJson(ws, { type: "chat.ready", userId });

    ws.on("message", (raw) => {
      let data;
      try {
        data = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (data?.type === "ping") {
        sendJson(ws, { type: "pong" });
      }
    });

    ws.on("close", () => untrackSocket(ws));
    ws.on("error", () => untrackSocket(ws));
  });

  return wss;
}
