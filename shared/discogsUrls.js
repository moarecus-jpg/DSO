/** Discogs web URL: tvoja wantlist pri sellerju (zahteva prijavo na discogs.com). */
export function sellerMywantsUrl(sellerUsername, wantlistUsername) {
  const seller = sellerUsername?.trim().replace(/^@/, "");
  if (!seller) return null;
  const base = `https://www.discogs.com/seller/${encodeURIComponent(seller)}/mywants`;
  const user = wantlistUsername?.trim().replace(/^@/, "");
  if (!user) return base;
  return `${base}?user=${encodeURIComponent(user)}`;
}

export function sellerProfileUrl(sellerUsername) {
  const seller = sellerUsername?.trim().replace(/^@/, "");
  if (!seller) return null;
  return `https://www.discogs.com/seller/${encodeURIComponent(seller)}/profile`;
}
