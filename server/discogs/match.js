import { parseDiscogsRecordUrl } from "../../shared/parseRecordUrl.js";

export function matchWantlistToInventory(wantlist, listings) {
  const listingByRelease = new Map();

  for (const listing of listings) {
    const releaseId = listing.release?.id;
    if (releaseId == null) continue;
    const key = Number(releaseId);
    if (!listingByRelease.has(key)) {
      listingByRelease.set(key, listing);
    }
  }

  const matches = [];

  for (const want of wantlist) {
    const releaseId = want.id ?? want.basic_information?.id;
    if (releaseId == null) continue;

    const listing = listingByRelease.get(Number(releaseId));
    if (!listing) continue;

    const info = want.basic_information ?? {};
    matches.push({
      releaseId,
      artist: info.artists?.map((a) => a.name).join(", ") ?? listing.release?.artist,
      title: info.title ?? listing.release?.title,
      year: info.year,
      thumbnail: info.thumb ?? info.cover_image ?? listing.release?.thumbnail,
      wantNotes: want.notes ?? null,
      listing: {
        id: listing.id,
        price: listing.price,
        condition: listing.condition,
        sleeve_condition: listing.sleeve_condition,
        uri: `https://www.discogs.com/sell/item/${listing.id}`,
        status: listing.status,
      },
    });
  }

  matches.sort((a, b) => {
    const pa = a.listing.price?.value ?? 0;
    const pb = b.listing.price?.value ?? 0;
    return pa - pb;
  });

  return matches;
}

export function parseDiscogsUrl(url) {
  const parsed = parseDiscogsRecordUrl(url);
  if (!parsed.valid) return {};
  const { listingId, releaseId, masterId } = parsed;
  return {
    ...(listingId != null ? { listingId } : {}),
    ...(releaseId != null ? { releaseId } : {}),
    ...(masterId != null ? { masterId } : {}),
  };
}
