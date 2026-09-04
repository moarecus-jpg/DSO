import { Percent } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../hooks/useLocale.jsx";

export function PlacShopLink({ compact = false, className = "" }) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const onShop = pathname === "/plac/shop";

  if (compact) {
    return (
      <Link
        to="/plac/shop"
        className={`mobile-topbar-icon-btn plac-shop-link-compact${
          onShop ? " mobile-topbar-icon-btn--active" : ""
        }${className ? ` ${className}` : ""}`}
        aria-current={onShop ? "page" : undefined}
        aria-label={t("plac.shopSettingsTitle")}
        title={t("plac.shopSettingsTitle")}
      >
        <Percent size={18} aria-hidden />
      </Link>
    );
  }

  return (
    <Link
      to="/plac/shop"
      className={`btn btn-ghost plac-shop-link${onShop ? " active" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-current={onShop ? "page" : undefined}
    >
      <Percent size={18} aria-hidden />
      {t("nav.placShop")}
    </Link>
  );
}
