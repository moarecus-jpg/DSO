/** Public app URL for redirects, OAuth callbacks, and email links. */

function firstForwarded(value) {
  return String(value || "")
    .split(",")[0]
    .trim();
}

function isLocalHost(host) {
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host);
}

/**
 * Env-only public URL (no request). Prefers APP_BASE_URL, then Railway's
 * current public domain, then CLIENT_URL — so a stale CLIENT_URL does not win
 * over the live Railway hostname after a rename.
 */
export function envPublicAppUrl() {
  const app = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  if (app) return app;

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  if (railway) return `https://${railway}`;

  const client = process.env.CLIENT_URL?.trim().replace(/\/$/, "");
  if (client) return client;

  return null;
}

/** Public app URL for redirects and OAuth callbacks. */
export function appBaseUrl(req) {
  const host = firstForwarded(req?.get?.("x-forwarded-host") || req?.get?.("host"));
  if (host && !isLocalHost(host)) {
    const proto =
      firstForwarded(req.get?.("x-forwarded-proto") || req.protocol || "https") ||
      "https";
    return `${proto}://${host}`;
  }

  return envPublicAppUrl() || "http://localhost:5173";
}

export function discogsCallbackUrl(req) {
  return `${appBaseUrl(req)}/auth/discogs/callback`;
}
