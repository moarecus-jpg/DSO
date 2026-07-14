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
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);

  if (!memberTotals.length) return null;

  const { total, currency } = orderGrandTotal ?? {};
  const priceLabel = formatPrice(total, currency);

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
          <div className="order-sticky-footer-row">
            <button
              type="button"
              className="btn btn-primary order-sticky-footer-cell order-sticky-footer-toggle"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              aria-controls="order-sticky-details"
              aria-label={
                expanded
                  ? t("summary.hideDetails")
                  : `${t("summary.showDetails")} (${priceLabel})`
              }
            >
              <ChevronUp
                size={24}
                className={`order-sticky-footer-chevron${
                  expanded ? " order-sticky-footer-chevron--open" : ""
                }`}
                aria-hidden
              />
            </button>

            <div
              className="order-sticky-footer-cell order-sticky-footer-price order-total-value"
              aria-label={priceLabel}
            >
              {priceLabel}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
