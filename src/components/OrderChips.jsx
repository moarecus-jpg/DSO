import { ORDER_CHIPS } from "../../shared/orderDashboard.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function OrderChips({ value, onChange, counts, trailing = null }) {
  const { t } = useLocale();

  return (
    <div className="order-chips-row">
      <div className="order-chips" role="tablist" aria-label={t("orders.filters")}>
        {ORDER_CHIPS.map((chip) => {
          const count = counts?.[chip];
          return (
            <button
              key={chip}
              type="button"
              role="tab"
              aria-selected={value === chip}
              className={`order-chip order-chip--${chip}${
                value === chip ? " active" : ""
              }`}
              onClick={() => onChange(chip)}
            >
              {chip !== "all" && <span className="order-chip-dot" aria-hidden />}
              {t(`orders.chip.${chip}`)}
              {typeof count === "number" ? (
                <span className="order-chip-count">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {trailing}
    </div>
  );
}
