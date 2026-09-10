import {
  STORE_DECKS,
  STORE_DEEJAY,
  STORE_HHV,
  STORE_JUNO,
  STORE_YOYAKU,
  getStoreConfig,
  normalizeStore,
} from "./stores.js";
import { isLinkUnavailable, listingIdFor } from "./orderTotals.js";
import { parseShopRecordUrl } from "./parseShopUrl.js";

export const SHOP_CART_HOST = {
  [STORE_HHV]: "hhv.de",
  [STORE_YOYAKU]: "yoyaku.io",
  [STORE_DECKS]: "decks.de",
  [STORE_DEEJAY]: "deejay.de",
  [STORE_JUNO]: "juno.co.uk",
};

export const SHOP_CART_URL = {
  [STORE_HHV]: "https://www.hhv.de/en/cart",
  [STORE_YOYAKU]: "https://yoyaku.io/cart/",
  [STORE_DECKS]: "https://www.decks.de/decks/order/warenkorb.php",
  [STORE_DEEJAY]: "https://www.deejay.de/m_Info/sm_Cart",
  [STORE_JUNO]: "https://www.juno.co.uk/cart/",
};

function usableLinks(links) {
  return (links ?? []).filter((link) => !isLinkUnavailable(link) && link?.url);
}

function hhvIdentifier(productId, variant = "v1") {
  const id = String(productId ?? "").trim();
  if (!id || id === "—") return null;
  if (/v\d+$/i.test(id)) return id;
  return `${id}${variant}`;
}

