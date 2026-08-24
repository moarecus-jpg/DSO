export const SESSION_OPEN = "open";
export const SESSION_CLOSED = "closed";
export const SESSION_UNPLACED = "unplaced";
export const SESSION_AUTO_CLOSED = "auto_closed";
export const SESSION_CANCELED = "canceled";

export const SESSION_STATUSES = [
  SESSION_OPEN,
  SESSION_CLOSED,
  SESSION_UNPLACED,
  SESSION_AUTO_CLOSED,
  SESSION_CANCELED,
];

export function isValidSessionStatus(status) {
  return SESSION_STATUSES.includes(status);
}

export function closeReasonForStatus(status) {
  if (status === SESSION_OPEN) return null;
  if (status === SESSION_UNPLACED) return "unplaced";
  if (status === SESSION_AUTO_CLOSED) return "auto";
  if (status === SESSION_CANCELED) return "canceled";
  if (status === SESSION_CLOSED) return "manual";
  return null;
}

export function isOpenSession(status) {
  return (status ?? SESSION_OPEN) === SESSION_OPEN;
}

export function isArchivedSession(status) {
  return !isOpenSession(status);
}

export function isReopenableSession(status) {
  return (
    status === SESSION_UNPLACED ||
    status === SESSION_AUTO_CLOSED ||
    status === SESSION_CANCELED
  );
}

export function sessionListPath(status) {
  if (status === SESSION_CLOSED) return "/closed";
  if (status === SESSION_CANCELED) return "/canceled";
  if (status === SESSION_UNPLACED || status === SESSION_AUTO_CLOSED) {
    return "/unplaced";
  }
  return "/";
}

export function sessionListNavKey(status) {
  if (status === SESSION_CLOSED) return "nav.closedOrders";
  if (status === SESSION_CANCELED) return "nav.canceledOrders";
  if (status === SESSION_UNPLACED || status === SESSION_AUTO_CLOSED) {
    return "nav.unplacedOrders";
  }
  return "nav.openOrders";
}

export function sessionStatusNoteKey(status) {
  if (status === SESSION_UNPLACED) return "session.unplacedNote";
  if (status === SESSION_AUTO_CLOSED) return "session.autoClosedNote";
  if (status === SESSION_CANCELED) return "session.canceledNote";
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
  if (status === SESSION_CANCELED) {
    return { className: "status-pill-v2-canceled", labelKey: "common.canceled" };
  }
  if (status === SESSION_CLOSED) {
    return { className: "status-pill-v2-closed", labelKey: "common.closed" };
  }
  return { className: "status-pill-v2-open", labelKey: "common.open" };
}
