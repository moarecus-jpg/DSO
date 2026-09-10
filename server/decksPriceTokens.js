/** One-time tokens for Decks client-side EU price sync (bookmarklet → API). */

const tokens = new Map();
const TTL_MS = 15 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [key, row] of tokens) {
    if (row.expiresAt <= now) tokens.delete(key);
  }
}

export function createDecksPriceToken(sessionId, codes) {
  prune();
  const token = `dps_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  tokens.set(token, {
    sessionId,
    codes: new Set((codes ?? []).map(String)),
    expiresAt: Date.now() + TTL_MS,
  });
  return token;
}

export function consumeDecksPriceToken(token, sessionId) {
  prune();
  const row = tokens.get(token);
  if (!row) return null;
  if (row.sessionId !== sessionId) return null;
  if (row.expiresAt <= Date.now()) {
    tokens.delete(token);
    return null;
  }
  tokens.delete(token);
  return row;
}
