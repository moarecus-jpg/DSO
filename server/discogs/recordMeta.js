import { toEurPrice } from "../../shared/currency.js";
import { parseDiscogsRecordUrl } from "../../shared/parseRecordUrl.js";
import { MOCK_INVENTORY } from "../mock.js";
import { assertDiscogsAuth, buildAppDiscogsHeaders } from "./auth.js";
import { fetchInventoryForReleaseIds } from "./client.js";
import { runDiscogsRequest } from "./throttle.js";

const API = "https://api.discogs.com";

async function discogsGet(path) {
  const headers = buildAppDiscogsHeaders();
  assertDiscogsAuth(headers);

  return runDiscogsRequest(async () => {
    const res = await fetch(`${API}${path}`, { headers });
    if (!res.ok) {
      const text = await res.text();
      const retryAfter = res.headers.get("Retry-After");
      const suffix = retryAfter ? ` Retry-After: ${retryAfter}` : "";
      throw new Error(`Discogs ${res.status}: ${text.slice(0, 200)}${suffix}`);
    }
    return res.json();
  });
}

function artistsLabel(artists) {
  if (!artists?.length) return null;
  return artists.map((a) => a.name).join(", ");
}

function buildLabel(artist, title, note) {
  const base = [artist, title].filter(Boolean).join(" — ");
  if (note?.trim()) return note.trim();
  return base || null;
}

/** Full line as shown on Discogs (description or artist - title (format) (label - catno)). */
function listingDisplayTitle(release) {
  if (!release) return null;
  if (release.description) return release.description;
  const head = [release.artist, release.title].filter(Boolean).join(" - ");
  if (!head) return null;
  const fmt = release.format ? ` (${release.format})` : "";
  const lab =
    release.label && release.catalog_number
      ? ` (${release.label} - ${release.catalog_number})`
      : release.label
        ? ` (${release.label})`
        : "";
  return `${head}${fmt}${lab}`;
}

function listingPrice(data) {
  const listed = data.original_price;
  if (listed?.value != null) {
    return toEurPrice(listed.value, listed.curr_abbr ?? "EUR");
  }
  const p = data.price;
  if (p?.value != null) {
    return toEurPrice(p.value, p.currency);
  }
  return { value: null, currency: "EUR" };
}

function fromListingPayload(data, url, note) {
  const release = data.release ?? {};
  const artist =
    release.artist ?? artistsLabel(release.artists) ?? null;
  const title = release.title ?? null;
  const itemDescription = listingDisplayTitle(release);
  const price = listingPrice(data);

  return {
    artist,
    title,
    itemDescription,
    priceValue: price.value,
    priceCurrency: price.currency,
    mediaCondition: data.condition ?? null,
    sleeveCondition: data.sleeve_condition ?? null,
    label: note?.trim() || itemDescription || buildLabel(artist, title, note),
  };
}

function fromReleasePayload(data, url, note) {
  const artist = artistsLabel(data.artists) ?? null;
  const title = data.title ?? null;

  return {
    artist,
    title,
    priceValue: null,
    priceCurrency: null,
    mediaCondition: null,
    sleeveCondition: null,
    label: buildLabel(artist, title, note),
  };
}

async function findSellerListingIdForRelease(sellerUsername, releaseId) {
  if (!sellerUsername?.trim() || releaseId == null) return null;

  const matched = await fetchInventoryForReleaseIds(
    sellerUsername.trim(),
    [releaseId],
    null,
    null
  );
  return matched[0]?.id ?? null;
}

function mockFindListingIdForRelease(releaseId) {
  const listing = MOCK_INVENTORY.find((l) => l.release?.id === releaseId);
  return listing?.id ?? null;
}

export async function resolveRecordFromUrl(url, note, options = {}) {
  const { sellerUsername } = options;
  const parsed = parseDiscogsRecordUrl(url);
  if (!parsed.valid) {
    throw new Error("Neveljavna Discogs povezava.");
  }

  if (parsed.listingId != null) {
    const data = await discogsGet(
      `/marketplace/listings/${parsed.listingId}?curr_abbr=EUR`
    );
    return {
      listingId: parsed.listingId,
      releaseId: data.release?.id ?? parsed.releaseId ?? null,
      ...fromListingPayload(data, url, note),
    };
  }

  if (parsed.releaseId != null) {
    const listingId = sellerUsername
      ? await findSellerListingIdForRelease(sellerUsername, parsed.releaseId)
      : null;

    if (listingId != null) {
      const data = await discogsGet(
        `/marketplace/listings/${listingId}?curr_abbr=EUR`
      );
      return {
        listingId,
        releaseId: data.release?.id ?? parsed.releaseId,
        ...fromListingPayload(data, url, note),
      };
    }

    const data = await discogsGet(`/releases/${parsed.releaseId}`);
    return {
      listingId: null,
      releaseId: parsed.releaseId,
      ...fromReleasePayload(data, url, note),
    };
  }

  throw new Error(
    "Podprte so povezave do listinga (/shop/item/, /sell/item/) ali release (/release/)."
  );
}

export function mockResolveRecordFromUrl(url, note, options = {}) {
  const parsed = parseDiscogsRecordUrl(url);
  if (!parsed.valid) {
    throw new Error("Neveljavna Discogs povezava.");
  }

  if (parsed.listingId != null) {
    const listing = MOCK_INVENTORY.find((l) => l.id === parsed.listingId);
    if (!listing) {
      throw new Error(
        "Listing ni v demo podatkih. Uporabi pravo Discogs povezavo (API) ali demo listing 8821003."
      );
    }
    const release = listing.release ?? {};
    const artist = release.artist ?? "Unknown Artist";
    const title = release.title ?? "Unknown Title";
    const itemDescription = listingDisplayTitle(release);

    return {
      listingId: parsed.listingId,
      releaseId: release.id ?? null,
      artist,
      title,
      itemDescription,
      priceValue: toEurPrice(listing.price?.value, listing.price?.currency).value,
      priceCurrency: "EUR",
      mediaCondition: listing.condition ?? null,
      sleeveCondition: listing.sleeve_condition ?? null,
      label: note?.trim() || itemDescription || buildLabel(artist, title, note),
    };
  }

  if (parsed.releaseId != null) {
    const listingId = mockFindListingIdForRelease(parsed.releaseId);
    if (listingId != null) {
      return mockResolveRecordFromUrl(
        `https://www.discogs.com/sell/item/${listingId}`,
        note,
        options
      );
    }
    return {
      listingId: null,
      releaseId: parsed.releaseId,
      artist: "Neznani izvajalec",
      title: `Release #${parsed.releaseId}`,
      priceValue: null,
      priceCurrency: null,
      mediaCondition: null,
      sleeveCondition: null,
      label: note?.trim() || `Release #${parsed.releaseId}`,
    };
  }

  throw new Error("Neveljavna Discogs povezava.");
}
