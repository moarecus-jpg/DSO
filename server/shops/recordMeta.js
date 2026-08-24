import {
  humanizeSlug,
  parseShopRecordUrl,
} from "../../shared/parseShopUrl.js";
import { getStoreConfig, normalizeStore } from "../../shared/stores.js";
import { toEurPrice } from "../../shared/currency.js";

const FETCH_TIMEOUT_MS = 12_000;

function buildLabel(artist, title, note) {
  const base = [artist, title].filter(Boolean).join(" — ");
  if (note?.trim()) return note.trim();
  return base || null;
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function firstMatch(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function parseJsonLdProducts(html) {
  const scripts = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  const products = [];

  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed?.["@graph"]
          ? parsed["@graph"]
          : [parsed];
      for (const node of nodes) {
        const type = node?.["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((t) => String(t).toLowerCase() === "product")) {
          products.push(node);
        }
      }
    } catch {
      /* ignore invalid JSON-LD */
    }
  }

  return products;
}

function priceFromJsonLd(product) {
  const offers = product?.offers;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (offer?.price == null) return { value: null, currency: "EUR" };
  return toEurPrice(Number(offer.price), offer.priceCurrency ?? "EUR");
}

function availabilityFromJsonLd(product) {
  const offers = product?.offers;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  const raw = String(offer?.availability ?? "").toLowerCase();
  if (
    raw.includes("outofstock") ||
    raw.includes("soldout") ||
    raw.includes("discontinued")
  ) {
    return "unavailable";
  }
  return "available";
}

function cleanTitleNoise(name, storeId) {
  if (!name?.trim()) return null;
  let cleaned = name.trim();
  const storeCleaners = {
    hhv: [/\s*[|\u2013\u2014-]\s*HHV\.?de.*$/i, /\s+Vinyl.*$/i],
    yoyaku: [/\s*[|\u2013\u2014-]\s*Yoyaku.*$/i, /\s*\|\s*Buy Vinyl.*$/i],
    decks: [
      /\s*[|\u2013\u2014-]\s*decks\.de.*$/i,
      /\s*\|\s*.*Vinyl kaufen.*$/i,
      /\s*kaufen\s*\|\s*decks\.de.*$/i,
    ],
    deejay: [/\s*[|\u2013\u2014-]\s*Vinyl\s*$/i, /\s*\|\s*deejay\.de.*$/i],
    juno: [
      /\s*[|\u2013\u2014-]\s*Juno Records.*$/i,
      /\s+Vinyl at Juno Records\.?.*$/i,
      /\s+Vinyl\s*$/i,
    ],
  };
  for (const pattern of storeCleaners[storeId] ?? []) {
    cleaned = cleaned.replace(pattern, "").trim();
  }
  return cleaned || null;
}

function splitArtistTitle(name, storeId) {
  const cleaned = cleanTitleNoise(name, storeId);
  if (!cleaned) return { artist: null, title: null };

  const separators = [" – ", " — ", " - "];
  for (const sep of separators) {
    const idx = cleaned.indexOf(sep);
    if (idx > 0) {
      return {
        artist: cleaned.slice(0, idx).trim() || null,
        title: cleaned.slice(idx + sep.length).trim() || null,
      };
    }
  }

  // Deejay slug style: Artist_Title_CAT
  if (storeId === "deejay" && cleaned.includes("_")) {
    const parts = cleaned.split("_").filter(Boolean);
    if (parts.length >= 2) {
      return {
        artist: parts[0].replace(/\s+/g, " "),
        title: parts.slice(1).join(" ").replace(/\s+/g, " "),
      };
    }
  }

  // Decks slug: artist-title
  if (storeId === "decks" && cleaned.includes("-")) {
    const idx = cleaned.indexOf("-");
    if (idx > 0) {
      return {
        artist: humanizeSlug(cleaned.slice(0, idx)),
        title: humanizeSlug(cleaned.slice(idx + 1)),
      };
    }
  }

  return { artist: null, title: cleaned };
}

