import { useEffect, useState } from "react";
import { formatPrice } from "../../shared/orderTotals.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function OrderSummary({
  embedded = false,
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

  if (!memberTotals.length) return null;

  const {
    itemsTotal,
    shipping,
    total,
    currency,
    shippingCurrency: computedShipCurrency,
    shippingPerPerson,
    shippingSplitCount: computedSplit,
    hasUnknown,
    count,
  } = orderGrandTotal ?? {};

  const shipCur = shippingCurrency ?? computedShipCurrency ?? currency;
  const [draft, setDraft] = useState("");
  const [draftSplit, setDraftSplit] = useState("");

  useEffect(() => {
    setDraft(
      shippingValue != null && shippingValue !== ""
        ? String(shippingValue)
        : shipping > 0
          ? String(shipping)
          : ""
    );
  }, [shippingValue, shipping]);

  useEffect(() => {
    const saved = shippingSplitCount ?? computedSplit;
    setDraftSplit(
      saved != null && saved !== ""
        ? String(saved)
        : memberCount > 0
          ? String(memberCount)
          : ""
    );
  }, [shippingSplitCount, computedSplit, memberCount]);

  async function commitShipping() {
    if (!onSaveShipping || readOnly) return;

    const trimmed = draft.trim();
    const next = trimmed === "" ? null : Number(trimmed.replace(",", "."));
    if (trimmed !== "" && Number.isNaN(next)) {
      alert(t("summary.invalidShipping"));
      return;
    }

    const splitTrimmed = draftSplit.trim();
    const nextSplit = splitTrimmed === "" ? null : Math.floor(Number(splitTrimmed));
    if (splitTrimmed !== "" && (Number.isNaN(nextSplit) || nextSplit < 1)) {
      alert(t("summary.minPeople"));
      return;
    }

    const current =
      shippingValue != null && shippingValue !== ""
        ? Number(shippingValue)
        : shipping > 0
          ? shipping
          : null;
    const currentSplit = shippingSplitCount ?? computedSplit ?? null;

    const valueUnchanged =
      next === current || (next == null && (current == null || current === 0));
    const splitUnchanged =
      nextSplit === currentSplit ||
      (nextSplit == null && currentSplit == null);

    if (valueUnchanged && splitUnchanged) return;

    await onSaveShipping({
      shippingValue: next,
      shippingCurrency: shipCur,
      shippingSplitCount: nextSplit,
    });
  }

  const perPerson =
    shippingPerPerson ??
    (shipping > 0 && draftSplit && Number(draftSplit) >= 1
      ? Math.round((shipping / Number(draftSplit)) * 100) / 100
      : null);

  return (
    <div
      className={`order-summary${embedded ? " order-summary--embedded" : " card"}`}
    >
      {!embedded && <h3 className="order-summary-title">{t("summary.title")}</h3>}

      <table className="order-summary-table">
        <thead>
          <tr>
            <th>{t("summary.participants")}</th>
            <th>{t("summary.recordCount")}</th>
            <th>{t("summary.subtotal")}</th>
          </tr>
        </thead>
        <tbody>
          {memberTotals.map((row) => (
            <tr key={`${row.userId ?? ""}-${row.name}`}>
              <td>{row.name}</td>
              <td>{row.count}</td>
              <td>
                {formatPrice(row.total, row.currency)}
                {row.hasUnknownPrice && (
                  <span className="muted fine">{t("common.withoutPrice")}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="order-summary-subtotal">
            <td>
              <strong>{t("summary.subtotal")}</strong>
            </td>
            <td>
              <strong>{count ?? 0}</strong>
            </td>
            <td>
              <strong>{formatPrice(itemsTotal, currency)}</strong>
              {hasUnknown && (
                <span className="muted fine">{t("common.someWithoutPrice")}</span>
              )}
            </td>
          </tr>
          <tr className="order-summary-shipping">
            <td colSpan={2}>
              <strong>{t("summary.shipping")}</strong>
              {!readOnly && (
                <span className="muted fine">{t("summary.shippingHint")}</span>
              )}
            </td>
            <td>
              {readOnly ? (
                <strong>{formatPrice(shipping, shipCur)}</strong>
              ) : (
                <div className="order-summary-shipping-edit">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="order-summary-shipping-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitShipping()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.target.blur();
                      }
                    }}
                    placeholder="0.00"
                    disabled={savingShipping}
                    aria-label={t("summary.shippingAria")}
                  />
                  <span className="order-summary-shipping-currency">{shipCur}</span>
                </div>
              )}
            </td>
          </tr>
          <tr className="order-summary-shipping-split">
            <td colSpan={2}>
              <strong>{t("summary.splitShipping")}</strong>
              {!readOnly && (
                <span className="muted fine">{t("summary.peopleCount")}</span>
              )}
            </td>
            <td>
              {readOnly ? (
                <span>
                  {t("summary.people", { count: computedSplit ?? "—" })}
                  {perPerson != null && (
                    <span className="muted fine">
                      {" "}
                      · {t("summary.perPerson", {
                        price: formatPrice(perPerson, shipCur),
                      })}
                    </span>
                  )}
                </span>
              ) : (
                <div className="order-summary-shipping-split-edit">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="order-summary-shipping-input order-summary-split-input"
                    value={draftSplit}
                    onChange={(e) => setDraftSplit(e.target.value)}
                    onBlur={() => commitShipping()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.target.blur();
                      }
                    }}
                    placeholder="1"
                    disabled={savingShipping}
                    aria-label={t("summary.splitAria")}
                  />
                  {perPerson != null && shipping > 0 && (
                    <span className="order-summary-per-person muted fine">
                      {t("summary.perPerson", {
                        price: formatPrice(perPerson, shipCur),
                      })}
                    </span>
                  )}
                </div>
              )}
            </td>
          </tr>
          <tr className="order-summary-grand">
            <td colSpan={2}>
              <strong>{t("summary.totalWithShipping")}</strong>
            </td>
            <td>
              <strong className="order-total-value">
                {formatPrice(total, currency)}
              </strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
