import { ArrowLeft, Plus, Search, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { HeaderAccount } from "./HeaderAccount.jsx";
import { PlacGalleryViewToggle } from "./PlacGalleryViewToggle.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function PlacPageHeader({
  title,
  subtitle,
  query,
  onQueryChange,
  placeholder,
  cartCount,
  onSell,
  showGalleryView = false,
  galleryView,
  onGalleryViewChange,
  backTo,
  titleLeading,
}) {
  const { t } = useLocale();

  return (
    <header className="plac-page-header">
      <div className="plac-page-header-row plac-page-header-row--top">
        <div className="plac-page-header-title">
          {backTo && (
            <Link to={backTo.to} className="plac-page-header-back btn btn-ghost btn-sm">
              <ArrowLeft size={16} aria-hidden />
              {backTo.label}
            </Link>
          )}
          <div className="plac-page-header-title-main">
            {titleLeading}
            <div className="plac-page-header-title-text">
              <h1 className="orders-page-title">{title}</h1>
              {subtitle && <p className="orders-page-subtitle">{subtitle}</p>}
            </div>
          </div>
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

        <div className="plac-page-header-end">
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
          <HeaderAccount className="plac-page-header-account" />
        </div>
      </div>

      {showGalleryView && (
        <div className="plac-page-header-row plac-page-header-row--controls">
          <div className="plac-page-header-controls">
            <PlacGalleryViewToggle view={galleryView} onChange={onGalleryViewChange} />
          </div>
        </div>
      )}
    </header>
  );
}
