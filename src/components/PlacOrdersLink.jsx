import { Package } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../hooks/useLocale.jsx";

export function PlacOrdersLink({ compact = false, className = "" }) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const onOrders = pathname === "/plac/orders";

  if (compact) {
    return (
      <Link
        to="/plac/orders"
        className={`mobile-topbar-icon-btn plac-orders-link-compact${
          onOrders ? " mobile-topbar-icon-btn--active" : ""
        }${className ? ` ${className}` : ""}`}
        aria-current={onOrders ? "page" : undefined}
        aria-label={t("plac.orders")}
        title={t("plac.orders")}
      >
        <Package size={18} aria-hidden />
      </Link>
    );
  }

  return (
    <Link
      to="/plac/orders"
      className={`btn btn-ghost plac-orders-link${onOrders ? " active" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-current={onOrders ? "page" : undefined}
    >
      {t("plac.orders")}
    </Link>
  );
}
