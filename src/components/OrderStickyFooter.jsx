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
  footerActions = null,
  footerLeadingActions = null,
  onExpandedChange,
  shippingError = null,
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);

  function setExpandedState(next) {
    setExpanded(next);
    onExpandedChange?.(next);
  }

  const hasTotals = memberTotals.length > 0;
  if (!hasTotals && !footerActions && !footerLeadingActions) return null;

  function renderFooterSlot(node) {
    if (node == null || node === false) return null;
    if (typeof node === "string" || typeof node === "number") {
      console.error("[OrderStickyFooter] Ignored invalid footer content:", node);
      return null;
    }
    return node;
  }

  const leading = renderFooterSlot(footerLeadingActions);
  const trailing = renderFooterSlot(footerActions);

  const { total, currency } = orderGrandTotal ?? {};
  const priceLabel = formatPrice(total, currency);

  return (
    <>
      {expanded && (
        <button
          type="button"
          className="order-sticky-backdrop"
          onClick={() => setExpandedState(false)}
          aria-label={t("summary.hideDetails")}
        />
      )}

      <div
        className={`order-sticky-footer${
          expanded ? " order-sticky-footer--expanded" : ""
        }`}
      >
        <div className="order-sticky-footer-sheet">
          {expanded && hasTotals && (
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
                shippingError={shippingError}
              />
            </div>
          )}

          <div className="order-sticky-footer-bar">
            <div className="order-sticky-footer-bar-inner">
              <div className="order-sticky-footer-cluster">
                {(leading || trailing) && (
                  <div className="order-sticky-footer-actions-row">
                    {leading}
                    {trailing}
                  </div>
                )}

                {hasTotals && (
                  <div className="order-sticky-footer-total-group">
                    <button
                      type="button"
                      className="order-sticky-footer-toggle"
                      onClick={() => setExpandedState((open) => !open)}
                      aria-expanded={expanded}
                      aria-controls="order-sticky-details"
                      aria-label={
                        expanded
                          ? t("summary.hideDetails")
                          : `${t("summary.showDetails")} (${priceLabel})`
                      }
                    >
                      <ChevronUp
                        size={20}
                        strokeWidth={2.5}
                        className={`order-sticky-footer-chevron${
                          expanded ? " order-sticky-footer-chevron--open" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    <div
                      className="order-sticky-footer-price order-total-value"
                      aria-label={priceLabel}
                    >
                      {priceLabel}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
