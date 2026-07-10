import { useEffect, useState } from "react";
import { formatPrice } from "../../shared/orderTotals.js";

export function OrderSummary({
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
    const next =
      trimmed === "" ? null : Number(trimmed.replace(",", "."));
    if (trimmed !== "" && Number.isNaN(next)) {
      alert("Vnesi veljavno številko za poštnino.");
      return;
    }

    const splitTrimmed = draftSplit.trim();
    const nextSplit =
      splitTrimmed === "" ? null : Math.floor(Number(splitTrimmed));
    if (splitTrimmed !== "" && (Number.isNaN(nextSplit) || nextSplit < 1)) {
      alert("Število oseb mora biti vsaj 1.");
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
    <div className="order-summary card">
      <h3 className="order-summary-title">Povzetek naročila</h3>

      <table className="order-summary-table">
        <thead>
          <tr>
            <th>Sodelujoči</th>
            <th>Št. plat</th>
            <th>Seštevek</th>
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
                  <span className="muted fine"> (+ brez cene)</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="order-summary-subtotal">
            <td>
              <strong>Seštevek</strong>
            </td>
            <td>
              <strong>{count ?? 0}</strong>
            </td>
            <td>
              <strong>{formatPrice(itemsTotal, currency)}</strong>
              {hasUnknown && (
                <span className="muted fine"> · nekatere brez cene</span>
              )}
            </td>
          </tr>
          <tr className="order-summary-shipping">
            <td colSpan={2}>
              <strong>Poštnina</strong>
              {!readOnly && (
                <span className="muted fine"> (skupaj za naročilo)</span>
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
                    aria-label="Poštnina"
                  />
                  <span className="order-summary-shipping-currency">{shipCur}</span>
                </div>
              )}
            </td>
          </tr>
          <tr className="order-summary-shipping-split">
            <td colSpan={2}>
              <strong>Deli poštnino na</strong>
              {!readOnly && (
                <span className="muted fine"> št. oseb</span>
              )}
            </td>
            <td>
              {readOnly ? (
                <span>
                  {computedSplit ?? "—"} oseb
                  {perPerson != null && (
                    <span className="muted fine">
                      {" "}
                      · {formatPrice(perPerson, shipCur)} / osebo
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
                    aria-label="Število oseb za delitev poštnine"
                  />
                  {perPerson != null && shipping > 0 && (
                    <span className="order-summary-per-person muted fine">
                      {formatPrice(perPerson, shipCur)} / osebo
                    </span>
                  )}
                </div>
              )}
            </td>
          </tr>
          <tr className="order-summary-grand">
            <td colSpan={2}>
              <strong>Skupaj z poštnino</strong>
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
