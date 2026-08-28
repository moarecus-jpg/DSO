import { ORDER_CHIPS } from "../../shared/orderDashboard.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function OrderChips({ value, onChange, counts }) {
  const { t } = useLocale();

  return (
    <div className="order-chips" role="tablist" aria-label={t("orders.filters")}>
      {ORDER_CHIPS.map((chip) => {
        const count = counts?.[chip];
        return (
          <button
            key={chip}
            type="button"
            role="tab"
            aria-selected={value === chip}
            className={`order-chip${value === chip ? " active" : ""}`}
            onClick={() => onChange(chip)}
          >
            {t(`orders.chip.${chip}`)}
            {typeof count === "number" ? (
              <span className="order-chip-count">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
