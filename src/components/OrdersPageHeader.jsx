import { Search } from "lucide-react";

export function OrdersPageHeader({ title, subtitle, query, onQueryChange, placeholder }) {
  return (
    <div className="orders-page-header">
      <div>
        <h1 className="orders-page-title">{title}</h1>
        {subtitle && <p className="orders-page-subtitle">{subtitle}</p>}
      </div>
      <div className="orders-search-wrap">
        <Search className="orders-search-icon" size={20} aria-hidden />
        <input
          type="search"
          className="orders-search-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder ?? "Išči naročila…"}
        />
      </div>
    </div>
  );
}
