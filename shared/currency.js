/**
 * Item rows keep their native shop/listing currency.
 * Settle mode / order totals convert to EUR via toEurAmount().
 */
export const DISPLAY_CURRENCY = "EUR";

/**
 * 1 unit of foreign currency → EUR (settle / fallback FX).
 * Approx mid-market; Discogs listings prefer API EUR when available.
 */
const TO_EUR_FROM = {
  EUR: 1,
  USD: 0.86,
  GBP: 1.164,
  CAD: 0.63,
  AUD: 0.57,
  JPY: 0.0058,
  CHF: 1.07,
  MXN: 0.046,
  BRL: 0.16,
  NZD: 0.52,
  SEK: 0.091,
  ZAR: 0.05,
};

export function toEurAmount(value, currency) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return null;
  const amount = Number(value);
  const cur = (currency || DISPLAY_CURRENCY).toUpperCase();
  const rate = TO_EUR_FROM[cur];
  if (rate == null) return amount;
  return Math.round(amount * rate * 100) / 100;
}

/** Convert for totals/settle; prefer keeping native prices in DB instead. */
export function toEurPrice(value, currency) {
  const eur = toEurAmount(value, currency);
  if (eur == null) return { value: null, currency: DISPLAY_CURRENCY };
  return { value: eur, currency: DISPLAY_CURRENCY };
}

/** Normalize a scraped amount without FX — store as-is for settle conversion later. */
export function nativePrice(value, currency = DISPLAY_CURRENCY) {
  if (value == null || value === "" || Number.isNaN(Number(value))) {
    return { value: null, currency: (currency || DISPLAY_CURRENCY).toUpperCase() };
  }
  return {
    value: Math.round(Number(value) * 100) / 100,
    currency: (currency || DISPLAY_CURRENCY).toUpperCase(),
  };
}

export function normalizeLinkPricesToEur(link) {
  if (!link) return link;
  const { value, currency } = toEurPrice(link.price_value, link.price_currency);
  return {
    ...link,
    price_value: value,
    price_currency: currency,
  };
}
