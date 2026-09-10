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
    if (!code) continue;
    const url = parsed.valid ? parsed.canonicalUrl : href;
    items.push({
      linkId: link.id,
      code: String(code),
      url,
    });
  }
  return items;
}

/**
 * Bookmarklet on decks.de:
 * 1) read #t-price from each product page (iframe) — matches what you see
 * 2) fall back to getPrice.php
 * 3) form-POST results to DCO (no CORS) and redirect back
 */
export function buildDecksPriceSyncBookmarklet({
  applyUrl,
  token,
  items,
  returnUrl = null,
}) {
  const script = `(() => {
  const items = ${JSON.stringify(items)};
  const applyUrl = ${JSON.stringify(applyUrl)};
  const token = ${JSON.stringify(token)};
  const returnUrl = ${JSON.stringify(returnUrl)};

  function onDecks() {
    return /(^|\\.)decks\\.de$/i.test(location.hostname);
  }
  if (!onDecks()) {
    alert("Najprej odpri https://www.decks.de/ nato znova klikni zaznamek.");
    location.href = "https://www.decks.de/";
    return;
  }

  function parsePrice(raw) {
    const n = Number(String(raw ?? "").replace(/\\*/g, "").replace(",", ".").replace(/[^\\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function rpcPrice(code) {
    return fetch("/decks/rpc/getPrice.php?id=" + encodeURIComponent(code), {
      credentials: "same-origin",
      headers: {
        Accept: "application/json, text/javascript, */*",
        "X-Requested-With": "XMLHttpRequest",
      },
    })
      .then((r) => r.json())
      .then((d) => parsePrice(d && d.price))
      .catch(() => null);
  }

  function domPrice(url) {
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.setAttribute("style", "position:fixed;left:-9999px;width:1px;height:1px;opacity:0");
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        try { iframe.remove(); } catch (_) {}
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), 12000);
      iframe.onload = () => {
        let tries = 0;
        const tick = () => {
          tries += 1;
          try {
            const doc = iframe.contentDocument;
            const t =
              doc &&
              (doc.querySelector("#t-price") || doc.querySelector("#t-pricenetto"));
            const n = parsePrice(t && t.textContent);
            if (n != null) {
              clearTimeout(timer);
              finish(n);
              return;
            }
            const body = (doc && doc.body && doc.body.innerText) || "";
            const m = body.match(/(\\d+[.,]\\d{2})\\s*EUR/i);
            const fromBody = parsePrice(m && m[1]);
            if (fromBody != null) {
              clearTimeout(timer);
              finish(fromBody);
              return;
            }
          } catch (_) {}
          if (tries >= 20) {
            clearTimeout(timer);
            finish(null);
            return;
          }
          setTimeout(tick, 400);
        };
        setTimeout(tick, 600);
      };
      iframe.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };
      iframe.src = url;
      document.body.appendChild(iframe);
    });
  }

  (async () => {
    const prices = {};
    let ok = 0;
    for (const item of items) {
      const fromDom = item.url ? await domPrice(item.url) : null;
      const fromRpc = await rpcPrice(item.code);
      // Prefer the higher amount when both exist: EU gross > export net/US.
      let chosen = null;
      if (fromDom != null && fromRpc != null) chosen = Math.max(fromDom, fromRpc);
      else chosen = fromDom != null ? fromDom : fromRpc;
      if (chosen != null) {
        prices[item.code] = chosen;
        ok += 1;
      }
    }

    if (!ok) {
      alert("Nobene cene ni bilo mogoče prebrati z decks.de.");
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = applyUrl;
    form.acceptCharset = "UTF-8";
    const add = (name, value) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };
    add("token", token);
    add("prices", JSON.stringify(prices));
    if (returnUrl) add("returnUrl", returnUrl);
    document.body.appendChild(form);
    form.submit();
  })().catch((e) => alert(String(e)));
})();`;

  return `javascript:${encodeURIComponent(script)}`;
}

export function decksPriceSyncSupported(store) {
  return normalizeStore(store) === STORE_DECKS;
}
