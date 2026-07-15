const TECHNICAL_ERROR =
  /Exception|^\s*at\s|\.js:\d|IndexOutOfRange|TypeError|ReferenceError|SyntaxError|ECONNREFUSED|ENOTFOUND|SQLITE_|stack trace/i;

export function isTechnicalError(message) {
  if (typeof message !== "string") return true;
  const trimmed = message.trim();
  if (!trimmed) return true;
  return TECHNICAL_ERROR.test(trimmed);
}

export function sanitizeUserError(message, fallback = "Error") {
  if (!message || isTechnicalError(message)) {
    if (message && isTechnicalError(message)) {
      console.error("[sanitizeUserError]", message);
    }
    return fallback;
  }
  return message;
}

export function isValidShippingNumber(value) {
  if (value == null || value === "") return true;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return true;
  const n = Number(normalized);
  return !Number.isNaN(n) && n >= 0;
}

export function normalizeShippingNumber(value) {
  if (value == null || value === "") return null;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized || !isValidShippingNumber(normalized)) return null;
  return Number(normalized);
}
