import {
  getGroupSession,
  listOpenGroupSessions,
  updateSessionAvailabilityCheckedAt,
  updateSessionLinkAvailability,
} from "../db.js";
import { resolveRecordFromUrl } from "../discogs/recordMeta.js";
import { resolveShopRecordFromUrl } from "../shops/recordMeta.js";
import { isShopStore } from "../../shared/stores.js";

const STALE_MS = 2 * 60 * 1000;
const LINK_DELAY_MS = 350;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function refreshSessionLinks(session) {
  for (const link of session.links ?? []) {
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
    } catch (err) {
      if (isNotFoundError(err)) {
        updateSessionLinkAvailability(link.id, {
          availability: "unavailable",
          availabilityNote: "Listing was not found.",
        });
      } else {
        console.warn(
          `[availability] skip ${link.id}:`,
          err?.message ?? err
        );
      }
    }
    await sleep(LINK_DELAY_MS);
  }

  updateSessionAvailabilityCheckedAt(session.id);
  return getGroupSession(session.id);
}

export async function refreshSessionAvailability(session, { force = false } = {}) {
  if (!session || session.status !== "open") return session;
  if (!(session.links ?? []).length) return session;

  const checkedAt = session.availability_checked_at
    ? Date.parse(session.availability_checked_at)
    : 0;
  if (!force && Number.isFinite(checkedAt) && Date.now() - checkedAt < STALE_MS) {
    return session;
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
