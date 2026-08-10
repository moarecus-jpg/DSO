export const STORE_DISCOGS = "discogs";
export const STORE_HHV = "hhv";
export const STORE_YOYAKU = "yoyaku";
export const STORE_DECKS = "decks";
export const STORE_DEEJAY = "deejay";

/** @typedef {{ id: string, label: string, kind: 'marketplace' | 'shop', sellerUsername?: string, shopUrl?: string, hostIncludes?: string[], exampleUrl?: string, urlHint?: string, logoDomain?: string, logoUrl?: string }} StoreConfig */

function shopLogoUrl(domain) {
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`;
}

/** @type {Record<string, StoreConfig>} */
export const STORES = {
  [STORE_DISCOGS]: {
    id: STORE_DISCOGS,
    label: "Discogs",
    kind: "marketplace",
  },
  [STORE_HHV]: {
    id: STORE_HHV,
    label: "HHV",
    kind: "shop",
    sellerUsername: "hhv",
    shopUrl: "https://www.hhv.de/shop/en",
    hostIncludes: ["hhv.de"],
    exampleUrl: "https://www.hhv.de/shop/en/item/artist-album-450327",
    urlHint: "hhv.de/shop/…/item/…",
    logoDomain: "hhv.de",
    logoUrl: shopLogoUrl("hhv.de"),
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
