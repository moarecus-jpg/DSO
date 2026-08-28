const DAY_MS = 24 * 60 * 60 * 1000;
export const ATTENTION_IDLE_DAYS = 10;
export const RECENT_DAYS = 7;

export const ORDER_CHIPS = ["all", "waiting", "recent", "attention"];
export const ORDER_SORTS = ["recent", "oldest", "items", "members"];

export function sessionTimestamp(value) {
  if (!value) return 0;
  const raw = String(value);
  const normalized = raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function startOfLocalDay(now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

export function lastActivityTs(session) {
  return sessionTimestamp(session?.last_activity_at ?? session?.created_at);
}

export function isWaiting(session) {
  return (session?.link_count ?? 0) === 0;
}

export function isRecentlyActive(session, now = Date.now()) {
  return now - lastActivityTs(session) < RECENT_DAYS * DAY_MS;
}

export function isActiveToday(session, now = Date.now()) {
  return lastActivityTs(session) >= startOfLocalDay(now);
}

export function needsAttention(session, now = Date.now()) {
  if (now - lastActivityTs(session) >= ATTENTION_IDLE_DAYS * DAY_MS) return true;
  if (session?.target_date) {
    const target = new Date(`${session.target_date}T12:00:00`).getTime();
    if (!Number.isNaN(target) && target < now) return true;
  }
  return false;
}

export function computeDashboardStats(sessions, now = Date.now()) {
  let members = 0;
  let items = 0;
  let activeToday = 0;
  let attention = 0;
  for (const session of sessions) {
    members += session.member_count ?? 0;
    items += session.link_count ?? 0;
    if (isActiveToday(session, now)) activeToday += 1;
    if (needsAttention(session, now)) attention += 1;
  }
  return {
    open: sessions.length,
    members,
    items,
    activeToday,
    attention,
  };
}

export function filterSessionsByChip(sessions, chip, now = Date.now()) {
  if (chip === "waiting") return sessions.filter(isWaiting);
  if (chip === "recent") return sessions.filter((s) => isRecentlyActive(s, now));
  if (chip === "attention") return sessions.filter((s) => needsAttention(s, now));
  return sessions;
}

export function sortSessions(sessions, sort = "recent") {
  const copy = [...sessions];
  copy.sort((a, b) => {
    if (sort === "oldest") {
      return sessionTimestamp(a.created_at) - sessionTimestamp(b.created_at);
    }
    if (sort === "items") {
      return (b.link_count ?? 0) - (a.link_count ?? 0);
    }
    if (sort === "members") {
      return (b.member_count ?? 0) - (a.member_count ?? 0);
    }
    return lastActivityTs(b) - lastActivityTs(a);
  });
  return copy;
}
