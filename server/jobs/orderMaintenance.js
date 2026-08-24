import { appBaseUrl } from "../appUrl.js";
import { autoCloseStaleOpenSessions } from "../db.js";
import { notifyOrderClosed } from "../email/notifications.js";
import { refreshOpenOrdersAvailability } from "./availability.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const START_DELAY_MS = 45_000;
const AUTO_CLOSE_DAYS = 14;

function publicBaseUrl() {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, "");
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return `http://localhost:${process.env.PORT || 3001}`;
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

async function runDailyMaintenance() {
  console.log("[jobs] daily order maintenance started");
  try {
    await runAutoClose();
  } catch (err) {
    console.error("[jobs] auto-close failed:", err);
  }
  try {
    await refreshOpenOrdersAvailability();
  } catch (err) {
    console.error("[jobs] availability refresh failed:", err);
  }
  console.log("[jobs] daily order maintenance finished");
}

export function startOrderMaintenanceJobs() {
  setTimeout(() => {
    runDailyMaintenance().catch((err) => console.error("[jobs]", err));
  }, START_DELAY_MS);
  setInterval(() => {
    runDailyMaintenance().catch((err) => console.error("[jobs]", err));
  }, DAY_MS);
}
