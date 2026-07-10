import { Search } from "lucide-react";
import { ORDER_SEARCH_MODES } from "../../shared/filterOrders.js";
import { useLocale } from "../hooks/useLocale.jsx";

const SEARCH_MODE_LABELS = {
  creator: "orders.searchByCreator",
  seller: "orders.searchBySeller",
};

const SEARCH_PLACEHOLDERS = {
  creator: "orders.searchPlaceholderCreator",
  seller: "orders.searchPlaceholderSeller",
};

export function OrdersPageHeader({
  title,
  subtitle,
  query,
  onQueryChange,
  placeholder,
  searchMode = "creator",
  onSearchModeChange,
}) {
  const { t } = useLocale();
  const mode = ORDER_SEARCH_MODES.includes(searchMode) ? searchMode : "creator";
  const resolvedPlaceholder =
    placeholder ?? t(SEARCH_PLACEHOLDERS[mode] ?? "orders.searchOrders");

  return (
    <div className="orders-page-header">
      <div>
        <h1 className="orders-page-title">{title}</h1>
        {subtitle && <p className="orders-page-subtitle">{subtitle}</p>}
      </div>
      <div className="orders-search-bar">
        <div className="orders-search-wrap">
          <Search className="orders-search-icon" size={20} aria-hidden />
          <input
            type="search"
            className="orders-search-input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={resolvedPlaceholder}
          />
        </div>
        {onSearchModeChange && (
          <select
            className="orders-search-mode"
            value={mode}
            onChange={(e) => onSearchModeChange(e.target.value)}
            aria-label={t("orders.searchOrders")}
          >
            {ORDER_SEARCH_MODES.map((value) => (
              <option key={value} value={value}>
                {t(SEARCH_MODE_LABELS[value])}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
