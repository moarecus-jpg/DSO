import { toEurPrice } from "../../shared/currency.js";
import { buildPlacReleaseFormat, normalizePlacYear } from "../../shared/placFormat.js";
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
    listingStatus: data.status ?? null,
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

function fromReleasePayloadPlac(data) {
  const artist = artistsLabel(data.artists) ?? null;
  const title = data.title ?? null;
  const thumbnailUrl = data.images?.[0]?.uri ?? data.thumb ?? null;
  const styles = (data.styles ?? []).filter(Boolean);
  const genres = (data.genres ?? []).filter(Boolean);

  return {
    artist,
    title,
    thumbnailUrl,
    year: normalizePlacYear(data.year),
    // Cards show style (House, Deep House) rather than broad genre (Electronic).
    genre: styles.length ? styles.join(", ") : genres.length ? genres.join(", ") : null,
    country: data.country ?? null,
    format: buildPlacReleaseFormat(data.formats),
  };
}

function mapReleaseTrack(track) {
  if (!track) return null;
  return {
    position: track.position || null,
    title: track.title || null,
    duration: track.duration || null,
    type: track.type_ || "track",
    artists: artistsLabel(track.artists) ?? null,
  };
}

function youtubeEmbedUrl(uri) {
  if (!uri) return null;
  try {
    const url = new URL(uri);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      const shorts = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/);
      if (shorts?.[1]) return `https://www.youtube-nocookie.com/embed/${shorts[1]}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function mapReleaseVideos(videos) {
  return (videos ?? [])
    .map((video) => {
      const uri = video.uri || null;
      if (!uri) return null;
      return {
        title: video.title || null,
        description: video.description || null,
        duration: Number.isFinite(Number(video.duration)) ? Number(video.duration) : null,
        uri,
        embedUrl: video.embed === false ? null : youtubeEmbedUrl(uri),
      };
    })
    .filter(Boolean);
}

const STREAMING_LINK_HOSTS = [
  { id: "appleMusic", label: "Apple Music", match: /music\.apple\.com|itunes\.apple\.com/i },
  { id: "spotify", label: "Spotify", match: /open\.spotify\.com|spotify\.link/i },
  { id: "youtubeMusic", label: "YouTube Music", match: /music\.youtube\.com/i },
  { id: "bandcamp", label: "Bandcamp", match: /bandcamp\.com/i },
  { id: "soundcloud", label: "SoundCloud", match: /soundcloud\.com/i },
  { id: "tidal", label: "Tidal", match: /tidal\.com/i },
  { id: "deezer", label: "Deezer", match: /deezer\.com/i },
];

function classifyStreamingUrl(uri) {
  if (!uri) return null;
  try {
    const host = new URL(uri).hostname;
    const hit = STREAMING_LINK_HOSTS.find((item) => item.match.test(host));
    if (!hit) return null;
    return { id: hit.id, label: hit.label, url: uri };
  } catch {
    return null;
  }
}

function extractStreamingLinksFromText(text) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s)\]>"']+/gi) ?? [];
  const links = [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:!?]+$/, "");
    const link = classifyStreamingUrl(cleaned);
    if (link && !links.some((item) => item.id === link.id)) links.push(link);
  }
  return links;
}

async function fetchSonglinkListenLinks(sourceUrl) {
  if (!sourceUrl) return [];
  try {
    const endpoint = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(sourceUrl)}&userCountry=SI`;
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const byPlatform = data?.linksByPlatform ?? {};
    const wanted = [
      ["appleMusic", "Apple Music"],
      ["spotify", "Spotify"],
      ["youtubeMusic", "YouTube Music"],
      ["tidal", "Tidal"],
      ["deezer", "Deezer"],
      ["amazonMusic", "Amazon Music"],
      ["bandcamp", "Bandcamp"],
      ["soundcloud", "SoundCloud"],
    ];
    const links = [];
    for (const [id, label] of wanted) {
      const url = byPlatform[id]?.url;
      if (url && !links.some((item) => item.id === id)) {
        links.push({ id, label, url });
      }
    }
    return links;
  } catch {
    return [];
  }
}

function mergeListenLinks(...groups) {
  const links = [];
  for (const group of groups) {
    for (const link of group ?? []) {
      if (!link?.url || !link?.id) continue;
      if (!links.some((item) => item.id === link.id)) links.push(link);
    }
  }
  return links;
}

