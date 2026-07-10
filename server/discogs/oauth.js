import OAuth from "oauth";
import dotenv from "dotenv";

dotenv.config();

const REQUEST_URL = "https://api.discogs.com/oauth/request_token";
const ACCESS_URL = "https://api.discogs.com/oauth/access_token";
const AUTHORIZE_URL = "https://www.discogs.com/oauth/authorize";

function discogsUserAgent(contactUrl) {
  const base = (contactUrl || process.env.CLIENT_URL || "http://localhost:5173")
    .trim()
    .replace(/\/$/, "");
  return `DSO/2.0 +${base}`;
}

export function discogsOAuthConfigured() {
  return Boolean(
    process.env.DISCOGS_CONSUMER_KEY && process.env.DISCOGS_CONSUMER_SECRET
  );
}

/** @deprecated Use appUrl.discogsCallbackUrl(req) */
export function discogsCallbackUrl() {
  const base = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
  return `${base}/auth/discogs/callback`;
}

function getOAuth(contactUrl) {
  const key = process.env.DISCOGS_CONSUMER_KEY?.trim();
  const secret = process.env.DISCOGS_CONSUMER_SECRET?.trim();
  if (!key || !secret) {
    throw new Error("DISCOGS_CONSUMER_KEY in DISCOGS_CONSUMER_SECRET nista nastavljena.");
  }

  return new OAuth.OAuth(
    REQUEST_URL,
    ACCESS_URL,
    key,
    secret,
    "1.0",
    null,
    "HMAC-SHA1",
    null,
    {
      "User-Agent": discogsUserAgent(contactUrl),
      Accept: "*/*",
      Connection: "close",
    }
  );
}

function parseOAuthError(err) {
  if (!err) return err;
  const msg = err.data ?? err.message ?? String(err);
  return new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
}

export function getDiscogsAuthUrl(callbackUrl, contactUrl) {
  const oauth = getOAuth(contactUrl);

  return new Promise((resolve, reject) => {
    oauth.getOAuthRequestToken(
      { oauth_callback: callbackUrl },
      (err, token, tokenSecret) => {
        if (err) return reject(parseOAuthError(err));
        resolve({
          url: `${AUTHORIZE_URL}?oauth_token=${token}`,
          requestToken: token,
          requestTokenSecret: tokenSecret,
        });
      }
    );
  });
}

export function getDiscogsAccessToken(
  requestToken,
  requestTokenSecret,
  verifier,
  contactUrl
) {
  const oauth = getOAuth(contactUrl);

  return new Promise((resolve, reject) => {
    oauth.getOAuthAccessToken(
      requestToken,
      requestTokenSecret,
      verifier,
      (err, token, tokenSecret) => {
        if (err) return reject(parseOAuthError(err));
        resolve({ token, tokenSecret });
      }
    );
  });
}

/** Signed GET for OAuth-authenticated Discogs API resources. */
export function oauthGetJson(url, token, tokenSecret, contactUrl) {
  const oauth = getOAuth(contactUrl);

  return new Promise((resolve, reject) => {
    oauth.get(url, token, tokenSecret, (err, body) => {
      if (err) return reject(parseOAuthError(err));
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Neveljaven JSON od Discogs."));
      }
    });
  });
}
