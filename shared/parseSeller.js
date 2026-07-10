/**
 * Extract a Discogs seller username from a profile URL or plain username.
 */
export function parseSellerInput(input) {
  const trimmed = input?.trim();
  if (!trimmed) return null;

  const looksLikeUrl =
    /^https?:\/\//i.test(trimmed) ||
    trimmed.includes("discogs.com") ||
    trimmed.startsWith("www.");

  if (looksLikeUrl) {
    try {
      const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const u = new URL(href);
      if (!u.hostname.includes("discogs.com")) return null;

      const sellerMatch = u.pathname.match(/\/seller\/([^/]+)/i);
      if (sellerMatch) {
        return decodeURIComponent(sellerMatch[1]);
      }
      // /seller/vinylminded/mywants — same seller segment as profile

      const userMatch = u.pathname.match(/\/user\/([^/]+)/i);
      if (userMatch) return decodeURIComponent(userMatch[1]);

      return null;
    } catch {
      return null;
    }
  }

  const username = trimmed.replace(/^@/, "").replace(/\/+$/, "");
  return username || null;
}
