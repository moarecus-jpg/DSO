const RPM_PATTERN = /\b\d+\s*⅓?\s*RPM\b|\bRPM\b/i;
const TEST_PRESSING_PATTERN = /test\s*press/i;
const SIZE_PATTERN = /^\d+\s*"$/;
const TYPE_PATTERN = /^(LP|EP|Single)$/i;
const MULTI_LP_PATTERN = /^\d+xLP$/i;

const DROPPED_PARTS = new Set([
  "limited edition",
  "white label",
  "stereo",
  "mono",
  "promo",
  "reissue",
  "album",
  "compilation",
  "numbered",
  "gatefold",
]);

const COLOR_KEYWORDS = [
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "white",
  "black",
  "clear",
  "transparent",
  "gold",
  "silver",
  "bronze",
  "marble",
  "marbled",
  "splatter",
  "multicolor",
  "multicolour",
  "colored",
  "coloured",
  "opaque",
  "smoke",
  "grey",
  "gray",
  "brown",
  "turquoise",
  "cyan",
  "magenta",
  "lavender",
  "cream",
  "beige",
  "neon",
];

function normalizePart(text) {
  return text?.trim().replace(/\s+/g, " ") ?? "";
}

function isDroppedPart(text) {
  const lower = text.toLowerCase();
  if (RPM_PATTERN.test(text)) return true;
  return DROPPED_PARTS.has(lower);
}

function isColorDescription(text) {
  const lower = text.toLowerCase();
  if (COLOR_KEYWORDS.some((color) => lower === color || lower.includes(color))) {
    return true;
  }
  return /\b(vinyl|marble|splatter)\b/i.test(lower) && lower.length < 40;
}

function pushUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function collectFormatParts(parts) {
  const sizes = [];
  const types = [];
  const colors = [];
  let vinyl = false;
  let testPressing = false;

  for (const raw of parts) {
    const part = normalizePart(raw);
    if (!part) continue;

    if (TEST_PRESSING_PATTERN.test(part)) {
      testPressing = true;
      continue;
    }
    if (isDroppedPart(part)) continue;

    if (part.toLowerCase() === "vinyl") {
      vinyl = true;
      continue;
    }
    if (SIZE_PATTERN.test(part)) {
      pushUnique(sizes, part);
      continue;
    }
    if (TYPE_PATTERN.test(part)) {
      pushUnique(types, part.toUpperCase() === "SINGLE" ? "Single" : part.toUpperCase());
      continue;
    }
    if (MULTI_LP_PATTERN.test(part)) {
      pushUnique(types, part.toUpperCase());
      continue;
    }
    if (isColorDescription(part)) {
      pushUnique(colors, part);
    }
  }

  const result = [];
  if (vinyl) result.push("Vinyl");
  result.push(...sizes, ...types, ...colors);
  if (testPressing) result.push("Test Pressing");

  return result;
}

export function normalizePlacYear(year) {
  const value = Number(year);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function buildPlacReleaseFormat(formats) {
  if (!Array.isArray(formats) || formats.length === 0) return null;

  const parts = [];
  for (const format of formats) {
    const name = normalizePart(format?.name);
    if (name) parts.push(name);
    for (const description of format?.descriptions ?? []) {
      parts.push(description);
    }
  }

  const result = collectFormatParts(parts);
  return result.length ? result.join(", ") : null;
}

export function formatPlacListingFormat(format) {
  if (!format?.trim()) return null;

  const result = collectFormatParts(format.split(/[,/]/));
  return result.length ? result.join(", ") : null;
}
