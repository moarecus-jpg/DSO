import { junoAddToCartUrls, SHOP_CART_URL } from "../../shared/shopCart.js";
import { STORE_JUNO } from "../../shared/stores.js";

const DEFAULT_DELAY_MS = 1400;
const HELPER_NAME = "dso_juno_cart_helper";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Juno exposes Discogs-like deep links: /cart/add/{titleId}/{variant}/
 */
export async function addAllItemsToJunoCart(
  links,
  { delayMs = DEFAULT_DELAY_MS, onProgress } = {}
) {
  const urls = junoAddToCartUrls(links);
  if (!urls.length) return { ok: false, reason: "empty" };

  const helper = window.open("about:blank", HELPER_NAME);
  if (!helper) return { ok: false, reason: "popup_blocked" };

  try {
    for (let i = 0; i < urls.length; i += 1) {
      onProgress?.({ current: i + 1, total: urls.length });
      helper.location.replace(urls[i]);
      await wait(delayMs);
    }
    helper.location.replace(SHOP_CART_URL[STORE_JUNO]);
    try {
      helper.focus();
    } catch {
      /* ignore */
    }
    return { ok: true, count: urls.length };
  } catch {
    try {
      helper.close();
    } catch {
      /* ignore */
    }
    return { ok: false, reason: "failed" };
  }
}

export { junoAddToCartUrls };
