import { Plus, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../hooks/useLocale.jsx";

export function PlacToolbarActions({ cartCount, onSell, showSell = true }) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const onCart = pathname === "/plac/cart";
  const onOrders = pathname === "/plac/orders";

  return (
    <div className="plac-toolbar-actions">
      <Link
        to="/plac/cart"
        className={`btn btn-ghost plac-cart-link${onCart ? " active" : ""}`}
        aria-current={onCart ? "page" : undefined}
      >
        <ShoppingCart size={18} aria-hidden />
        {t("plac.cart")}
        {cartCount > 0 && <span className="plac-cart-badge">{cartCount}</span>}
      </Link>
      <Link
        to="/plac/orders"
        className={`btn btn-ghost plac-orders-link${onOrders ? " active" : ""}`}
        aria-current={onOrders ? "page" : undefined}
      >
        {t("plac.orders")}
      </Link>
      {showSell && onSell && (
        <button type="button" className="btn btn-primary plac-sell-btn" onClick={onSell}>
          <Plus size={18} aria-hidden />
          {t("plac.sell")}
        </button>
      )}
    </div>
  );
}
