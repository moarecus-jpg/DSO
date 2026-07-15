const TECHNICAL_ERROR =
  /Exception|^\s*at\s|\.js:\d|IndexOutOfRange|TypeError|ReferenceError|SyntaxError|ECONNREFUSED|ENOTFOUND|SQLITE_/i;

export function publicErrorMessage(err, fallback) {
  const msg = typeof err === "string" ? err : err?.message;
  if (!msg || TECHNICAL_ERROR.test(msg)) {
    if (err && typeof err !== "string") {
      console.error("[publicError]", err);
    }
    return fallback;
  }
  return msg;
}
