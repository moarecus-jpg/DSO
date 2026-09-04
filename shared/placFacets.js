import { formatPlacListingFormat, normalizePlacYear } from "./placFormat.js";

const FORMAT_NAMES = new Set([
  "vinyl",
  "cd",
  "cdr",
  "cassette",
  "file",
  "dvd",
  "dvd-video",
  "bluray",
  "blu-ray",
  "sacd",
  "minidisc",
  "lathe cut",
  "flexi-disc",
  "shellac",
  "acetate",
  "box set",
  "all media",
]);

function splitTokens(value) {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseFormatParts(format) {
  const display = formatPlacListingFormat(format) || format || "";
  const parts = splitTokens(display);
  const names = [];
  const descriptions = [];
  for (const part of parts) {
    if (FORMAT_NAMES.has(part.toLowerCase())) names.push(part);
    else descriptions.push(part);
  }
  return { names, descriptions };
}

/** Facet values present on one listing. */
export function listingFacetValues(listing) {
  const styles = splitTokens(listing?.genre);
  const { names, descriptions } = parseFormatParts(listing?.format);
  const year = normalizePlacYear(listing?.year);
  const country = listing?.country?.trim() || null;
  const category =
    listing?.category && listing.category !== "vinyl" ? listing.category : null;

  return {
    style: styles,
    formatName: names,
    formatDescription: descriptions,
    country: country ? [country] : [],
    year: year != null ? [String(year)] : [],
    category: category ? [category] : [],
  };
}

function emptySelection() {
  return {
    style: [],
    formatName: [],
    formatDescription: [],
    country: [],
    year: [],
    category: [],
  };
}

export function createEmptyPlacFacetSelection() {
  return emptySelection();
}

export function hasActivePlacFacets(selected) {
  return Object.values(selected ?? {}).some((values) => values.length > 0);
}

function listingMatchesFacet(listingValues, key, selectedValues) {
  if (!selectedValues?.length) return true;
  const have = new Set((listingValues[key] ?? []).map((v) => v.toLowerCase()));
  return selectedValues.some((value) => have.has(value.toLowerCase()));
}

export function listingMatchesPlacFacets(listing, selected) {
  const values = listingFacetValues(listing);
  return (
    listingMatchesFacet(values, "style", selected.style) &&
    listingMatchesFacet(values, "formatName", selected.formatName) &&
    listingMatchesFacet(values, "formatDescription", selected.formatDescription) &&
    listingMatchesFacet(values, "country", selected.country) &&
    listingMatchesFacet(values, "year", selected.year) &&
    listingMatchesFacet(values, "category", selected.category)
  );
}

export const PLAC_FACET_KEYS = [
  "style",
  "formatName",
  "formatDescription",
  "country",
  "year",
  "category",
];

function bumpCount(map, value) {
  if (!value) return;
  map.set(value, (map.get(value) ?? 0) + 1);
}

/**
 * Facet options with counts for the current result set
 * (so counts shrink as other filters narrow the list).
 */
export function buildPlacFacetOptions(listings) {
  const buckets = {
    style: new Map(),
    formatName: new Map(),
    formatDescription: new Map(),
    country: new Map(),
    year: new Map(),
    category: new Map(),
  };

  for (const listing of listings) {
    const values = listingFacetValues(listing);
    for (const key of Object.keys(buckets)) {
      for (const value of values[key]) bumpCount(buckets[key], value);
    }
  }

  const sortEntries = (entries, key) => {
    if (key === "year") {
      return entries.sort((a, b) => Number(b.value) - Number(a.value));
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