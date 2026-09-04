import { formatPlacListingFormat, normalizePlacYear } from "./placFormat.js";

const PRICE_BUCKETS = [
  { id: "under20", min: 0, max: 20 },
  { id: "20to50", min: 20, max: 50 },
  { id: "50to100", min: 50, max: 100 },
  { id: "100plus", min: 100, max: Infinity },
];

export const PLAC_PRICE_BUCKET_IDS = PRICE_BUCKETS.map((b) => b.id);

function splitTokens(value) {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function priceBucketId(priceValue) {
  const value = Number(priceValue);
  if (!Number.isFinite(value) || value < 0) return null;
  const bucket = PRICE_BUCKETS.find((b) => value >= b.min && value < b.max);
  return bucket?.id ?? null;
}

/** Facet values present on one listing. */
export function listingFacetValues(listing) {
  const styles = splitTokens(listing?.genre);
  const formatDisplay = formatPlacListingFormat(listing?.format) || listing?.format || "";
  const formats = splitTokens(formatDisplay);
  const year = normalizePlacYear(listing?.year);
  const country = listing?.country?.trim() || null;
  const condition = listing?.mediaCondition?.trim() || null;
  const category =
    listing?.category && listing.category !== "vinyl" ? listing.category : null;
  const price = priceBucketId(listing?.priceValue);

  return {
    style: styles,
    format: formats,
    country: country ? [country] : [],
    year: year != null ? [String(year)] : [],
    condition: condition ? [condition] : [],
    price: price ? [price] : [],
    category: category ? [category] : [],
  };
}

function emptySelection() {
  return {
    style: [],
    format: [],
    country: [],
    year: [],
    condition: [],
    price: [],
    category: [],
  };
}

export function createEmptyPlacFacetSelection() {
  return emptySelection();
}

export const PLAC_FACET_KEYS = [
  "style",
  "format",
  "country",
  "year",
  "condition",
  "price",
  "category",
];

/** Facets shown expanded by default in the dig sidebar. */
/** Facets shown expanded by default in the dig sidebar. */
export const PLAC_FACET_DEFAULT_OPEN = new Set(["style", "format", "country"]);

export function hasActivePlacFacets(selected) {
  return Object.values(selected ?? {}).some((values) => values.length > 0);
}

function listingMatchesFacet(listingValues, key, selectedValues) {
  if (!selectedValues?.length) return true;
  const have = new Set((listingValues[key] ?? []).map((v) => v.toLowerCase()));
  return selectedValues.some((value) => have.has(String(value).toLowerCase()));
}

export function listingMatchesPlacFacets(listing, selected) {
  const values = listingFacetValues(listing);
  return PLAC_FACET_KEYS.every((key) =>
    listingMatchesFacet(values, key, selected[key])
  );
}

function bumpCount(map, value) {
  if (!value) return;
  map.set(value, (map.get(value) ?? 0) + 1);
}

/**
 * Facet options with counts for the current result set
 * (so counts shrink as other filters narrow the list).
 */
export function buildPlacFacetOptions(listings) {
  const buckets = Object.fromEntries(PLAC_FACET_KEYS.map((key) => [key, new Map()]));

  for (const listing of listings) {
    const values = listingFacetValues(listing);
    for (const key of PLAC_FACET_KEYS) {
      for (const value of values[key]) bumpCount(buckets[key], value);
    }
  }

  const sortEntries = (entries, key) => {
    if (key === "year") {
      return entries.sort((a, b) => Number(b.value) - Number(a.value));
    }
    if (key === "price") {
      const order = new Map(PLAC_PRICE_BUCKET_IDS.map((id, i) => [id, i]));
      return entries.sort(
        (a, b) => (order.get(a.value) ?? 99) - (order.get(b.value) ?? 99)
      );
    }
    return entries.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.value.localeCompare(b.value, undefined, { sensitivity: "base" });
    });
  };

  const result = {};
  for (const [key, map] of Object.entries(buckets)) {
    const entries = [...map.entries()].map(([value, count]) => ({ value, count }));
    result[key] = sortEntries(entries, key);
  }
  return result;
}

export function filterListingsByPlacFacets(listings, selected, { except } = {}) {
  if (!hasActivePlacFacets(selected)) return listings;
  const effective = except
    ? { ...selected, [except]: [] }
    : selected;
  if (!hasActivePlacFacets(effective)) return listings;
  return listings.filter((listing) => listingMatchesPlacFacets(listing, effective));
}

/** Per-facet options with counts that ignore that facet's own selection. */
export function buildPlacFacetOptionsForSelection(listings, selected) {
  const result = {};
  for (const key of PLAC_FACET_KEYS) {
    const scoped = filterListingsByPlacFacets(listings, selected, { except: key });
    result[key] = buildPlacFacetOptions(scoped)[key];
  }
  return result;
}
