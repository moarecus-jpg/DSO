import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, ShoppingCart, X } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";
import {
  HHV_CART_URL,
  buildHhvCartBookmarklet,
} from "../../shared/hhvCart.js";
import { uniqueHhvProductIds } from "../utils/hhvCartHelper.js";

export function HhvAddAllToCartButton({
  links,
  className = "",
  disabled = false,
  variant = "ghost",
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const ids = useMemo(() => uniqueHhvProductIds(links), [links]);
  const count = ids.length;
  const bookmarkHref = useMemo(
    () => (count ? buildHhvCartBookmarklet(ids) : "#"),
    [count, ids]
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

  if (count === 0) return null;

  const label = t("items.hhvCartCreate", { count });
  const shortLabel = t("items.hhvCartCreateShort", { count });
  const btnClass =
    variant === "outline" ? "" : "btn btn-ghost discogs-add-all-to-cart";

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
            aria-labelledby="hhv-cart-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="hhv-cart-title">{t("items.hhvCartModalTitle")}</h2>
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
              <p className="muted">{t("items.hhvCartWhy")}</p>
              <ol className="hhv-cart-steps">
                <li>{t("items.hhvCartStep1")}</li>
                <li>{t("items.hhvCartStep2", { count })}</li>
                <li>{t("items.hhvCartStep3")}</li>
              </ol>
              <p className="hhv-cart-drag-hint">{t("items.hhvCartDragHint")}</p>
              <a
                className="btn btn-primary hhv-cart-bookmark"
                href={bookmarkHref}
                onClick={(e) => {
                  // Running from DCO origin cannot add to HHV cart (CORS).
                  e.preventDefault();
                  alert(t("items.hhvCartDontClick"));
                }}
                draggable
                title={t("items.hhvCartBookmarkTitle", { count })}
              >
                <ShoppingCart size={16} aria-hidden />
                {t("items.hhvCartBookmarkLabel", { count })}
              </a>
            </div>
            <div className="modal-actions">
              <a
                className="btn btn-ghost"
                href={HHV_CART_URL}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} aria-hidden />
                {t("items.hhvCartOpenHhv")}
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
        title={t("items.hhvCartHint")}
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
