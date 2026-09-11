/** Normalize and build PayPal.me payment links. */

const HANDLE_RE = /^[a-zA-Z0-9._-]{3,64}$/;

/**
 * Accepts a handle or full paypal.me / paypal.com/paypalme URL.
 * @returns {string|null} canonical handle, or null if invalid
 */
export function normalizePaypalMe(raw) {
  if (raw == null) return null;
  let value = String(raw).trim();
  if (!value) return null;

  value = value.replace(/^@+/, "");

  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();
      const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (host === "paypal.me" && parts[0]) {
        value = parts[0];
      } else if (
        (host === "paypal.com" || host.endsWith(".paypal.com")) &&
        parts[0]?.toLowerCase() === "paypalme" &&
        parts[1]
      ) {
        value = parts[1];
      } else {
        return null;
      }
    } else if (/^paypal\.me\//i.test(value)) {
      value = value.replace(/^paypal\.me\//i, "").split("/")[0];
    } else if (/^(www\.)?paypal\.com\/paypalme\//i.test(value)) {
      value = value.replace(/^(www\.)?paypal\.com\/paypalme\//i, "").split("/")[0];
    }
  } catch {
    return null;
  }

  value = value.split(/[/?#]/)[0].trim();
  if (!HANDLE_RE.test(value)) return null;
  return value;
}

export function paypalMeProfileUrl(handle) {
  const normalized = normalizePaypalMe(handle);
  if (!normalized) return null;
  return `https://www.paypal.com/paypalme/${encodeURIComponent(normalized)}`;
}

/**
 * @param {string} handle
 * @param {number} amount
 * @param {string} [currency="EUR"]
 */
export function paypalMePaymentUrl(handle, amount, currency = "EUR") {
  const normalized = normalizePaypalMe(handle);
  if (!normalized) return null;
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const cur = String(currency || "EUR").toUpperCase().replace(/[^A-Z]/g, "") || "EUR";
  const rounded = (Math.round(n * 100) / 100).toFixed(2);
  return `https://www.paypal.com/paypalme/${encodeURIComponent(normalized)}/${rounded}${cur}`;
}
