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

export function parseHhvRecordUrl(url) {
  try {
    const href = ensureUrl(url);
    if (!href) return { valid: false };
    const u = new URL(href);
    if (!u.hostname.includes("hhv.de")) return { valid: false };

    const itemMatch = u.pathname.match(/\/item\/([^/?#]+)/i);
    if (!itemMatch) return { valid: false };

    const slugFull = decodeURIComponent(itemMatch[1]).replace(/\/+$/, "");
    const idMatch = slugFull.match(/-(\d+)$/);
    const productId = idMatch ? Number(idMatch[1]) : null;
    const slug = idMatch ? slugFull.slice(0, -idMatch[0].length) : slugFull;
    if (productId == null && !slug) return { valid: false };

    const pathLang = u.pathname.match(/^\/shop\/([a-z]{2})\//i)?.[1] ?? "en";
    const canonicalPath = `/shop/${pathLang}/item/${slugFull}`;

    return {
      valid: true,
      store: STORE_HHV,
      productId,
      listingId: productId,
      slug,
      slugFull,
      canonicalUrl: `https://www.hhv.de${canonicalPath}`,
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

    // /track/artist-title/code  or  /m/artist-title/code
    const match = u.pathname.match(/^\/(track|m)\/([^/]+)\/([^/?#]+)/i);
    if (!match) return { valid: false };

    const kind = match[1].toLowerCase();
    const slug = decodeURIComponent(match[2]);
    const code = decodeURIComponent(match[3]);
    if (!slug || !code) return { valid: false };

    return {
      valid: true,
      store: STORE_DECKS,
      productId: code,
      listingId: stableListingId(code),
      slug,
      code,
      canonicalUrl: `https://www.decks.de/${kind}/${slug}/${code}`,
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
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (config.kind === "shop" && isShopRecordUrl(trimmed, store)) {
      valid.push(trimmed);
    } else {
      invalid.push(trimmed);
    }
  }

  return { valid, invalid };
}

// Back-compat aliases used by older HHV imports
export const humanizeHhvSlug = humanizeSlug;
export const isHhvRecordUrl = (url) => isShopRecordUrl(url, STORE_HHV);
export const parseHhvUrlList = (text) => parseShopUrlList(text, STORE_HHV);
