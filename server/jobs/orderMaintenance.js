import {
  autoCloseStaleOpenSessions,
  clearSessionAttentionNotified,
  findUserById,
  getOrderOwnerForAttentionNotification,
  isDeliverableEmail,
  listOpenSessionsNeedingAttentionNotify,
  markSessionAttentionNotified,
} from "../db.js";
import {
  notifyOrderClosed,
  notifyOrderNeedsAttention,
} from "../email/notifications.js";
import { envPublicAppUrl } from "../appUrl.js";
import { refreshOpenOrdersAvailability, backfillMissingShopPrices } from "./availability.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const START_DELAY_MS = 20_000;
const AUTO_CLOSE_DAYS = 14;

function publicBaseUrl() {
  return envPublicAppUrl() || `http://localhost:${process.env.PORT || 3001}`;
}

async function runAutoClose() {
  const closed = autoCloseStaleOpenSessions(AUTO_CLOSE_DAYS);
  const baseUrl = publicBaseUrl();
  for (const session of closed) {
    notifyOrderClosed({
      baseUrl,
      session,
      excludeUserId: null,
      kind: "auto",
    }).catch((err) => console.error("Auto-close notification:", err));
  }
  if (closed.length) {
    console.log(`[jobs] auto-closed ${closed.length} stale order(s)`);
  }
}

async function runAttentionOwnerNotify() {
  const { needing, recovered } = listOpenSessionsNeedingAttentionNotify();
  for (const session of recovered) {
    clearSessionAttentionNotified(session.id);
  }

  const baseUrl = publicBaseUrl();
  let sent = 0;
  for (const session of needing) {
    const owner = getOrderOwnerForAttentionNotification(session);
    if (!owner) {
      const rawOwner = findUserById(session.created_by);
      // No deliverable email → don't retry forever. Prefs off → retry later.
      if (!rawOwner || !isDeliverableEmail(rawOwner.email)) {
        markSessionAttentionNotified(session.id);
      }
      continue;
    }
    try {
      await notifyOrderNeedsAttention({ baseUrl, session, owner });
      markSessionAttentionNotified(session.id);
      sent += 1;
    } catch (err) {
      console.error(
        `[jobs] attention notify failed for ${session.id}:`,
        err.message
      );
    }
  }
  if (sent || recovered.length) {
    console.log(
      `[jobs] attention: notified ${sent} owner(s), cleared ${recovered.length} recovered`
    );
  }
}

async function runDailyMaintenance({ includeFullAvailability = true } = {}) {
  console.log("[jobs] daily order maintenance started");
  try {
    await runAutoClose();
  } catch (err) {
    console.error("[jobs] auto-close failed:", err);
  }
  try {
    await runAttentionOwnerNotify();
  } catch (err) {
    console.error("[jobs] attention notify failed:", err);
  }
  try {
    const result = await backfillMissingShopPrices();
    console.log(
      `[jobs] shop price backfill: ${result.filled} filled across ${result.refreshed} order(s)`
    );
  } catch (err) {
    console.error("[jobs] shop price backfill failed:", err);
  }
  if (includeFullAvailability) {
    try {
      await refreshOpenOrdersAvailability();
    } catch (err) {
      console.error("[jobs] availability refresh failed:", err);
    }
  }
  console.log("[jobs] daily order maintenance finished");
}

export function startOrderMaintenanceJobs() {
  setTimeout(() => {
    // On boot, prioritize filling missing shop prices before the heavier full refresh.
    backfillMissingShopPrices()
      .then((result) => {
        console.log(
          `[jobs] startup shop price backfill: ${result.filled} filled across ${result.refreshed} order(s)`
        );
      })
      .catch((err) => console.error("[jobs] startup shop price backfill:", err))
      .finally(() => {
        runDailyMaintenance({ includeFullAvailability: true }).catch((err) =>
          console.error("[jobs]", err)
        );
      });
  }, START_DELAY_MS);
  setInterval(() => {
    runDailyMaintenance().catch((err) => console.error("[jobs]", err));
  }, DAY_MS);
}
