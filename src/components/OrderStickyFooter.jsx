import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { formatPrice } from "../../shared/orderTotals.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { OrderSummary } from "./OrderSummary.jsx";

export function OrderStickyFooter({
  memberTotals = [],
  orderGrandTotal,
  shippingValue,
  shippingCurrency,
  shippingSplitCount,
  memberCount = 0,
  readOnly = false,
  onSaveShipping,
  savingShipping = false,
}) {
  const { t, recordsLabel } = useLocale();
  const [expanded, setExpanded] = useState(false);

  if (!memberTotals.length) return null;

  const { itemsTotal, total, currency, hasUnknown, count } = orderGrandTotal ?? {};

  return (
    <>
      {expanded && (
        <button
          type="button"
          className="order-sticky-backdrop"
          onClick={() => setExpanded(false)}
          aria-label={t("summary.hideDetails")}
        />
      )}

      <div
        className={`order-sticky-footer${
          expanded ? " order-sticky-footer--expanded" : ""
        }`}
      >
        {expanded && (
          <div className="order-sticky-footer-panel" id="order-sticky-details">
            <OrderSummary
              embedded
              memberTotals={memberTotals}
              orderGrandTotal={orderGrandTotal}
              shippingValue={shippingValue}
              shippingCurrency={shippingCurrency}
              shippingSplitCount={shippingSplitCount}
              memberCount={memberCount}
              readOnly={readOnly}
              onSaveShipping={onSaveShipping}
              savingShipping={savingShipping}
            />
          </div>
        )}

        <div className="order-sticky-footer-bar">
          <button
            type="button"
            className="order-sticky-footer-toggle"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls="order-sticky-details"
            aria-label={
              expanded ? t("summary.hideDetails") : t("summary.showDetails")
            }
          >
            <ChevronUp
              size={20}
              className={`order-sticky-footer-chevron${
                expanded ? " order-sticky-footer-chevron--open" : ""
              }`}
              aria-hidden
            />
          </button>

          <p className="order-sticky-footer-meta muted">
            {recordsLabel(count ?? 0)} · {formatPrice(itemsTotal, currency)}
            {hasUnknown && t("common.someWithoutPrice")}
          </p>

          <div className="order-sticky-footer-total-block">
            <span className="order-sticky-footer-total-label">{t("common.total")}</span>
            <strong className="order-sticky-footer-total-price order-total-value">
              {formatPrice(total, currency)}
            </strong>
          </div>
        </div>
      </div>
    </>
  );
}
