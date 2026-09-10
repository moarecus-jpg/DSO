import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, ShoppingCart, X } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";
import {
  SHOP_CART_URL,
  buildShopCartBookmarklet,
  collectShopCartTargets,
  getShopCartMode,
  shopCartLabel,
} from "../../shared/shopCart.js";
import { addAllItemsToJunoCart } from "../utils/junoCartQueue.js";
import { STORE_JUNO, normalizeStore } from "../../shared/stores.js";

export function ShopAddAllToCartButton({
  store,
  links,
  className = "",
  disabled = false,
  variant = "ghost",
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);

  const storeId = normalizeStore(store);
  const mode = getShopCartMode(storeId);
  const labelName = shopCartLabel(storeId);
  const targets = useMemo(
    () => collectShopCartTargets(links, storeId),
    [links, storeId]
  );
  const count = targets.length;
  const bookmarkHref = useMemo(
    () =>
      mode === "bookmarklet" ? buildShopCartBookmarklet(links, storeId) : null,
    [mode, links, storeId]
  );

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mode || count === 0) return null;

  const btnClass =
    variant === "outline" ? "" : "btn btn-ghost discogs-add-all-to-cart";

  async function handleJunoClick() {
    if (running || disabled) return;
    setRunning(true);
    setProgress({ current: 0, total: count });
    try {
      const result = await addAllItemsToJunoCart(links, { onProgress: setProgress });
      if (result.reason === "popup_blocked") {
        alert(t("items.addAllToCartPopupBlocked"));
      } else if (!result.ok) {
        alert(t("items.shopCartFailed", { store: labelName }));
      }
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  if (mode === "deeplink" && storeId === STORE_JUNO) {
    const label = running
      ? t("items.shopCartProgress", {
          store: labelName,
          current: progress?.current ?? 0,
          total: progress?.total ?? count,
        })
      : t("items.shopCartCreate", { store: labelName, count });
    const shortLabel = running
      ? t("items.shopCartProgress", {
          store: labelName,
          current: progress?.current ?? 0,
          total: progress?.total ?? count,
        })
      : t("items.shopCartCreateShort", { store: labelName, count });

    return (
      <button
        type="button"
        className={`${btnClass} ${className}`.trim()}
        onClick={handleJunoClick}
        disabled={disabled || running}
        title={t("items.junoCartHint")}
        aria-label={label}
      >
        <ShoppingCart size={18} strokeWidth={2.25} aria-hidden />
        <span className="order-sticky-footer-action-label order-sticky-footer-action-label--long">
          {label}
        </span>
        <span
          className="order-sticky-footer-action-label order-sticky-footer-action-label--short"
          aria-hidden
        >
          {shortLabel}
        </span>
      </button>
    );
  }

  const label = t("items.shopCartCreate", { store: labelName, count });
  const shortLabel = t("items.shopCartCreateShort", { store: labelName, count });
  const cartUrl = SHOP_CART_URL[storeId];

  const dialog = open
    ? createPortal(
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="modal card modal-hhv-cart"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-cart-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="shop-cart-title">
                {t("items.shopCartModalTitle", { store: labelName })}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="muted">
                {t("items.shopCartWhy", { store: labelName })}
              </p>
              <ol className="hhv-cart-steps">
                <li>{t("items.shopCartStep1")}</li>
                <li>{t("items.shopCartStep2", { store: labelName, count })}</li>
                <li>{t("items.shopCartStep3", { store: labelName })}</li>
              </ol>
              <p className="hhv-cart-drag-hint">{t("items.shopCartDragHint")}</p>
              <a
                className="btn btn-primary hhv-cart-bookmark"
                href={bookmarkHref || "#"}
                onClick={(e) => {
                  e.preventDefault();
                  alert(t("items.shopCartDontClick", { store: labelName }));
                }}
                draggable
                title={t("items.shopCartBookmarkTitle", {
                  store: labelName,
                  count,
                })}
              >
                <ShoppingCart size={16} aria-hidden />
                {t("items.shopCartBookmarkLabel", { store: labelName, count })}
              </a>
            </div>
            <div className="modal-actions">
              <a
                className="btn btn-ghost"
                href={cartUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} aria-hidden />
                {t("items.shopCartOpenShop", { store: labelName })}
              </a>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setOpen(false)}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        type="button"
        className={`${btnClass} ${className}`.trim()}
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={t("items.shopCartHint", { store: labelName })}
        aria-label={label}
      >
        <ShoppingCart size={18} strokeWidth={2.25} aria-hidden />
        <span className="order-sticky-footer-action-label order-sticky-footer-action-label--long">
          {label}
        </span>
        <span
          className="order-sticky-footer-action-label order-sticky-footer-action-label--short"
          aria-hidden
        >
          {shortLabel}
        </span>
      </button>
      {dialog}
    </>
  );
}
