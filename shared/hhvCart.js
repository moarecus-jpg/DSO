/** HHV cart API uses product id + variant suffix, e.g. "1401619v1". */
export const HHV_CART_URL = "https://www.hhv.de/en/cart";
export const HHV_CART_ADD_PATH = "/en/cart/add";

export function hhvCartIdentifier(productId, variant = "v1") {
  const id = String(productId ?? "").trim();
  if (!id || id === "—") return null;
  if (/v\d+$/i.test(id)) return id;
  return `${id}${variant}`;
}

/**
 * Script body that runs on hhv.de (same-origin cookies).
 */
export function buildHhvCartAddScript(productIds, { delayMs = 450 } = {}) {
  const identifiers = [
    ...new Set(
      (productIds ?? []).map((id) => hhvCartIdentifier(id)).filter(Boolean)
    ),
  ];

  return `(() => {
  const identifiers = ${JSON.stringify(identifiers)};
  const delayMs = ${Number(delayMs) || 450};
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (!identifiers.length) {
    alert("No HHV products.");
    return;
  }
  if (!/hhv\\.de$/i.test(location.hostname)) {
    alert("Najprej odpri HHV (hhv.de) in se prijavi, nato znova klikni ta gumb/zaznamek.");
    location.href = ${JSON.stringify(HHV_CART_URL)};
    return;
  }
  (async () => {
    let okCount = 0;
    for (const identifier of identifiers) {
      try {
        const res = await fetch(${JSON.stringify(HHV_CART_ADD_PATH)}, {
          method: "POST",
          headers: {
            accept: "*/*",
            "content-type": "application/json; charset=UTF-8",
          },
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
    alert("Dodano v HHV košarico: " + okCount + "/" + identifiers.length);
    location.href = "/en/cart";
  })().catch((err) => alert(String(err)));
})();`;
}

/** Draggable bookmarklet href for the browser bookmarks bar. */
export function buildHhvCartBookmarklet(productIds) {
  const script = buildHhvCartAddScript(productIds);
  return `javascript:${encodeURIComponent(script)}`;
}