async function fetchShopHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "DSO-GroupOrders/1.0 (+https://github.com/moarecus-jpg/DSO; group-order metadata)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8,fr;q=0.7",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`Shop ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function fallbackTitle(parsed, storeId) {
  if (parsed.slug) {
    if (storeId === "decks") {
      const split = splitArtistTitle(parsed.slug, storeId);
      if (split.title) return split;
    }
    if (storeId === "deejay") {
      const split = splitArtistTitle(parsed.slug, storeId);
      if (split.title || split.artist) return split;
    }
    if (storeId === "juno" && parsed.slug) {
      const slug = parsed.slug.replace(/-vinyl$/i, "");
      return { artist: null, title: humanizeSlug(slug) };
    }
    return { artist: null, title: humanizeSlug(parsed.slug) };
  }
  const config = getStoreConfig(storeId);
  return {
    artist: null,
    title: `${config.label} item ${parsed.productId ?? ""}`.trim(),
  };
}

function metaFromHtml(html, parsed, note, storeId) {
  const products = parseJsonLdProducts(html);
  const product = products[0];

  let artist = null;
  let title = null;
  let price = { value: null, currency: "EUR" };
  let availability = "available";

  if (product) {
    const split = splitArtistTitle(product.name, storeId);
    artist = split.artist;
    title = split.title ?? cleanTitleNoise(product.name, storeId);
    price = priceFromJsonLd(product);
    availability = availabilityFromJsonLd(product);
  }

  if (!title) {
    const ogTitle = firstMatch(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);
    const split = splitArtistTitle(ogTitle, storeId);
    artist = artist ?? split.artist;
    title = split.title ?? cleanTitleNoise(ogTitle, storeId);
  }

  if (price.value == null) {
    const priceText = firstMatch(html, [
      /itemprop=["']price["'][^>]*content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]*itemprop=["']price["']/i,
      /"price"\s*:\s*"?(€?\s*[\d.,]+)"?/i,
      /(?:€|EUR)\s*([\d.,]+)/i,
      /([\d.,]+)\s*€/i,
      /class=["'][^"']*price[^"']*["'][^>]*>\s*€?\s*([\d.,]+)/i,
    ]);
    if (priceText) {
      const numeric = Number(
        String(priceText).replace(/[^\d.,]/g, "").replace(",", ".")
      );
      if (Number.isFinite(numeric)) {
        price = toEurPrice(numeric, "EUR");
      }
    }
  }

  if (!title) {
    const fallback = fallbackTitle(parsed, storeId);
    artist = artist ?? fallback.artist;
    title = fallback.title;
  }

  const itemDescription = [artist, title].filter(Boolean).join(" — ") || title;

  return {
    listingId: parsed.listingId ?? null,
    releaseId: null,
    artist,
    title,
    itemDescription,
    priceValue: price.value,
    priceCurrency: price.currency ?? "EUR",
    mediaCondition: null,
    sleeveCondition: null,
    label: buildLabel(artist, title, note),
    availability,
  };
}

export async function resolveShopRecordFromUrl(url, note, store) {
  const storeId = normalizeStore(store);
  const config = getStoreConfig(storeId);
  if (config.kind !== "shop") {
    throw new Error("Ta trgovina ne podpira shop povezav.");
  }

  const parsed = parseShopRecordUrl(url, storeId);
  if (!parsed.valid) {
    throw new Error(
      `Neveljavna ${config.label} povezava. Uporabi ${config.urlHint}.`
    );
  }

  try {
    const html = await fetchShopHtml(parsed.canonicalUrl);
    return metaFromHtml(html, parsed, note, storeId);
  } catch (err) {
    console.warn(`[${storeId}] metadata fetch failed:`, err?.message ?? err);
    const fallback = fallbackTitle(parsed, storeId);
    return {
      listingId: parsed.listingId ?? null,
      releaseId: null,
      artist: fallback.artist,
      title: fallback.title,
      itemDescription:
        [fallback.artist, fallback.title].filter(Boolean).join(" — ") ||
        fallback.title,
      priceValue: null,
      priceCurrency: "EUR",
      mediaCondition: null,
      sleeveCondition: null,
      label: buildLabel(fallback.artist, fallback.title, note),
    };
  }
}

export function mockResolveShopRecordFromUrl(url, note, store) {
  const storeId = normalizeStore(store);
  const config = getStoreConfig(storeId);
  const parsed = parseShopRecordUrl(url, storeId);
  if (!parsed.valid) {
    throw new Error(`Neveljavna ${config.label} povezava.`);
  }
  const fallback = fallbackTitle(parsed, storeId);
  return {
    listingId: parsed.listingId ?? 1001,
    releaseId: null,
    artist: fallback.artist ?? "Demo Artist",
    title: fallback.title,
    itemDescription: `${fallback.artist ?? "Demo Artist"} — ${fallback.title}`,
    priceValue: 19.99,
    priceCurrency: "EUR",
    mediaCondition: null,
    sleeveCondition: null,
    label: buildLabel(fallback.artist ?? "Demo Artist", fallback.title, note),
  };
}

/** @deprecated */
export async function resolveHhvRecordFromUrl(url, note) {
  return resolveShopRecordFromUrl(url, note, "hhv");
}

/** @deprecated */
export function mockResolveHhvRecordFromUrl(url, note) {
  return mockResolveShopRecordFromUrl(url, note, "hhv");
}
