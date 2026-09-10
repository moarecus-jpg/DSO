import {
  STORE_DECKS,
  normalizeStore,
} from "./stores.js";
import { isLinkUnavailable } from "./orderTotals.js";
import { parseShopRecordUrl } from "./parseShopUrl.js";

/** Collect Decks product codes for open order links. */
export function collectDecksPriceTargets(links) {
  const items = [];
  for (const link of links ?? []) {
    if (isLinkUnavailable(link) || !link?.url) continue;
    const href = String(link.url);
    if (!/decks\.de/i.test(href)) continue;
    const parsed = parseShopRecordUrl(link.url, STORE_DECKS);
    const code = parsed.valid
      ? parsed.code || parsed.productId
      : href.replace(/\/+$/, "").split("/").filter(Boolean).pop();
    if (!code || !/\/(?:track|m)\//i.test(href)) continue;
    items.push({
      linkId: link.id,
      code: String(code),
      url: link.url,
    });
  }
  return items;
}

/**
 * Bookmarklet: on decks.de, read EU getPrice for each code and POST to DCO.
 * Uses a one-time token (no DCO session cookie required from decks.de).
 */
export function buildDecksPriceSyncBookmarklet({
  applyUrl,
  token,
  codes,
  returnUrl = null,
}) {
  const script = `(() => {
  const codes = ${JSON.stringify(codes)};
  const applyUrl = ${JSON.stringify(applyUrl)};
  const token = ${JSON.stringify(token)};
  const returnUrl = ${JSON.stringify(returnUrl)};
  if (!/(^|\\.)decks\\.de$/i.test(location.hostname)) {
    alert("Odpri to na decks.de (najprej odpri decks.de, nato klikni zaznamek).");
    location.href = "https://www.decks.de/";
    return;
  }
  (async () => {
    const prices = {};
    let ok = 0;
    for (const code of codes) {
      try {
        const res = await fetch("/decks/rpc/getPrice.php?id=" + encodeURIComponent(code), {
          credentials: "same-origin",
          headers: {
            Accept: "application/json, text/javascript, */*",
            "X-Requested-With": "XMLHttpRequest",
          },
        });
        const data = await res.json();
        const raw = String(data?.price ?? "").replace(",", ".").replace(/[^\\d.]/g, "");
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) {
          prices[code] = n;
          ok += 1;
        }
      } catch (_) {}
    }
    const res = await fetch(applyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, prices }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert("DCO sync failed: " + (body.error || res.status));
      return;
    }
    alert("Decks cene sinhronizirane: " + ok + "/" + codes.length);
    if (returnUrl) location.href = returnUrl;
  })().catch((e) => alert(String(e)));
})();`;

  return `javascript:${encodeURIComponent(script)}`;
}

export function decksPriceSyncSupported(store) {
  return normalizeStore(store) === STORE_DECKS;
}
