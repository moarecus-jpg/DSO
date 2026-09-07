import { displayOrderTitle } from "./orderTitle.js";
import { sessionTimestamp } from "./orderDashboard.js";

export const ORDER_SEARCH_MODES = ["creator", "seller"];
export const ORDER_DATE_RANGES = ["any", "today", "week", "month"];

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

function startOfLocalMonth(now = Date.now()) {
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

export function dateRangeStart(dateRange, now = Date.now()) {
  switch (dateRange) {
    case "today":
      return startOfLocalDay(now);
    case "week":
      return now - 7 * DAY_MS;
    case "month":
      return startOfLocalMonth(now);
    default:
      return null;
  }
}

export function sessionMatchesDateRange(session, dateRange = "any", now = Date.now()) {
  const start = dateRangeStart(dateRange, now);
  if (start == null) return true;
  return sessionTimestamp(session?.created_at) >= start;
}

export function orderSearchTitle(session) {
  return displayOrderTitle(session);
}

export function filterSessions(
  sessions,
  { query = "", searchMode = "creator", dateRange = "any" } = {}
) {
  const q = query.trim().toLowerCase();
  const mode = ORDER_SEARCH_MODES.includes(searchMode) ? searchMode : "creator";
  const range = ORDER_DATE_RANGES.includes(dateRange) ? dateRange : "any";

  return sessions.filter((session) => {
    if (!sessionMatchesDateRange(session, range)) return false;
    if (!q) return true;

    const title = orderSearchTitle(session).toLowerCase();
    const seller = session.seller_username?.toLowerCase() ?? "";
    const creatorName = session.creator_name?.toLowerCase() ?? "";
    const creatorUsername = session.creator_username?.toLowerCase() ?? "";

    if (mode === "seller") {
      return title.includes(q) || seller.includes(q);
    }

    return creatorName.includes(q) || creatorUsername.includes(q);
  });
}
