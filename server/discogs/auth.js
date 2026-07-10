import dotenv from "dotenv";

dotenv.config();

export const DISCOGS_UA = "DSO/2.0 +http://localhost:5173";

export function discogsAppConfigured() {
  return Boolean(
    process.env.DISCOGS_CONSUMER_KEY && process.env.DISCOGS_CONSUMER_SECRET
  );
}

export function hasUserOAuth(token, tokenSecret) {
  return Boolean(token && tokenSecret && token !== "mock");
}

/** Application auth only — Discogs key+secret (for unsigned fetch calls). */
export function buildAppDiscogsHeaders() {
  const headers = {
    "User-Agent": DISCOGS_UA,
    Accept: "application/json",
  };

  const key = process.env.DISCOGS_CONSUMER_KEY;
  const secret = process.env.DISCOGS_CONSUMER_SECRET;
  if (key && secret) {
    headers.Authorization = `Discogs key=${key}, secret=${secret}`;
  }

  return headers;
}

export function assertDiscogsAuth(headers) {
  if (headers.Authorization) return;
  throw new Error(
    "Discogs API zahteva avtentikacijo. V .env nastavi DISCOGS_CONSUMER_KEY in DISCOGS_CONSUMER_SECRET, nato v Nastavitvah poveži svoj Discogs račun."
  );
}
