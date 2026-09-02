import { Plus, Search, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { HeaderAccount } from "./HeaderAccount.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function PlacPageHeader({
  title,
  subtitle,
  query,
  onQueryChange,
  placeholder,
  cartCount,
  onSell,
}) {
  const { t } = useLocale();

  return (
    <header className="plac-page-header">
      <div className="plac-page-header-row plac-page-header-row--top">
        <div className="plac-page-header-title">
          <h1 className="orders-page-title">{title}</h1>
          {subtitle && <p className="orders-page-subtitle">{subtitle}</p>}
        </div>

        <div className="plac-page-header-search">
          <div className="orders-search-wrap">
            <Search className="orders-search-icon" size={20} aria-hidden />
            <input
              type="search"
              className="orders-search-input"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={placeholder}
            />
          </div>
        </div>

        <HeaderAccount className="plac-page-header-account" />
      </div>

      <div className="plac-page-header-row plac-page-header-row--bottom">
        <div className="plac-toolbar-actions">
          <Link to="/plac/cart" className="btn btn-ghost plac-cart-link">
            <ShoppingCart size={18} aria-hidden />
            {t("plac.cart")}
            {cartCount > 0 && <span className="plac-cart-badge">{cartCount}</span>}
          </Link>
          <Link to="/plac/orders" className="btn btn-ghost plac-orders-link">
            {t("plac.orders")}
          </Link>
          <button type="button" className="btn btn-primary plac-sell-btn" onClick={onSell}>
            <Plus size={18} aria-hidden />
            {t("plac.sell")}
          </button>
        </div>
      </div>
    </header>
  );
}