function mapReleaseDetails(data) {
  if (!data) return null;

  const labels = (data.labels ?? [])
    .map((label) => ({
      name: label.name || null,
      catno: label.catno || null,
    }))
    .filter((label) => label.name);

  const images = (data.images ?? [])
    .map((image) => ({
      uri: image.uri || image.resource_url || null,
      type: image.type || "secondary",
    }))
    .filter((image) => image.uri);

  const have = Number(data.community?.have);
  const want = Number(data.community?.want);
  const ratingAverage = Number(data.community?.rating?.average);
  const ratingCount = Number(data.community?.rating?.count);
  const videos = mapReleaseVideos(data.videos);
  const listenLinks = extractStreamingLinksFromText(data.notes);

  return {
    id: data.id ?? null,
    title: data.title ?? null,
    artist: artistsLabel(data.artists) ?? null,
    year: normalizePlacYear(data.year),
    country: data.country ?? null,
    genres: data.genres ?? [],
    styles: data.styles ?? [],
    labels,
    format: buildPlacReleaseFormat(data.formats),
    formats: (data.formats ?? []).map((format) => ({
      name: format.name || null,
      qty: format.qty || null,
      descriptions: format.descriptions ?? [],
    })),
    tracklist: (data.tracklist ?? []).map(mapReleaseTrack).filter(Boolean),
    videos,
    listenLinks,
    images,
    notes: data.notes?.trim() || null,
    community: {
      have: Number.isFinite(have) ? have : null,
      want: Number.isFinite(want) ? want : null,
      ratingAverage: Number.isFinite(ratingAverage) ? ratingAverage : null,
      ratingCount: Number.isFinite(ratingCount) ? ratingCount : null,
    },
    uri: data.uri
      ? data.uri.startsWith("http")
        ? data.uri
        : `https://www.discogs.com${data.uri}`
      : null,
  };
}

/** Full Discogs release payload for marketplace listing detail pages. */
export async function fetchPlacReleaseDetails(releaseId) {
  if (releaseId == null || releaseId === "") {
    throw new Error("Release ID manjka.");
  }

  const data = await discogsGet(`/releases/${releaseId}`);
  const details = mapReleaseDetails(data);
  const youtubeSource =
    details.videos.find((video) => video.embedUrl)?.uri ||
    details.videos[0]?.uri ||
    null;
  const songlinkSource = youtubeSource || details.uri || null;
  const songlinkLinks = await fetchSonglinkListenLinks(songlinkSource);
  return {
    ...details,
    listenLinks: mergeListenLinks(details.listenLinks, songlinkLinks),
  };
}

export function mockFetchPlacReleaseDetails(releaseId) {
  return {
    id: Number(releaseId) || 75078,
    title: "The Squeeze",
    artist: "J-Walk",
    year: 2006,
    country: "UK",
    genres: ["Electronic"],
    styles: ["Broken Beat", "Nu Jazz"],
    labels: [{ name: "Tru Thoughts", catno: "TRUCD118" }],
    format: "Vinyl, LP",
    formats: [{ name: "Vinyl", qty: "1", descriptions: ["LP"] }],
    tracklist: [
      { position: "A1", title: "Intro", duration: "1:12", type: "track", artists: null },
      { position: "A2", title: "The Squeeze", duration: "4:20", type: "track", artists: null },
      { position: "A3", title: "Night Drive", duration: "3:45", type: "track", artists: null },
      { position: "B1", title: "Late Hours", duration: "5:01", type: "track", artists: null },
      { position: "B2", title: "Outro", duration: "2:10", type: "track", artists: null },
    ],
    videos: [
      {
        title: "J-Walk - The Squeeze",
        description: "Official video",
        duration: 260,
        uri: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      },
    ],
    listenLinks: [
      { id: "appleMusic", label: "Apple Music", url: "https://music.apple.com/search?term=J-Walk%20The%20Squeeze" },
      { id: "spotify", label: "Spotify", url: "https://open.spotify.com/search/J-Walk%20The%20Squeeze" },
    ],
    images: [],
    notes: "Demo release details used when Discogs API is unavailable.",
    community: {
      have: 184,
      want: 97,
      ratingAverage: 4.2,
      ratingCount: 31,
    },
    uri: "https://www.discogs.com/master/75078-J-Walk-The-Squeeze",
  };
}

