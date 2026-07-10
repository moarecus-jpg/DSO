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

/** Opens Discogs cart page and adds one listing (user must be logged in on discogs.com). */
export function discogsAddToCartUrl(listingId) {
  const id = String(listingId ?? "").trim();
  if (!id || id === "—") return null;
  return `https://www.discogs.com/sell/cart/?add=${encodeURIComponent(id)}&ev=atc_br`;
}

export function discogsCartUrl() {
  return "https://www.discogs.com/sell/cart/";
}
