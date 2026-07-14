import { useState } from "react";
import { ChevronUp } from "lucide-react";
import { formatPrice } from "../../shared/orderTotals.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { MemberChips } from "./MemberChips.jsx";
import { OrderSummary } from "./OrderSummary.jsx";

export function OrderStickyFooter({
  members = [],
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
          <div className="order-sticky-footer-panel">
            {members.length > 0 && (
              <div className="order-sticky-footer-members">
                <span className="label">{t("session.participants")}</span>
                <MemberChips members={members} />
              </div>
            )}
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

        <button
          type="button"
          className="order-sticky-footer-bar"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls="order-sticky-details"
        >
          <ChevronUp
            size={20}
            className={`order-sticky-footer-chevron${
              expanded ? " order-sticky-footer-chevron--open" : ""
            }`}
            aria-hidden
          />
          <div className="order-sticky-footer-copy">
            <span className="order-sticky-footer-label">{t("common.total")}</span>
            <span className="order-sticky-footer-meta muted">
              {recordsLabel(count ?? 0)} · {formatPrice(itemsTotal, currency)}
              {hasUnknown && t("common.someWithoutPrice")}
            </span>
          </div>
          <strong className="order-sticky-footer-total order-total-value">
            {formatPrice(total, currency)}
          </strong>
        </button>
      </div>
    </>
  );
}
