/** All prices in the app are shown and summed in EUR. */
export const DISPLAY_CURRENCY = "EUR";

/** 1 unit of foreign currency → EUR (približni tečaji). */
const TO_EUR_FROM = {
  EUR: 1,
  USD: 0.93,
  GBP: 1.17,
  CAD: 0.68,
  AUD: 0.61,
  JPY: 0.0062,
  CHF: 1.05,
  MXN: 0.052,
  BRL: 0.17,
  NZD: 0.56,
  SEK: 0.088,
  ZAR: 0.051,
};

export function toEurAmount(value, currency) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return null;
  const amount = Number(value);
  const cur = (currency || DISPLAY_CURRENCY).toUpperCase();
  const rate = TO_EUR_FROM[cur];
  if (rate == null) return amount;
  return Math.round(amount * rate * 100) / 100;
}

export function toEurPrice(value, currency) {
  const eur = toEurAmount(value, currency);
  if (eur == null) return { value: null, currency: DISPLAY_CURRENCY };
  return { value: eur, currency: DISPLAY_CURRENCY };
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