export function collectShopCartTargets(links, store) {
  const storeId = normalizeStore(store);
  const host = SHOP_CART_HOST[storeId];
  const items = [];

  for (const link of usableLinks(links)) {
    const href = String(link.url ?? "");
    if (host && !href.toLowerCase().includes(host)) continue;

    const parsed = parseShopRecordUrl(link.url, storeId);
    if (storeId === STORE_HHV) {
      let id = listingIdFor(link);
      if (!id || id === "—") {
        id = parsed.valid ? String(parsed.productId ?? "") : "";
      }
      const identifier = hhvIdentifier(id);
      if (identifier) items.push({ kind: "hhv", identifier, url: link.url });
      continue;
    }

    if (storeId === STORE_DEEJAY) {
      let id = listingIdFor(link);
      if (!id || id === "—") {
        id = parsed.valid ? String(parsed.productId ?? "") : "";
      }
      if (!id || id === "—") {
        const m = href.match(/__(\d+)/);
        id = m?.[1] ?? "";
      }
      if (id) items.push({ kind: "deejay", articleId: String(id), url: link.url });
      continue;
    }

    if (storeId === STORE_DECKS) {
      const code = parsed.valid
        ? parsed.code || parsed.productId
        : href
            .replace(/\/+$/, "")
            .split("/")
            .filter(Boolean)
            .pop();
      if (code && /\/(?:track|m)\//i.test(href)) {
        items.push({ kind: "decks", code: String(code), url: link.url });
      }
      continue;
    }

    if (storeId === STORE_YOYAKU) {
      if (!parsed.valid && !/\/release\//i.test(href)) continue;
      const url = parsed.valid ? parsed.canonicalUrl : link.url;
      if (url) items.push({ kind: "yoyaku", url });
      continue;
    }

    if (storeId === STORE_JUNO) {
      let titleId = parsed.valid ? parsed.productId : null;
      let variant = "01";
      const m = href.match(/\/products\/[^/]+\/(\d+)(?:-(\d+))?\/?/i);
      if (m) {
        titleId = Number(m[1]);
        if (m[2]) variant = m[2].padStart(2, "0");
      } else if (listingIdFor(link) && listingIdFor(link) !== "—") {
        titleId = Number(listingIdFor(link));
      }
      if (Number.isFinite(titleId)) {
        items.push({
          kind: "juno",
          titleId,
          variant,
          addUrl: `https://www.juno.co.uk/cart/add/${titleId}/${variant}/`,
        });
      }
    }
  }

  // Dedupe
  const seen = new Set();
  return items.filter((item) => {
    const key =
      item.identifier ||
      item.articleId ||
      item.code ||
      item.addUrl ||
      item.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hostGuard(hostNeedle, cartUrl, storeLabel) {
  const pattern = String(hostNeedle).replace(/\./g, "\\.");
  return `if (!/${pattern}/i.test(location.hostname)) {
    alert("Najprej odpri ${storeLabel} in se prijavi, nato znova klikni ta zaznamek.");
    location.href = ${JSON.stringify(cartUrl)};
    return;
  }`;
}

function buildHhvScript(items, delayMs) {
  const identifiers = items.map((i) => i.identifier);
  return `(() => {
  const identifiers = ${JSON.stringify(identifiers)};
  const delayMs = ${delayMs};
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  ${hostGuard("hhv.de", SHOP_CART_URL[STORE_HHV], "HHV")}
  (async () => {
    let okCount = 0;
    for (const identifier of identifiers) {
      try {
        const res = await fetch("/en/cart/add", {
          method: "POST",
          headers: { accept: "*/*", "content-type": "application/json; charset=UTF-8" },
          credentials: "same-origin",
          body: JSON.stringify({
            data: {
              identifier,
              quantity: 1,
              for_bonus_coins: false,
              customization: null,
              delay_flash: true,
              perspective_query_id: null,
            },
          }),
        });
        if (res.ok) okCount += 1;
      } catch (_) {}
      await wait(delayMs);
    }
    alert("HHV cart: " + okCount + "/" + identifiers.length);
    location.href = "/en/cart";
  })().catch((e) => alert(String(e)));
})();`;
}

function buildDeejayScript(items, delayMs) {
  const ids = items.map((i) => i.articleId);
  return `(() => {
  const ids = ${JSON.stringify(ids)};
  const delayMs = ${delayMs};
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  ${hostGuard("deejay.de", SHOP_CART_URL[STORE_DEEJAY], "Deejay")}
  (async () => {
    let okCount = 0;
    for (const an of ids) {
      try {
        const body = new URLSearchParams({ an: String(an), menge: "1", oref: "" });
        const res = await fetch("/ajaxHelper/addToCart.php", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
          credentials: "same-origin",
          body,
        });
        if (res.ok) okCount += 1;
      } catch (_) {}
      await wait(delayMs);
    }
    alert("Deejay cart: " + okCount + "/" + ids.length);
    location.href = "/m_Info/sm_Cart";
  })().catch((e) => alert(String(e)));
})();`;
}

function buildDecksScript(items, delayMs) {
  const codes = items.map((i) => i.code);
  return `(() => {
  const codes = ${JSON.stringify(codes)};
  const delayMs = ${delayMs};
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  ${hostGuard("decks.de", SHOP_CART_URL[STORE_DECKS], "Decks")}
  (async () => {
    let okCount = 0;
    for (const code of codes) {
      try {
        const body = new URLSearchParams({ json: "1", code: String(code) });
        const res = await fetch("/decks/rpc/toBasket.php", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
          credentials: "same-origin",
          body,
        });
        if (res.ok) okCount += 1;
      } catch (_) {}
      await wait(delayMs);
    }
    alert("Decks cart: " + okCount + "/" + codes.length);
    location.href = "/decks/order/warenkorb.php";
  })().catch((e) => alert(String(e)));
})();`;
}

function buildYoyakuScript(items, delayMs) {
  const urls = items.map((i) => i.url);
  return `(() => {
  const urls = ${JSON.stringify(urls)};
  const delayMs = ${delayMs};
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  ${hostGuard("yoyaku.io", SHOP_CART_URL[STORE_YOYAKU], "Yoyaku")}
  (async () => {
    let okCount = 0;
    for (const url of urls) {
      try {
        const page = await fetch(url, { credentials: "same-origin" }).then((r) => r.text());
        const m =
          page.match(/name=["']add-to-cart["'][^>]*value=["'](\\d+)["']/i) ||
          page.match(/value=["'](\\d+)["'][^>]*name=["']add-to-cart["']/i);
        const id = m && m[1];
        if (!id) continue;
        const res = await fetch("/?add-to-cart=" + encodeURIComponent(id), {
          credentials: "same-origin",
        });
        if (res.ok || res.redirected) okCount += 1;
      } catch (_) {}
      await wait(delayMs);
    }
    alert("Yoyaku cart: " + okCount + "/" + urls.length);
    location.href = "/cart/";
  })().catch((e) => alert(String(e)));
})();`;
}

export function getShopCartMode(store) {
  const storeId = normalizeStore(store);
  if (storeId === STORE_JUNO) return "deeplink";
  if (SHOP_CART_HOST[storeId]) return "bookmarklet";
  return null;
}

export function buildShopCartBookmarkScript(links, store, { delayMs = 450 } = {}) {
  const storeId = normalizeStore(store);
  const items = collectShopCartTargets(links, storeId);
  if (!items.length) return null;
  if (storeId === STORE_HHV) return buildHhvScript(items, delayMs);
  if (storeId === STORE_DEEJAY) return buildDeejayScript(items, delayMs);
  if (storeId === STORE_DECKS) return buildDecksScript(items, delayMs);
  if (storeId === STORE_YOYAKU) return buildYoyakuScript(items, delayMs);
  return null;
}

export function buildShopCartBookmarklet(links, store) {
  const script = buildShopCartBookmarkScript(links, store);
  if (!script) return null;
  return `javascript:${encodeURIComponent(script)}`;
}

export function junoAddToCartUrls(links) {
  return collectShopCartTargets(links, STORE_JUNO).map((i) => i.addUrl);
}

export function shopCartSupports(store) {
  return getShopCartMode(store) != null;
}

export function shopCartLabel(store) {
  return getStoreConfig(store).label;
}

// Back-compat HHV helpers
export const HHV_CART_URL = SHOP_CART_URL[STORE_HHV];
export function buildHhvCartBookmarklet(productIds) {
  const links = (productIds ?? []).map((id) => ({
    url: `https://www.hhv.de/en/records/item/x-${id}`,
    listing_id: id,
  }));
  return buildShopCartBookmarklet(links, STORE_HHV);
}
