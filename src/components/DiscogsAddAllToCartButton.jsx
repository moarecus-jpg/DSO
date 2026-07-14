import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";
import { addAllListingsToDiscogsCart, uniqueListingIds } from "../utils/discogsCartQueue.js";

export function DiscogsAddAllToCartButton({
  links,
  className = "",
  disabled = false,
  variant = "ghost",
}) {
  const { t } = useLocale();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);

  const count = uniqueListingIds(links).length;
  if (count === 0) return null;

  async function handleClick() {
    if (running || disabled) return;

    setRunning(true);
    setProgress({ current: 0, total: count });

    try {
      const result = await addAllListingsToDiscogsCart(links, {
        onProgress: setProgress,
      });

      if (result.reason === "popup_blocked") {
        alert(t("items.addAllToCartPopupBlocked"));
      } else if (!result.ok) {
        alert(t("items.addAllToCartFailed"));
      }
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  const label = running
    ? t("items.addAllToCartProgress", {
        current: progress?.current ?? 0,
        total: progress?.total ?? count,
      })
    : t("items.addAllToCart", { count });

  const shortLabel = running
    ? t("items.addAllToCartProgress", {
        current: progress?.current ?? 0,
        total: progress?.total ?? count,
      })
    : t("items.addAllToCartShort", { count });

  const btnClass =
    variant === "outline" ? "" : "btn btn-ghost discogs-add-all-to-cart";

  return (
    <button
      type="button"
      className={`${btnClass} ${className}`.trim()}
      onClick={handleClick}
      disabled={disabled || running}
      title={t("items.addAllToCartHint")}
      aria-label={label}
    >
      <ShoppingCart size={16} aria-hidden />
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
