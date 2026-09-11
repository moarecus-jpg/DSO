export const STORE_DISCOGS = "discogs";
export const STORE_HHV = "hhv";
export const STORE_YOYAKU = "yoyaku";
export const STORE_DECKS = "decks";
export const STORE_DEEJAY = "deejay";
export const STORE_JUNO = "juno";

/** @typedef {{ id: string, label: string, kind: 'marketplace' | 'shop', sellerUsername?: string, shopUrl?: string, hostIncludes?: string[], exampleUrl?: string, urlHint?: string, logoDomain?: string, logoUrl?: string, currency?: string }} StoreConfig */

function shopLogoUrl(domain) {
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`;
}

/** @type {Record<string, StoreConfig>} */
export const STORES = {
  [STORE_DISCOGS]: {
    id: STORE_DISCOGS,
    label: "Discogs",
    kind: "marketplace",
    logoDomain: "discogs.com",
    logoUrl: shopLogoUrl("discogs.com"),
    currency: "EUR",
  },
  [STORE_HHV]: {
    id: STORE_HHV,
    label: "HHV",
    kind: "shop",
    sellerUsername: "hhv",
    shopUrl: "https://www.hhv.de/en-SI-EUR-eu/records",
    hostIncludes: ["hhv.de"],
    exampleUrl:
      "https://www.hhv.de/en-SI-EUR-eu/records/item/artist-album-1395420",
    urlHint: "hhv.de/…/item/…",
    logoDomain: "hhv.de",
    logoUrl: shopLogoUrl("hhv.de"),
    currency: "EUR",
  },
  [STORE_YOYAKU]: {
    id: STORE_YOYAKU,
    label: "Yoyaku",
    kind: "shop",
    sellerUsername: "yoyaku",
    shopUrl: "https://yoyaku.io/",
    hostIncludes: ["yoyaku.io"],
    exampleUrl: "https://yoyaku.io/release/artist-title-cat/",
    urlHint: "yoyaku.io/release/…",
    logoDomain: "yoyaku.io",
    logoUrl: shopLogoUrl("yoyaku.io"),
    currency: "EUR",
  },
  [STORE_DECKS]: {
    id: STORE_DECKS,
    label: "Decks",
    kind: "shop",
    sellerUsername: "decks",
    shopUrl: "https://www.decks.de/",
    hostIncludes: ["decks.de"],
    exampleUrl: "https://www.decks.de/track/artist-title/abc-12",
    urlHint: "decks.de/track/… or /m/…",
    logoDomain: "decks.de",
    logoUrl: shopLogoUrl("decks.de"),
    currency: "EUR",
  },
  [STORE_DEEJAY]: {
    id: STORE_DEEJAY,
    label: "Deejay",
    kind: "shop",
    sellerUsername: "deejay",
    shopUrl: "https://www.deejay.de/",
    hostIncludes: ["deejay.de"],
    exampleUrl: "https://www.deejay.de/Artist_Title_CAT_Vinyl__123456",
    urlHint: "deejay.de/…__123456",
    logoDomain: "deejay.de",
    logoUrl: shopLogoUrl("deejay.de"),
    currency: "EUR",
  },
  [STORE_JUNO]: {
    id: STORE_JUNO,
    label: "Juno",
    kind: "shop",
    sellerUsername: "juno",
    shopUrl: "https://www.juno.co.uk/",
    hostIncludes: ["juno.co.uk"],
    exampleUrl:
      "https://www.juno.co.uk/products/david-bowie-from-station-to-station-vinyl/1052372-01/",
    urlHint: "juno.co.uk/products/…/…-01",
    logoDomain: "juno.co.uk",
    logoUrl: shopLogoUrl("juno.co.uk"),
    currency: "GBP",
  },
};
export const SHOP_STORE_IDS = Object.values(STORES)
  .filter((s) => s.kind === "shop")
  .map((s) => s.id);

/** @deprecated use STORES.hhv.sellerUsername */
export const HHV_SELLER_USERNAME = STORES[STORE_HHV].sellerUsername;
/** @deprecated use STORES.hhv.shopUrl */
export const HHV_SHOP_URL = STORES[STORE_HHV].shopUrl;

export function normalizeStore(store) {
  const value = String(store ?? STORE_DISCOGS)
    .trim()
    .toLowerCase();
  if (STORES[value]) return value;
  return STORE_DISCOGS;
}

export function getStoreConfig(store) {
  return STORES[normalizeStore(store)];
}

/** Default listing currency for a store (items may still override). */
export function getStoreCurrency(store) {
  return getStoreConfig(store).currency ?? "EUR";
}

export function isShopStore(store) {
  return getStoreConfig(store).kind === "shop";
}

/** @deprecated use isShopStore */
export function isHhvStore(store) {
  return normalizeStore(store) === STORE_HHV;
}

export function shopSellerUsername(store) {
  const config = getStoreConfig(store);
  return config.sellerUsername ?? config.id;
}
