import {
  humanizeSlug,
  parseShopRecordUrl,
} from "../../shared/parseShopUrl.js";
import { getStoreConfig, normalizeStore } from "../../shared/stores.js";
import { toEurPrice } from "../../shared/currency.js";
import {
  browserFetchAvailable,
  fetchDecksMetaBatchWithBrowser,
  fetchDecksMetaWithBrowser,
  fetchHtmlWithBrowser,
  looksLikeBotWall,
} from "./browserFetch.js";

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

function priceFromJsonLd(product, storeId = null) {
  const offers = product?.offers;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  if (offer?.price == null) return { value: null, currency: "EUR" };
  let cur = String(offer.priceCurrency ?? "EUR").toUpperCase();
  // EU shops sometimes label local EUR amounts as USD when Accept-Language is en-US.
  // Applying our rough USD→EUR rate then stores wrong "EUR" values (e.g. 29.35→27.30).
  const euShops = new Set(["decks", "hhv", "deejay", "juno", "yoyaku"]);
  if (euShops.has(storeId) && cur === "USD") cur = "EUR";
  return toEurPrice(Number(offer.price), cur);
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

async function fetchShopHtmlPlain(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
        "Cache-Control": "no-cache",
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

async function fetchShopHtml(url) {
  let html = null;
  let plainError = null;
  try {
    html = await fetchShopHtmlPlain(url);
  } catch (err) {
    plainError = err;
  }

  const needsBrowser =
    plainError != null || looksLikeBotWall(html) || !html;

  if (!needsBrowser) return html;

  if (!browserFetchAvailable()) {
    if (html) return html;
    throw plainError ?? new Error("Shop fetch failed");
  }

  try {
    console.info(`[shops] bot-wall/fallback → headless browser for ${url}`);
    const rendered = await fetchHtmlWithBrowser(url);
    if (rendered && !looksLikeBotWall(rendered)) return rendered;
    return rendered || html;
  } catch (err) {
    console.warn(`[shops] browser fetch failed:`, err?.message ?? err);
    if (html) return html;
    throw plainError ?? err;
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
    price = priceFromJsonLd(product, storeId);
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

  let listingId = parsed.listingId ?? null;
  if (storeId === "yoyaku") {
    const wcId = firstMatch(html, [
      /name=["']add-to-cart["'][^>]*value=["'](\d+)["']/i,
      /value=["'](\d+)["'][^>]*name=["']add-to-cart["']/i,
    ]);
    if (wcId && Number.isFinite(Number(wcId))) listingId = Number(wcId);
  }

  return {
    listingId,
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

function normalizeDecksPriceText(raw) {
  return String(raw ?? "")
    .replace(/\*/g, "")
    .replace(/EUR/gi, "")
    .replace(/€/g, "")
    .replace(/[^\d.,]/g, "")
    .replace(",", ".")
    .trim();
}

function metaFromDecksRpc(parsed, note, rpc) {
  const code = parsed.code || parsed.productId;
  const audio = rpc?.audio?.json ?? {};

  const rpcPriceRaw = normalizeDecksPriceText(rpc?.price?.json?.price);
  const domPriceRaw = normalizeDecksPriceText(rpc?.domPrice);
  const chosenRaw = rpcPriceRaw || domPriceRaw;
  const numeric = Number(chosenRaw);
  const parsedPrice =
    Number.isFinite(numeric) && numeric > 0
      ? toEurPrice(numeric, "EUR")
      : { value: null, currency: "EUR" };

  // Railway / non-EU datacenter IPs get Decks "export" prices (e.g. 27.30),
  // while EU shoppers see VAT-inclusive prices (e.g. 33.31). Never persist
  // server-scraped Decks prices there — client bookmarklet sync is required.
  const dropGeoPrice =
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    process.env.DECKS_CLIENT_PRICES === "1";

  const price = dropGeoPrice
    ? { value: null, currency: "EUR" }
    : parsedPrice;

  if (price.value == null && !dropGeoPrice) {
    throw new Error(
      `Decks price unavailable for ${code} (cf/rpc). Retry availability refresh.`
    );
  }
  if (parsedPrice.value != null && dropGeoPrice) {
    console.info(
      `[shops] decks skip geo price ${code}=${parsedPrice.value} (use client EU sync)`
    );
  } else if (price.value != null) {
    console.info(`[shops] decks price ${code} = ${price.value}`);
  }

  const artist = audio.artist?.trim() || null;
  const title = audio.titel?.trim() || audio.title?.trim() || null;
  const fallback = fallbackTitle(parsed, "decks");
  const resolvedArtist = artist ?? fallback.artist;
  const resolvedTitle = title ?? fallback.title;
  const itemDescription =
    [resolvedArtist, resolvedTitle].filter(Boolean).join(" — ") ||
    resolvedTitle;

  return {
    listingId: parsed.listingId ?? null,
    releaseId: null,
    artist: resolvedArtist,
    title: resolvedTitle,
    itemDescription,
    priceValue: price.value,
    priceCurrency: price.currency ?? "EUR",
    mediaCondition: null,
    sleeveCondition: null,
    label: buildLabel(resolvedArtist, resolvedTitle, note),
    availability: "available",
  };
}

async function resolveDecksFromRpc(parsed, note) {
  const code = parsed.code || parsed.productId;
  if (!code || !browserFetchAvailable()) {
    const fallback = fallbackTitle(parsed, "decks");
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
      availability: "available",
    };
  }

  console.info(`[shops] decks meta via browser for ${code}`);
  const rpc = await fetchDecksMetaWithBrowser(code, parsed.canonicalUrl);
  return metaFromDecksRpc(parsed, note, rpc);
}

/** Resolve many Decks links in one warmed browser (order availability refresh). */
export async function resolveDecksLinksBatch(links) {
  if (!browserFetchAvailable()) {
    throw new Error("Decks browser scrape unavailable");
  }

  const prepared = [];
  for (const link of links ?? []) {
    const parsed = parseShopRecordUrl(link.url, "decks");
    if (!parsed.valid) continue;
    const code = parsed.code || parsed.productId;
    if (!code) continue;
    prepared.push({ link, parsed, code, productUrl: parsed.canonicalUrl });
  }
  if (!prepared.length) return new Map();

  console.info(`[shops] decks batch meta for ${prepared.length} item(s)`);
  const rpcByCode = await fetchDecksMetaBatchWithBrowser(
    prepared.map((row) => ({ code: row.code, productUrl: row.productUrl }))
  );

  const out = new Map();
  for (const row of prepared) {
    try {
      const rpc = rpcByCode.get(row.code);
      if (!rpc) throw new Error(`No RPC payload for ${row.code}`);
      const meta = metaFromDecksRpc(row.parsed, row.link.note ?? null, rpc);
      out.set(row.link.id, meta);
    } catch (err) {
      console.warn(
        `[shops] decks batch skip ${row.link.id}/${row.code}:`,
        err?.message ?? err
      );
    }
  }
  return out;
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
    if (storeId === "decks") {
      return await resolveDecksFromRpc(parsed, note);
    }
    const html = await fetchShopHtml(parsed.canonicalUrl);
    return metaFromHtml(html, parsed, note, storeId);
  } catch (err) {
    // Decks: don't return null prices — callers would keep stale USD-converted values.
    if (storeId === "decks") throw err;
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
