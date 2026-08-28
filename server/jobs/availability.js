import {
  getGroupSession,
  listOpenGroupSessions,
  updateSessionAvailabilityCheckedAt,
  updateSessionLinkAvailability,
} from "../db.js";
import { resolveRecordFromUrl } from "../discogs/recordMeta.js";
import { resolveShopRecordFromUrl } from "../shops/recordMeta.js";
import { isShopStore } from "../../shared/stores.js";
import { isLinkUnavailable } from "../../shared/orderTotals.js";

const SHOP_CONCURRENCY = 4;

async function mapPool(items, concurrency, mapper) {
  if (!items.length) return;
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        await mapper(items[index]);
      }
    }
  );
  await Promise.all(workers);
}

function isNotFoundError(err) {
  const msg = String(err?.message ?? "");
  return /\b404\b/.test(msg) || /not found/i.test(msg);
}

function listingUnavailable(meta) {
  const status = String(meta?.listingStatus ?? "").toLowerCase();
  if (status && status !== "for sale") return true;
  if (meta?.availability === "unavailable") return true;
  return false;
}

async function resolveMeta(link, session) {
  const note = link.note ?? null;
  if (isShopStore(session.store)) {
    return resolveShopRecordFromUrl(link.url, note, session.store);
  }
  return resolveRecordFromUrl(link.url, note, {
    sellerUsername: session.seller_username,
  });
}

async function refreshOneLink(session, link, becameUnavailableIds) {
  const wasUnavailable = isLinkUnavailable(link);
  try {
    const meta = await resolveMeta(link, session);
    const unavailable = listingUnavailable(meta);
    updateSessionLinkAvailability(link.id, {
      artist: meta.artist,
      title: meta.title,
      itemDescription: meta.itemDescription,
      label: meta.label,
      priceValue: meta.priceValue,
      priceCurrency: meta.priceCurrency,
      mediaCondition: meta.mediaCondition,
      sleeveCondition: meta.sleeveCondition,
      listingId: meta.listingId,
      releaseId: meta.releaseId,
      availability: unavailable ? "unavailable" : "available",
      availabilityNote: unavailable ? "Listing is no longer for sale." : null,
    });
    if (unavailable && !wasUnavailable) becameUnavailableIds.push(link.id);
  } catch (err) {
    if (isNotFoundError(err)) {
      updateSessionLinkAvailability(link.id, {
        availability: "unavailable",
        availabilityNote: "Listing was not found.",
      });
      if (!wasUnavailable) becameUnavailableIds.push(link.id);
    } else {
      console.warn(`[availability] skip ${link.id}:`, err?.message ?? err);
    }
  }
}

async function refreshSessionLinks(session) {
  const becameUnavailableIds = [];
  const links = session.links ?? [];
  const concurrency = isShopStore(session.store) ? SHOP_CONCURRENCY : 1;

  await mapPool(links, concurrency, (link) =>
    refreshOneLink(session, link, becameUnavailableIds)
  );

  updateSessionAvailabilityCheckedAt(session.id);
  const updated = getGroupSession(session.id);
  const becameUnavailable = (updated?.links ?? []).filter((link) =>
    becameUnavailableIds.includes(link.id)
  );
  return { session: updated, becameUnavailable };
}

export async function refreshSessionAvailability(session, { force = false } = {}) {
  if (!session || session.status !== "open") {
    return { session, becameUnavailable: [] };
  }
  if (!(session.links ?? []).length) {
    return { session, becameUnavailable: [] };
  }
  if (!force) {
    return { session, becameUnavailable: [] };
  }

  return refreshSessionLinks(session);
}

export async function refreshOpenOrdersAvailability() {
  const sessions = listOpenGroupSessions();
  for (const summary of sessions) {
    const session = getGroupSession(summary.id);
    if (!session) continue;
    try {
      await refreshSessionAvailability(session, { force: true });
    } catch (err) {
      console.warn(
        `[availability] session ${summary.id}:`,
        err?.message ?? err
      );
    }
  }
}
