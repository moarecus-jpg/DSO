import crypto from "crypto";

function secret() {
  return (
    process.env.DECKS_PRICE_SYNC_SECRET ||
    process.env.SESSION_SECRET ||
    "dev-decks-price-sync"
  );
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

/** Stateless signed token — works across Railway instances / restarts. */
export function createDecksPriceToken(sessionId, codes, ttlMs = 15 * 60 * 1000) {
  const payload = {
    sid: sessionId,
    codes: [...new Set((codes ?? []).map(String))],
    exp: Date.now() + ttlMs,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(
    crypto.createHmac("sha256", secret()).update(body).digest()
  );
  return `${body}.${sig}`;
}

export function verifyDecksPriceToken(token, sessionId) {
  const raw = String(token ?? "");
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const body = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = b64url(
    crypto.createHmac("sha256", secret()).update(body).digest()
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(fromB64url(body));
  } catch {
    return null;
  }
  if (!payload || payload.sid !== sessionId) return null;
  if (!payload.exp || payload.exp < Date.now()) return null;
  return {
    sessionId: payload.sid,
    codes: new Set((payload.codes ?? []).map(String)),
  };
}
