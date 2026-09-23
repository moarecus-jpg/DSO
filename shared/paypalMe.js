/** Normalize and build PayPal.me / PayPal email payment links. */

const HANDLE_RE = /^[a-zA-Z0-9._-]{3,64}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/**
 * @typedef {{ kind: 'handle' | 'email', value: string }} PaypalTarget
 */

/**
 * Accepts a PayPal.me handle, paypal.me URL, or PayPal account email.
 * @returns {PaypalTarget|null}
 */
export function parsePaypalTarget(raw) {
  if (raw == null) return null;
  let value = String(raw).trim();
  if (!value) return null;

  value = value.replace(/^@+/, "");

  // Bare email (or mailto:)
  const maybeEmail = value.replace(/^mailto:/i, "").trim();
  if (EMAIL_RE.test(maybeEmail)) {
    return { kind: "email", value: maybeEmail.toLowerCase() };
  }

  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();
      const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (host === "paypal.me" && parts[0]) {
        value = decodeURIComponent(parts[0]);
      } else if (
        (host === "paypal.com" || host.endsWith(".paypal.com")) &&
        parts[0]?.toLowerCase() === "paypalme" &&
        parts[1]
      ) {
        value = decodeURIComponent(parts[1]);
      } else {
        return null;
      }
    } else if (/^paypal\.me\//i.test(value)) {
      value = value.replace(/^paypal\.me\//i, "").split("/")[0];
      value = decodeURIComponent(value);
    } else if (/^(www\.)?paypal\.com\/paypalme\//i.test(value)) {
      value = value.replace(/^(www\.)?paypal\.com\/paypalme\//i, "").split("/")[0];
      value = decodeURIComponent(value);
    }
  } catch {
    return null;
  }

  value = value.split(/[/?#]/)[0].trim();
  if (EMAIL_RE.test(value)) {
    return { kind: "email", value: value.toLowerCase() };
  }
  if (!HANDLE_RE.test(value)) return null;
  return { kind: "handle", value };
}

/**
 * Accepts a handle, paypal.me URL, or email.
 * @returns {string|null} canonical handle or email for storage
 */
export function normalizePaypalMe(raw) {
  const parsed = parsePaypalTarget(raw);
  return parsed?.value ?? null;
}

export function paypalMeProfileUrl(handleOrEmail) {
  const parsed = parsePaypalTarget(handleOrEmail);
  if (!parsed) return null;
  if (parsed.kind === "email") {
    return `https://www.paypal.com/paypalme/${encodeURIComponent(parsed.value)}`;
  }
  return `https://www.paypal.com/paypalme/${encodeURIComponent(parsed.value)}`;
}

/**
 * @param {string} handleOrEmail
 * @param {number} amount
 * @param {string} [currency="EUR"]
 */
export function paypalMePaymentUrl(handleOrEmail, amount, currency = "EUR") {
  const parsed = parsePaypalTarget(handleOrEmail);
  if (!parsed) return null;
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const cur = String(currency || "EUR").toUpperCase().replace(/[^A-Z]/g, "") || "EUR";
  const rounded = (Math.round(n * 100) / 100).toFixed(2);

  if (parsed.kind === "email") {
    const params = new URLSearchParams({
      cmd: "_xclick",
      business: parsed.value,
      currency_code: cur,
      amount: rounded,
      item_name: "Group order",
    });
    return `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
  }

  return `https://www.paypal.com/paypalme/${encodeURIComponent(parsed.value)}/${rounded}${cur}`;
}

/** Short display label for a stored PayPal target. */
export function formatPaypalDisplay(handleOrEmail) {
  const parsed = parsePaypalTarget(handleOrEmail);
  if (!parsed) return null;
  if (parsed.kind === "email") return parsed.value;
  return `paypal.me/${parsed.value}`;
}
