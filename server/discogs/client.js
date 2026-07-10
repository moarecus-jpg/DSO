import { oauthGetJson } from "./oauth.js";
import {
  assertDiscogsAuth,
  buildAppDiscogsHeaders,
  hasUserOAuth,
  DISCOGS_UA,
} from "./auth.js";
import { runDiscogsRequest } from "./throttle.js";

const API = "https://api.discogs.com";
export const INVENTORY_PER_PAGE = 100;
/** Max seller inventory pages when scanning for wantlist matches. */
export const MAX_MATCH_SCAN_PAGES = 20;

function inventoryBaseUrl(sellerUsername) {
  return `${API}/users/${encodeURIComponent(sellerUsername)}/inventory?status=For%20Sale`;
}

/**
 * GET Discogs JSON — user requests use signed OAuth; otherwise app key+secret.
 */
async function discogsApiGet(url, token, tokenSecret) {
  return runDiscogsRequest(async () => {
    if (hasUserOAuth(token, tokenSecret)) {
      return oauthGetJson(url, token, tokenSecret);
    }

    const headers = buildAppDiscogsHeaders();
    assertDiscogsAuth(headers);

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      const retryAfter = res.headers.get("Retry-After");
      const suffix = retryAfter ? ` Retry-After: ${retryAfter}` : "";
      throw new Error(`Discogs ${res.status}: ${text}${suffix}`);
    }
    return res.json();
  });
}

async function fetchPaginated(baseUrl, token, tokenSecret, key, perPage = 100) {
  const items = [];
  let page = 1;
  let pages = 1;

  while (page <= pages) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    const data = await discogsApiGet(
      `${baseUrl}${sep}page=${page}&per_page=${perPage}`,
      token,
      tokenSecret
    );
    items.push(...(data[key] ?? []));
    pages = data.pagination?.pages ?? 1;
    page += 1;
  }

  return items;
}

export async function fetchSellerInventoryPage(
  sellerUsername,
  page = 1,
  token,
  tokenSecret
) {
  const base = inventoryBaseUrl(sellerUsername);
  const data = await discogsApiGet(
    `${base}&page=${page}&per_page=${INVENTORY_PER_PAGE}`,
    token,
    tokenSecret
  );
  return {
    listings: data.listings ?? [],
    pagination: {
      page: data.pagination?.page ?? page,
      pages: data.pagination?.pages ?? 1,
      perPage: data.pagination?.per_page ?? INVENTORY_PER_PAGE,
    },
  };
}

/** Scan seller inventory until all wantlist release IDs are found or limit hit. */
export async function fetchInventoryForReleaseIds(
  sellerUsername,
  releaseIds,
  token,
  tokenSecret
) {
  const remaining = new Set(releaseIds.filter(Boolean).map(Number));
  if (remaining.size === 0) return [];

  const matched = [];
  let page = 1;
  let totalPages = 1;

  while (remaining.size > 0 && page <= MAX_MATCH_SCAN_PAGES && page <= totalPages) {
    const { listings, pagination } = await fetchSellerInventoryPage(
      sellerUsername,
      page,
      token,
      tokenSecret
    );
    totalPages = pagination.pages;

    for (const listing of listings) {
      const releaseId = listing.release?.id;
      if (releaseId != null && remaining.has(Number(releaseId))) {
        matched.push(listing);
        remaining.delete(Number(releaseId));
      }
    }
    page += 1;
  }

  return matched;
}

const MAX_WANTLIST_PAGES = 15;

export async function getUserWantlist(username, token, tokenSecret) {
  if (!hasUserOAuth(token, tokenSecret)) {
    throw new Error(
      "Za wantlist je potrebna povezava Discogs računa v Nastavitvah."
    );
  }

  const url = `${API}/users/${encodeURIComponent(username)}/wants`;
  const items = [];
  let page = 1;
  let pages = 1;

  while (page <= pages && page <= MAX_WANTLIST_PAGES) {
    const sep = url.includes("?") ? "&" : "?";
    const data = await discogsApiGet(
      `${url}${sep}page=${page}&per_page=100`,
      token,
      tokenSecret
    );
    items.push(...(data.wants ?? []));
    pages = data.pagination?.pages ?? 1;
    page += 1;
  }

  return items;
}

export async function getIdentity(token, tokenSecret) {
  return runDiscogsRequest(() =>
    oauthGetJson(`${API}/oauth/identity`, token, tokenSecret)
  );
}

/** Public seller profile (avatar, stats). Uses app key+secret. */
export async function getDiscogsUserProfile(username) {
  const data = await discogsApiGet(
    `${API}/users/${encodeURIComponent(username)}`
  );
  return data.avatar_url ?? null;
}

export { DISCOGS_UA };
