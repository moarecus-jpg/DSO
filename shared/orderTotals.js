import { DISPLAY_CURRENCY, normalizeLinkPricesToEur, toEurAmount } from "./currency.js";

const CURRENCY_SYMBOL = { EUR: "€", USD: "$", GBP: "£" };

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

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

export function resolveShippingMode(session = {}) {
  const mode = session.shipping_mode ?? session.shippingMode;
  return mode === "by_items" ? "by_items" : "equal";
}

/** Allocate shipping across members; last row absorbs rounding remainder. */
export function allocateShippingShares(memberRows, shipping, mode, splitCount) {
  const rows = memberRows.map((row) => ({ ...row }));
  if (!(shipping > 0) || rows.length === 0) {
    return rows.map((row) => ({
      ...row,
      shippingShare: 0,
      due: round2(row.total),
    }));
  }

  if (mode === "by_items") {
    const totalRecords = rows.reduce((sum, row) => sum + row.count, 0);
    if (totalRecords <= 0) {
      return rows.map((row) => ({
        ...row,
        shippingShare: 0,
        due: round2(row.total),
      }));
    }

    let allocated = 0;
    return rows.map((row, index) => {
      let share;
      if (index === rows.length - 1) {
        share = round2(shipping - allocated);
      } else {
        share = round2((shipping * row.count) / totalRecords);
        allocated = round2(allocated + share);
      }
      return {
        ...row,
        shippingShare: share,
        due: round2(row.total + share),
      };
    });
  }

  const people =
    splitCount != null && splitCount !== "" && Number(splitCount) >= 1
      ? Math.floor(Number(splitCount))
      : rows.length;
  const equalShare = people > 0 ? round2(shipping / people) : 0;

  return rows.map((row) => ({
    ...row,
    shippingShare: equalShare,
    due: round2(row.total + equalShare),
  }));
}

export function computeMemberTotals(links = [], session = {}) {
  const byUser = new Map();
  const settledByUser = new Map();

  for (const member of session.members ?? []) {
    if (member?.id != null && member.settled_at) {
      settledByUser.set(member.id, member.settled_at);
    }
  }

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
        settled: Boolean(
          link.user_id != null && settledByUser.has(link.user_id)
        ),
        settledAt:
          link.user_id != null ? settledByUser.get(link.user_id) ?? null : null,
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

  const baseRows = [...byUser.values()].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const shipping =
    toEurAmount(
      session.shipping_value ?? session.shippingValue,
      session.shipping_currency ?? session.shippingCurrency ?? DISPLAY_CURRENCY
    ) ?? 0;
  const mode = resolveShippingMode(session);
  const splitRaw = session.shipping_split_count ?? session.shippingSplitCount;

  return allocateShippingShares(baseRows, shipping, mode, splitRaw);
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
  const shippingMode = resolveShippingMode(session);

  const splitRaw = session.shipping_split_count ?? session.shippingSplitCount;
  const splitCount =
    splitRaw != null && splitRaw !== "" && Number(splitRaw) >= 1
      ? Math.floor(Number(splitRaw))
      : null;

  let shippingPerPerson = null;
  if (shipping > 0) {
    if (shippingMode === "by_items") {
      const totalRecords = links.length;
      shippingPerPerson =
        totalRecords > 0 ? round2(shipping / totalRecords) : null;
    } else if (splitCount) {
      shippingPerPerson = round2(shipping / splitCount);
    }
  }

  return {
    itemsTotal,
    shipping,
    shippingCurrency: DISPLAY_CURRENCY,
    shippingSplitCount: splitCount,
    shippingMode,
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
    memberTotals: computeMemberTotals(links, session),
    orderGrandTotal: computeOrderGrandTotal(links, session),
  };
}
