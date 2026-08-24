export const SESSION_OPEN = "open";
export const SESSION_CLOSED = "closed";
export const SESSION_UNPLACED = "unplaced";
export const SESSION_AUTO_CLOSED = "auto_closed";

export function isOpenSession(status) {
  return (status ?? SESSION_OPEN) === SESSION_OPEN;
}

export function isArchivedSession(status) {
  return !isOpenSession(status);
}

export function isReopenableSession(status) {
  return status === SESSION_UNPLACED || status === SESSION_AUTO_CLOSED;
}

export function sessionListPath(status) {
  if (status === SESSION_CLOSED) return "/closed";
  if (isReopenableSession(status)) return "/unplaced";
  return "/";
}

export function sessionListNavKey(status) {
  if (status === SESSION_CLOSED) return "nav.closedOrders";
  if (isReopenableSession(status)) return "nav.unplacedOrders";
  return "nav.openOrders";
}

export function sessionStatusNoteKey(status) {
  if (status === SESSION_UNPLACED) return "session.unplacedNote";
  if (status === SESSION_AUTO_CLOSED) return "session.autoClosedNote";
  if (status === SESSION_CLOSED) return "session.closedNote";
  return null;
}

export function sessionStatusAppearance(status) {
  if (status === SESSION_UNPLACED) {
    return { className: "status-pill-v2-unplaced", labelKey: "common.unplaced" };
  }
  if (status === SESSION_AUTO_CLOSED) {
    return { className: "status-pill-v2-auto", labelKey: "common.autoClosed" };
  }
  if (status === SESSION_CLOSED) {
    return { className: "status-pill-v2-closed", labelKey: "common.closed" };
  }
  return { className: "status-pill-v2-open", labelKey: "common.open" };
}
