import { isLinkUnavailable, listingIdFor } from "../../shared/orderTotals.js";
import { hhvCartIdentifier } from "../../shared/hhvCart.js";

export function uniqueHhvProductIds(links) {
  const ids = new Set();
  for (const link of links ?? []) {
    if (isLinkUnavailable(link)) continue;
    let id = listingIdFor(link);
    if (!id || id === "—") {
      const fromUrl = String(link.url ?? "").match(/-(\d+)(?:\/?(?:\?|#|$))/);
      id = fromUrl?.[1] ?? null;
    }
    if (hhvCartIdentifier(id)) ids.add(String(id));
  }
  return [...ids];
}
