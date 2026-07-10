import { discogsAddToCartUrl, discogsCartUrl } from "../../shared/discogsUrls.js";
import { listingIdFor } from "../../shared/orderTotals.js";

const DEFAULT_DELAY_MS = 1400;
const HELPER_NAME = "dso_discogs_cart_helper";

function uniqueListingIds(links) {
  const ids = new Set();
  for (const link of links ?? []) {
    const id = listingIdFor(link);
    if (id && id !== "—") ids.add(id);
  }
  return [...ids];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openHelperWindow() {
  return window.open(
    "about:blank",
    HELPER_NAME,
    "width=1,height=1,left=-2400,top=-2400"
  );
}

function revealCartWindow(helper) {
  try {
    helper.resizeTo(Math.min(1200, screen.availWidth - 80), Math.min(860, screen.availHeight - 80));
    helper.moveTo(
      Math.max(0, Math.round((screen.availWidth - 1200) / 2)),
      Math.max(0, Math.round((screen.availHeight - 860) / 2))
    );
    helper.focus();
  } catch {
    helper.focus();
  }
}

/**
 * Navigates a single off-screen helper window through each Discogs add-to-cart URL,
 * then opens the cart in that same window when finished.
 */
export async function addAllListingsToDiscogsCart(
  links,
  { delayMs = DEFAULT_DELAY_MS, onProgress } = {}
) {
  const ids = uniqueListingIds(links);
  if (!ids.length) {
    return { ok: false, reason: "empty" };
  }

  const helper = openHelperWindow();
  if (!helper) {
    return { ok: false, reason: "popup_blocked" };
  }

  try {
    for (let i = 0; i < ids.length; i += 1) {
      onProgress?.({ current: i + 1, total: ids.length });
      helper.location.replace(discogsAddToCartUrl(ids[i]));
      await wait(delayMs);
    }

    helper.location.replace(discogsCartUrl());
    revealCartWindow(helper);
    return { ok: true, count: ids.length };
  } catch {
    try {
      helper.close();
    } catch {
      /* ignore */
    }
    return { ok: false, reason: "failed" };
  }
}

export { uniqueListingIds };
