import { displayOrderTitle } from "./orderTitle.js";

export const ORDER_SEARCH_MODES = ["creator", "seller"];

export function orderSearchTitle(session) {
  return displayOrderTitle(session);
}

export function filterSessions(sessions, { query = "", searchMode = "creator" } = {}) {
  const q = query.trim().toLowerCase();
  if (!q) return sessions;

  return sessions.filter((session) => {
    const title = orderSearchTitle(session).toLowerCase();
    const seller = session.seller_username?.toLowerCase() ?? "";
    const creatorName = session.creator_name?.toLowerCase() ?? "";
    const creatorUsername = session.creator_username?.toLowerCase() ?? "";

    if (searchMode === "seller") {
      return title.includes(q) || seller.includes(q);
    }

    return creatorName.includes(q) || creatorUsername.includes(q);
  });
}
