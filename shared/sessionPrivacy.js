import { enrichSessionOrder } from "./orderTotals.js";

function truthy(value) {
  return value === true || value === 1 || value === "1";
}

export function shouldBlurLinkForViewer(link, viewerId, isOrderAdmin) {
  if (isOrderAdmin) return false;
  if (!viewerId || link.user_id === viewerId) return false;
  return truthy(link.orderer_hide_records);
}

export function blurLinkForViewer(link, viewerId, isOrderAdmin) {
  if (!shouldBlurLinkForViewer(link, viewerId, isOrderAdmin)) {
    return { ...link, blurred: false };
  }

  return {
    ...link,
    blurred: true,
    url: null,
    listing_id: null,
    artist: null,
    title: null,
    label: null,
    note: null,
    item_description: null,
    price_value: null,
    price_currency: null,
    media_condition: null,
    sleeve_condition: null,
  };
}

export function sessionForViewer(session, viewerId, isOrderAdmin) {
  const links = (session.links ?? []).map((link) =>
    blurLinkForViewer(link, viewerId, isOrderAdmin)
  );
  const blurredLinkIds = new Set(
    links.filter((link) => link.blurred).map((link) => link.id)
  );
  const hiddenItemCount = blurredLinkIds.size;
  const issues = (session.issues ?? []).filter(
    (issue) => !blurredLinkIds.has(issue.link_id)
  );
  const linksForTotals = isOrderAdmin
    ? session.links ?? []
    : links.filter((link) => !link.blurred);

  const enriched = enrichSessionOrder({ ...session, links: linksForTotals });

  if (!isOrderAdmin && enriched.orderGrandTotal) {
    const viewerRow = enriched.memberTotals?.find(
      (row) => row.userId === viewerId
    );
    const share =
      viewerRow?.shippingShare ??
      enriched.orderGrandTotal.shippingPerPerson ??
      0;
    enriched.orderGrandTotal = {
      ...enriched.orderGrandTotal,
      shipping: share,
      total: enriched.orderGrandTotal.itemsTotal + share,
    };
  }

  return {
    ...session,
    links,
    issues,
    memberTotals: enriched.memberTotals,
    orderGrandTotal: enriched.orderGrandTotal,
    canSeeAllItems: isOrderAdmin,
    hiddenItemCount,
  };
}
