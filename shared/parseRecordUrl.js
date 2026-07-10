/**
 * Parse a Discogs URL for a listing, release, or seller item.
 */
export function parseDiscogsRecordUrl(url) {
  try {
    const trimmed = url?.trim();
    if (!trimmed) return { valid: false };

    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(href);
    if (!u.hostname.includes("discogs.com")) return { valid: false };

    const sellMatch = u.pathname.match(/\/sell\/item\/(\d+)/i);
    if (sellMatch) return { valid: true, listingId: Number(sellMatch[1]) };

    const shopMatch = u.pathname.match(/\/shop\/item\/(\d+)/i);
    if (shopMatch) return { valid: true, listingId: Number(shopMatch[1]) };

    const sellerItemMatch = u.pathname.match(/\/seller\/[^/]+\/item\/(\d+)/i);
    if (sellerItemMatch) return { valid: true, listingId: Number(sellerItemMatch[1]) };

    const releaseMatch = u.pathname.match(/\/release\/(\d+)/i);
    if (releaseMatch) return { valid: true, releaseId: Number(releaseMatch[1]) };

    const masterMatch = u.pathname.match(/\/master\/(\d+)/i);
    if (masterMatch) return { valid: true, masterId: Number(masterMatch[1]) };

    return { valid: false };
  } catch {
    return { valid: false };
  }
}

export function isDiscogsRecordUrl(url) {
  const parsed = parseDiscogsRecordUrl(url);
  return (
    parsed.valid &&
    (parsed.listingId != null || parsed.releaseId != null || parsed.masterId != null)
  );
}

/** One Discogs URL per line; ignores prazne in podvojene. */
export function parseDiscogsUrlList(text) {
  if (!text?.trim()) return { valid: [], invalid: [] };

  const seen = new Set();
  const valid = [];
  const invalid = [];

  for (const line of text.split(/[\r\n]+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (isDiscogsRecordUrl(trimmed)) {
      valid.push(trimmed);
    } else {
      invalid.push(trimmed);
    }
  }

  return { valid, invalid };
}
