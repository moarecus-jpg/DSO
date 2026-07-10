/** Public app URL for redirects and OAuth callbacks. */
export function appBaseUrl(req) {
  const fromEnv = process.env.CLIENT_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const host = req?.get?.("host");
  if (host) {
    const proto = req.protocol || "https";
    return `${proto}://${host}`;
  }

  return "http://localhost:5173";
}

export function discogsCallbackUrl(req) {
  return `${appBaseUrl(req)}/auth/discogs/callback`;
}
