import { ShoppingCart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../hooks/useLocale.jsx";
import { usePlacCart } from "../hooks/usePlacCart.jsx";

export function PlacCartLink({ compact = false, className = "" }) {
  const { t } = useLocale();
  const { count } = usePlacCart();
  const { pathname } = useLocation();
  const onCart = pathname === "/plac/cart";

  if (compact) {
    return (
      <Link
        to="/plac/cart"
        className={`mobile-topbar-icon-btn plac-cart-link-compact${
          onCart ? " mobile-topbar-icon-btn--active" : ""
        }${className ? ` ${className}` : ""}`}
        aria-current={onCart ? "page" : undefined}
        aria-label={t("plac.cart")}
        title={t("plac.cart")}
      >
        <ShoppingCart size={18} aria-hidden />
        {count > 0 && <span className="plac-cart-badge plac-cart-badge--compact">{count}</span>}
      </Link>
    );
  }

  return (
    <Link
      to="/plac/cart"
      className={`btn btn-ghost plac-cart-link${onCart ? " active" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-current={onCart ? "page" : undefined}
    >
      <ShoppingCart size={18} aria-hidden />
      {t("plac.cart")}
      {count > 0 && <span className="plac-cart-badge">{count}</span>}
    </Link>
  );
}
