import { DISPLAY_CURRENCY, toEurAmount } from "./currency.js";
import { resolveShippingMode } from "./orderTotals.js";

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function monthKey(isoDate) {
  if (!isoDate) return null;
  return String(isoDate).slice(0, 7);
}

function yearKey(isoDate) {
  if (!isoDate) return null;
  return String(isoDate).slice(0, 4);
}

function emptyPeriod(period) {
  return {
    period,
    itemsTotal: 0,
    shippingTotal: 0,
    grandTotal: 0,
    itemCount: 0,
    orderCount: 0,
  };
}

function bumpBucket(map, key, { items = 0, shipping = 0, itemCount = 0, orderCount = 0 }) {
  if (!key) return;
  if (!map.has(key)) {
    map.set(key, emptyPeriod(key));
  }
  const bucket = map.get(key);
  bucket.itemsTotal = round2(bucket.itemsTotal + items);
  bucket.shippingTotal = round2(bucket.shippingTotal + shipping);
  bucket.grandTotal = round2(bucket.itemsTotal + bucket.shippingTotal);
  bucket.itemCount += itemCount;
  bucket.orderCount += orderCount;
}

/**
 * Shipping share for the current user's participation in a session.
 * For by_items, pass userItemCount (and sessionItemCount on the row).
 */
export function shippingShareForSession(session, userItemCount = null) {
  const shipping =
    toEurAmount(
      session.shipping_value ?? session.shippingValue,
      session.shipping_currency ?? session.shippingCurrency
    ) ?? 0;
  if (shipping <= 0) return 0;

  const mode = resolveShippingMode(session);
  if (mode === "by_items") {
    const sessionItems = Number(
      session.session_item_count ?? session.sessionItemCount ?? 0
    );
    const userItems = Number(
      userItemCount ?? session.user_item_count ?? session.userItemCount ?? 0
    );
    if (!(sessionItems > 0) || !(userItems > 0)) return 0;
    return round2((shipping * userItems) / sessionItems);
  }

  const splitRaw = session.shipping_split_count ?? session.shippingSplitCount;
  const splitCount =
    splitRaw != null && splitRaw !== "" && Number(splitRaw) >= 1
      ? Math.floor(Number(splitRaw))
      : null;
  if (!splitCount) return 0;
  return round2(shipping / splitCount);
}

export function computeUserStatistics(rows = []) {
  const sessionMeta = new Map();
  const monthBuckets = new Map();
  const yearBuckets = new Map();

  let itemsTotal = 0;
  let itemCount = 0;
  let hasUnknownPrice = false;

  for (const row of rows) {
    const sessionId = row.session_id ?? row.sessionId;
    if (!sessionMeta.has(sessionId)) {
      sessionMeta.set(sessionId, {
        row,
        userItemCount: 0,
        month: monthKey(row.session_created_at ?? row.sessionCreatedAt),
        year: yearKey(row.session_created_at ?? row.sessionCreatedAt),
      });
    }
    sessionMeta.get(sessionId).userItemCount += 1;

    const eur = toEurAmount(row.price_value ?? row.priceValue, row.price_currency ?? row.priceCurrency);
    const itemMonth = monthKey(row.created_at ?? row.item_created_at ?? row.orderedAt);
    const itemYear = yearKey(row.created_at ?? row.item_created_at ?? row.orderedAt);

    if (eur != null) {
      itemsTotal = round2(itemsTotal + eur);
      bumpBucket(monthBuckets, itemMonth, { items: eur, itemCount: 1 });
      bumpBucket(yearBuckets, itemYear, { items: eur, itemCount: 1 });
    } else {
      hasUnknownPrice = true;
      bumpBucket(monthBuckets, itemMonth, { itemCount: 1 });
      bumpBucket(yearBuckets, itemYear, { itemCount: 1 });
    }
    itemCount += 1;
  }

  let shippingTotal = 0;
  for (const { row, userItemCount, month, year } of sessionMeta.values()) {
    const share = shippingShareForSession(row, userItemCount);
    shippingTotal = round2(shippingTotal + share);
    bumpBucket(monthBuckets, month, { shipping: share, orderCount: 1 });
    bumpBucket(yearBuckets, year, { shipping: share, orderCount: 1 });
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = String(now.getFullYear());

  function sortPeriods(map) {
    return [...map.values()].sort((a, b) => b.period.localeCompare(a.period));
  }

  return {
    summary: {
      itemsTotal,
      shippingTotal,
      grandTotal: round2(itemsTotal + shippingTotal),
      itemCount,
      orderCount: sessionMeta.size,
      currency: DISPLAY_CURRENCY,
      hasUnknownPrice,
    },
    currentMonth: monthBuckets.get(currentMonth) ?? emptyPeriod(currentMonth),
    currentYear: yearBuckets.get(currentYear) ?? emptyPeriod(currentYear),
    byMonth: sortPeriods(monthBuckets),
    byYear: sortPeriods(yearBuckets),
  };
}
