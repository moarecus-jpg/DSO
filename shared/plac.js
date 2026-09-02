export const PLAC_LISTING_TYPES = ["vinyl", "other"];

export const PLAC_CATEGORIES = [
  "vinyl",
  "speakers",
  "equipment",
  "accessories",
  "other",
];

export const PLAC_OTHER_CONDITIONS = [
  "New",
  "Like new",
  "Good",
  "Fair",
  "For parts",
];

export function isValidPlacCategory(value) {
  return PLAC_CATEGORIES.includes(value);
}

export function isValidPlacListingType(value) {
  return PLAC_LISTING_TYPES.includes(value);
}

export function isValidPlacOtherCondition(value) {
  return PLAC_OTHER_CONDITIONS.includes(value);
}

export function placListingTitle(listing) {
  if (listing?.artist && listing?.title) {
    return `${listing.artist} — ${listing.title}`;
  }
  return listing?.title || listing?.artist || "—";
}
