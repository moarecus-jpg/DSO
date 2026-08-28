import { useEffect, useRef, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { ORDER_SEARCH_MODES } from "../../shared/filterOrders.js";
import { useLocale } from "../hooks/useLocale.jsx";

const SEARCH_MODE_LABELS = {
  creator: "orders.searchByCreator",
  seller: "orders.searchBySeller",
};

export function OrdersFilterButton({
  searchMode = "creator",
  onSearchModeChange,
  onReset,
  dirty = false,
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="orders-filter" ref={rootRef}>
      <button
        type="button"
        className={`orders-filter-btn${open ? " active" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <SlidersHorizontal size={15} aria-hidden />
        {t("orders.filterButton")}
        {dirty && <span className="orders-filter-dot" aria-hidden />}
      </button>

      {open && (
        <div className="orders-filter-menu" role="dialog" aria-label={t("orders.filters")}>
          <p className="orders-filter-menu-title">{t("orders.filterScope")}</p>
          {ORDER_SEARCH_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`orders-filter-option${searchMode === mode ? " active" : ""}`}
              onClick={() => {
                onSearchModeChange?.(mode);
                setOpen(false);
              }}
            >
              {t(SEARCH_MODE_LABELS[mode])}
              {searchMode === mode && <Check size={15} aria-hidden />}
            </button>
          ))}
          {onReset && (
            <button
              type="button"
              className="orders-filter-reset"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              disabled={!dirty}
            >
              {t("orders.filterReset")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