/** Plac marketplace: release or marketplace listing URL with enriched metadata. */
export async function resolvePlacReleaseFromUrl(url) {
  const parsed = parseDiscogsRecordUrl(url);
  if (!parsed.valid) {
    throw new Error("Neveljavna Discogs povezava.");
  }

  if (parsed.listingId != null) {
    const data = await discogsGet(
      `/marketplace/listings/${parsed.listingId}?curr_abbr=EUR`
    );
    const releaseId = data.release?.id;
    if (releaseId == null) {
      throw new Error("Listing nima povezanega release.");
    }

    const releaseData = await discogsGet(`/releases/${releaseId}`);
    const price = listingPrice(data);
    const placRelease = fromReleasePayloadPlac(releaseData);

    return {
      releaseId,
      releaseUrl: url.trim(),
      listingId: parsed.listingId,
      fromListing: true,
      ...placRelease,
      thumbnailUrl:
        placRelease.thumbnailUrl ??
        data.release?.thumb ??
        data.release?.thumbnail ??
        null,
      priceValue: price.value,
      priceCurrency: price.currency ?? "EUR",
      mediaCondition: data.condition ?? null,
      sleeveCondition: data.sleeve_condition ?? null,
    };
  }

  if (parsed.releaseId != null) {
    const data = await discogsGet(`/releases/${parsed.releaseId}`);
    return {
      releaseId: parsed.releaseId,
      releaseUrl: url.trim(),
      listingId: null,
      fromListing: false,
      ...fromReleasePayloadPlac(data),
      priceValue: null,
      priceCurrency: null,
      mediaCondition: null,
      sleeveCondition: null,
    };
  }

  throw new Error(
    "Podprte so Discogs release (/release/) ali listing (/sell/item/, /shop/item/) povezave."
  );
}

export function mockResolvePlacReleaseFromUrl(url) {
  const parsed = parseDiscogsRecordUrl(url);
  if (!parsed.valid) {
    throw new Error("Neveljavna Discogs povezava.");
  }

  if (parsed.listingId != null) {
    const listing = MOCK_INVENTORY.find((l) => l.id === parsed.listingId);
    if (listing) {
      const release = listing.release ?? {};
      const artist = release.artist ?? "Demo Artist";
      const title = release.title ?? `Listing #${parsed.listingId}`;
      const price = listingPrice(listing);

      return {
        releaseId: release.id ?? parsed.listingId,
        releaseUrl: url.trim(),
        listingId: parsed.listingId,
        fromListing: true,
        artist,
        title,
        thumbnailUrl: null,
        year: 1984,
        genre: "Italo-Disco, Synth-pop",
        country: "Slovenia",
        format: release.format ?? "Vinyl, LP",
        priceValue: price.value,
        priceCurrency: price.currency ?? "EUR",
        mediaCondition: listing.condition ?? "Very Good Plus (VG+)",
        sleeveCondition: listing.sleeve_condition ?? null,
      };
    }

    return {
      releaseId: parsed.listingId,
      releaseUrl: url.trim(),
      listingId: parsed.listingId,
      fromListing: true,
      artist: "Demo Artist",
      title: `Listing #${parsed.listingId}`,
      thumbnailUrl: null,
      year: 1984,
      genre: "House, Deep House",
      country: "Slovenia",
      format: "Vinyl, LP",
      priceValue: 24.99,
      priceCurrency: "EUR",
      mediaCondition: "Very Good Plus (VG+)",
      sleeveCondition: "Very Good Plus (VG+)",
    };
  }

  if (parsed.releaseId != null) {
    return {
      releaseId: parsed.releaseId,
      releaseUrl: url.trim(),
      listingId: null,
      fromListing: false,
      artist: "Demo Artist",
      title: `Release #${parsed.releaseId}`,
      thumbnailUrl: null,
      year: 1984,
      genre: "Broken Beat, Nu Jazz",
      country: "Slovenia",
      format: "Vinyl, LP",
      priceValue: null,
      priceCurrency: null,
      mediaCondition: null,
      sleeveCondition: null,
    };
  }

  throw new Error(
    "Podprte so Discogs release (/release/) ali listing (/sell/item/, /shop/item/) povezave."
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
