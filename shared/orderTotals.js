import { DISPLAY_CURRENCY, normalizeLinkPricesToEur, toEurAmount } from "./currency.js";

const CURRENCY_SYMBOL = { EUR: "€", USD: "$", GBP: "£" };

export function formatPrice(value, currency = DISPLAY_CURRENCY) {
  if (value == null || Number.isNaN(value)) return "—";
  const sym = CURRENCY_SYMBOL[currency] ?? currency;
  const amount = Number(value).toFixed(2);
  return sym === currency ? `${currency} ${amount}` : `${sym}${amount}`;
}

export function listingIdFor(link) {
  if (link.listing_id != null) return String(link.listing_id);
  const m = link.url?.match(/\/(?:sell|shop)\/item\/(\d+)/i);
  return m ? m[1] : "—";
}

export function platCountLabel(n) {
  if (n === 1) return "1 plato";
  if (n === 2) return "2 plati";
  if (n === 3 || n === 4) return `${n} plati`;
  return `${n} platov`;
}

export function formatGrading(link) {
  const media = link.media_condition ?? link.mediaCondition;
  const sleeve = link.sleeve_condition ?? link.sleeveCondition;
  if (media && sleeve) return `${media} / ${sleeve}`;
  return media || sleeve || "—";
}

export function recordTitle(link) {
  const desc = link.item_description ?? link.itemDescription;
  if (desc) return desc;
  if (link.label && !link.note) return link.label;
  if (link.artist && link.title) return `${link.artist} — ${link.title}`;
  return link.label || link.url;
}

export function computeMemberTotals(links = []) {
  const byUser = new Map();

  for (const link of links) {
    const key = `${link.user_id ?? ""}\0${link.user_name ?? "Neznan"}`;
    if (!byUser.has(key)) {
      byUser.set(key, {
        userId: link.user_id,
        name: link.user_name ?? "Neznan",
        count: 0,
        total: 0,
        currency: DISPLAY_CURRENCY,
        hasUnknownPrice: false,
      });
    }
    const row = byUser.get(key);
    row.count += 1;
    const eur = toEurAmount(link.price_value, link.price_currency);
    if (eur != null) {
      row.total += eur;
    } else {
      row.hasUnknownPrice = true;
    }
  }

  return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function computeOrderGrandTotal(links = [], session = {}) {
  let itemsTotal = 0;
  let hasUnknown = false;

  for (const link of links) {
    const eur = toEurAmount(link.price_value, link.price_currency);
    if (eur != null) {
      itemsTotal += eur;
    } else if (link.price_value != null && !Number.isNaN(Number(link.price_value))) {
      hasUnknown = true;
    } else if (link.price_value == null) {
      hasUnknown = true;
    }
  }

  const shipRaw = session.shipping_value ?? session.shippingValue;
  const shippingCurrency =
    session.shipping_currency ?? session.shippingCurrency ?? DISPLAY_CURRENCY;
  const shipping = toEurAmount(shipRaw, shippingCurrency) ?? 0;

  const splitRaw = session.shipping_split_count ?? session.shippingSplitCount;
  const splitCount =
    splitRaw != null && splitRaw !== "" && Number(splitRaw) >= 1
      ? Math.floor(Number(splitRaw))
      : null;
  const shippingPerPerson =
    splitCount && shipping > 0
      ? Math.round((shipping / splitCount) * 100) / 100
      : null;

  return {
    itemsTotal,
    shipping,
    shippingCurrency: DISPLAY_CURRENCY,
    shippingSplitCount: splitCount,
    shippingPerPerson,
    total: itemsTotal + shipping,
    currency: DISPLAY_CURRENCY,
    hasUnknown,
    count: links.length,
  };
}

export function enrichSessionOrder(session) {
  const links = (session.links ?? []).map(normalizeLinkPricesToEur);
  return {
    ...session,
    links,
    memberTotals: computeMemberTotals(links),
    orderGrandTotal: computeOrderGrandTotal(links, session),
  };
}
