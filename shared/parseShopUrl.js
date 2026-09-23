import { getStoreConfig, normalizeStore, STORE_DECKS, STORE_DEEJAY, STORE_HHV, STORE_JUNO, STORE_YOYAKU } from "./stores.js";

function ensureUrl(url) {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function humanizeSlug(slug) {
  if (!slug?.trim()) return null;
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/** Stable positive int from a string (for non-numeric shop product keys). */
export function stableListingId(key) {
  const raw = String(key ?? "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

/** HHV storefront locale for SI community pricing (DE vs SI prices differ). */
export const HHV_PRICE_LOCALE =
  process.env.HHV_LOCALE?.trim() || "en-SI-EUR-eu";

/** German (and other) category path segments → English SI storefront. */
const HHV_CATEGORY_MAP = {
  schallplatten: "records",
  records: "records",
  cds: "cds",
  "cds-dvds": "cds-dvds",
  tapes: "tapes",
  merchandise: "merchandise",
  equipment: "equipment",
  books: "books",
  magazines: "magazines",
};

/** Product path segment: English `/item/` or German `/artikel/`. */
const HHV_ITEM_SEGMENT = /^(?:item|artikel)$/i;
const HHV_ITEM_PATH_RE = /\/(?:item|artikel)\/([^/?#]+)/i;

function hhvPathParts(pathname) {
  return pathname.replace(/\/+$/, "").split("/").filter(Boolean);
}

function hhvItemIndex(parts) {
  return parts.findIndex((p) => HHV_ITEM_SEGMENT.test(p));
}

function normalizeHhvCategory(raw) {
  const key = String(raw || "records").toLowerCase();
  return HHV_CATEGORY_MAP[key] || key || "records";
}

function resolveHhvCategory(parts) {
  if (parts[0]?.toLowerCase() === "shop") return "records";
  const itemIdx = hhvItemIndex(parts);
  if (itemIdx >= 2) {
    // /{locale}/{category}/item|artikel/{slug}
    // or /{category}/artikel/{slug} (no locale — itemIdx === 1 stays records default)
    return normalizeHhvCategory(parts[itemIdx - 1]);
  }
  if (itemIdx === 1) {
    // /records/artikel/{slug} or /schallplatten/artikel/{slug}
    return normalizeHhvCategory(parts[0]);
  }
  return "records";
}

/**
 * Rewrite ANY HHV product URL to the community SI price locale.
 * Strips tracking query params; accepts /en/, /de/, /en-DE-EUR-eu/,
 * German /artikel/, /schallplatten/, legacy /shop/…
 */
export function hhvPriceLocaleUrl(url, locale = HHV_PRICE_LOCALE) {
  try {
    const href = ensureUrl(url);
    if (!href) return null;
    const u = new URL(href);
    if (!u.hostname.includes("hhv.de")) return href;

    const itemMatch = u.pathname.match(HHV_ITEM_PATH_RE);
    if (!itemMatch) return href;
    const slugFull = decodeURIComponent(itemMatch[1]).replace(/\/+$/, "");
    if (!slugFull) return href;

    const parts = hhvPathParts(u.pathname);
    const category = resolveHhvCategory(parts);

    return `https://www.hhv.de/${locale}/${category}/item/${slugFull}`;
  } catch {
    return url;
  }
}

export function isHhvSiLocaleUrl(url) {
  try {
    const href = ensureUrl(url);
    if (!href) return false;
    const u = new URL(href);
    if (!u.hostname.includes("hhv.de")) return false;
    const first = u.pathname.split("/").filter(Boolean)[0] || "";
    return first.toLowerCase() === HHV_PRICE_LOCALE.toLowerCase();
  } catch {
    return false;
  }
}

export function parseHhvRecordUrl(url) {
  try {
    const href = ensureUrl(url);
    if (!href) return { valid: false };
    const u = new URL(href);
    if (!u.hostname.includes("hhv.de")) return { valid: false };

    const itemMatch = u.pathname.match(HHV_ITEM_PATH_RE);
    if (!itemMatch) return { valid: false };

    const slugFull = decodeURIComponent(itemMatch[1]).replace(/\/+$/, "");
    const idMatch = slugFull.match(/-(\d+)$/);
    const productId = idMatch ? Number(idMatch[1]) : null;
    const slug = idMatch ? slugFull.slice(0, -idMatch[0].length) : slugFull;
    if (productId == null && !slug) return { valid: false };

    const parts = hhvPathParts(u.pathname);
    const category = resolveHhvCategory(parts);
    const canonicalUrl = hhvPriceLocaleUrl(href, HHV_PRICE_LOCALE);

    return {
      valid: true,
      store: STORE_HHV,
      productId,
      listingId: productId,
      slug,
      slugFull,
      category,
      canonicalUrl,
      rewrittenLocale: !isHhvSiLocaleUrl(href),
    };
  } catch {
    return { valid: false };
  }
}

export function parseYoyakuRecordUrl(url) {
  try {
    const href = ensureUrl(url);
    if (!href) return { valid: false };
    const u = new URL(href);
    if (!u.hostname.includes("yoyaku.io")) return { valid: false };

    const releaseMatch = u.pathname.match(/\/release\/([^/?#]+)/i);
    if (!releaseMatch) return { valid: false };

    const slug = decodeURIComponent(releaseMatch[1]).replace(/\/+$/, "");
    if (!slug) return { valid: false };

    return {
      valid: true,
      store: STORE_YOYAKU,
      productId: slug,
      listingId: stableListingId(slug),
      slug,
      canonicalUrl: `https://yoyaku.io/release/${slug}/`,
    };
  } catch {
    return { valid: false };
  }
}

export function parseDecksRecordUrl(url) {
  try {
    const href = ensureUrl(url);
    if (!href) return { valid: false };
    const u = new URL(href);
    if (!u.hostname.includes("decks.de")) return { valid: false };

    const parts = u.pathname
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean)
      .map((p) => decodeURIComponent(p));

    // /track/...slug.../code  or  /m/...slug.../code  (slug may contain extra segments)
    if (parts.length < 3) return { valid: false };
    const kind = parts[0].toLowerCase();
    if (kind !== "track" && kind !== "m") return { valid: false };

    const code = parts[parts.length - 1];
    const slug = parts.slice(1, -1).join("-");
    if (!slug || !code) return { valid: false };

    return {
      valid: true,
      store: STORE_DECKS,
      productId: code,
      listingId: stableListingId(code),
      slug,
      code,
      canonicalUrl: `https://www.decks.de/${kind}/${parts.slice(1).join("/")}`,
    };
  } catch {
    return { valid: false };
  }
}

export function parseDeejayRecordUrl(url) {
  try {
    const href = ensureUrl(url);
    if (!href) return { valid: false };
    const u = new URL(href);
    if (!u.hostname.includes("deejay.de")) return { valid: false };

    const path = u.pathname.replace(/^\/+|\/+$/g, "");
    if (!path || path.includes("/")) return { valid: false };

    // Artist_Title_CAT_Vinyl__123456
    const idMatch = path.match(/__(\d+)$/);
    if (!idMatch) return { valid: false };

    const productId = Number(idMatch[1]);
    const slug = path.slice(0, -idMatch[0].length);

    return {
      valid: true,
      store: STORE_DEEJAY,
      productId,
      listingId: productId,
      slug,
      canonicalUrl: `https://www.deejay.de/${path}`,
    };
  } catch {
    return { valid: false };
  }
}

export function parseJunoRecordUrl(url) {
  try {
    const href = ensureUrl(url);
    if (!href) return { valid: false };
    const u = new URL(href);
    if (!u.hostname.includes("juno.co.uk")) return { valid: false };

    const match = u.pathname.match(/\/products\/([^/?#]+)\/(\d+)(?:-\d+)?\/?$/i);
    if (!match) return { valid: false };

    const slug = decodeURIComponent(match[1]).replace(/\/+$/, "");
    const productId = Number(match[2]);
    if (!slug || !Number.isFinite(productId)) return { valid: false };

    return {
      valid: true,
      store: STORE_JUNO,
      productId,
      listingId: productId,
      slug,
      canonicalUrl: `https://www.juno.co.uk/products/${slug}/${productId}-01/`,
    };
  } catch {
    return { valid: false };
  }
}

const PARSERS = {
  [STORE_HHV]: parseHhvRecordUrl,
  [STORE_YOYAKU]: parseYoyakuRecordUrl,
  [STORE_DECKS]: parseDecksRecordUrl,
  [STORE_DEEJAY]: parseDeejayRecordUrl,
  [STORE_JUNO]: parseJunoRecordUrl,
};

export function parseShopRecordUrl(url, store) {
  const id = normalizeStore(store);
  const parser = PARSERS[id];
  if (!parser) return { valid: false };
  return parser(url);
}

/**
 * Normalize a pasted shop URL for storage.
 * HHV: always rewrite to SI price locale so DE/en links become en-SI-EUR-eu.
 */
export function normalizeShopLinkUrl(url, store) {
  const storeId = normalizeStore(store);
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return trimmed;

  if (storeId === STORE_HHV) {
    const parsed = parseHhvRecordUrl(trimmed);
    if (parsed.valid && parsed.canonicalUrl) return parsed.canonicalUrl;
    return hhvPriceLocaleUrl(trimmed) || trimmed;
  }

  const parsed = parseShopRecordUrl(trimmed, storeId);
  if (parsed.valid && parsed.canonicalUrl) return parsed.canonicalUrl;
  return trimmed;
}

export function isShopRecordUrl(url, store) {
  return Boolean(parseShopRecordUrl(url, store).valid);
}

/** One shop product URL per line for the given store. */
export function parseShopUrlList(text, store) {
  if (!text?.trim()) return { valid: [], invalid: [] };

  const seen = new Set();
  const valid = [];
  const invalid = [];
  const config = getStoreConfig(store);

  for (const line of text.split(/[\r\n]+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (config.kind === "shop" && isShopRecordUrl(trimmed, store)) {
      const normalized = normalizeShopLinkUrl(trimmed, store);
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      valid.push(normalized);
    } else {
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      invalid.push(trimmed);
    }
  }

  return { valid, invalid };
}

// Back-compat aliases used by older HHV imports
export const humanizeHhvSlug = humanizeSlug;
export const isHhvRecordUrl = (url) => isShopRecordUrl(url, STORE_HHV);
export const parseHhvUrlList = (text) => parseShopUrlList(text, STORE_HHV);
