import { useEffect, useState } from "react";
import { ClipboardCheck, Pencil } from "lucide-react";
import { formatPrice } from "../../shared/orderTotals.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { isValidShippingNumber, normalizeShippingNumber } from "../utils/sanitizeError.js";

export function OrderSummary({
  embedded = false,
  memberTotals = [],
  orderGrandTotal,
  shippingValue,
  shippingCurrency,
  shippingSplitCount,
  shippingMode = "equal",
  memberCount = 0,
  readOnly = false,
  onSaveShipping,
  savingShipping = false,
  shippingError = null,
  onToggleSettle,
  settlingUserId = null,
  canManageSettle = false,
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
    shippingMode: computedMode,
    hasUnknown,
    count,
  } = orderGrandTotal ?? {};

  const shipCur = shippingCurrency ?? computedShipCurrency ?? currency;
  const mode = shippingMode ?? computedMode ?? "equal";
  const byItems = mode === "by_items";

  const [draft, setDraft] = useState("");
  const [draftSplit, setDraftSplit] = useState("");
  const [draftMode, setDraftMode] = useState(mode);

  useEffect(() => {
    const raw =
      shippingValue != null && shippingValue !== ""
        ? String(shippingValue)
        : shipping > 0
          ? String(shipping)
          : "";
    setDraft(isValidShippingNumber(raw) ? raw : "");
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

  useEffect(() => {
    setDraftMode(mode);
  }, [mode]);

  async function commitShipping(overrides = {}) {
    if (!onSaveShipping || readOnly) return;

    const nextMode = overrides.shippingMode ?? draftMode;
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : normalizeShippingNumber(trimmed);
    if (trimmed !== "" && next == null) {
      alert(t("summary.invalidShipping"));
      return;
    }

    const splitTrimmed = draftSplit.trim();
    const nextSplit = splitTrimmed === "" ? null : Math.floor(Number(splitTrimmed));
    if (
      nextMode === "equal" &&
      splitTrimmed !== "" &&
      (Number.isNaN(nextSplit) || nextSplit < 1)
    ) {
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
    const currentMode = mode;

    const valueUnchanged =
      next === current || (next == null && (current == null || current === 0));
    const splitUnchanged =
      nextSplit === currentSplit ||
      (nextSplit == null && currentSplit == null);
    const modeUnchanged = nextMode === currentMode;

    if (valueUnchanged && splitUnchanged && modeUnchanged) return;

    await onSaveShipping({
      shippingValue: next,
      shippingCurrency: shipCur,
      shippingSplitCount: nextMode === "by_items" ? nextSplit : nextSplit,
      shippingMode: nextMode,
    });
  }

  async function changeMode(nextMode) {
    setDraftMode(nextMode);
    if (readOnly || !onSaveShipping) return;
    await commitShipping({ shippingMode: nextMode });
  }

  const perPerson =
    shippingPerPerson ??
    (shipping > 0 && !byItems && draftSplit && Number(draftSplit) >= 1
      ? Math.round((shipping / Number(draftSplit)) * 100) / 100
      : null);

  return (
    <div
      className={`order-summary${embedded ? " order-summary--embedded" : " card"}`}
    >
      {!embedded && <h3 className="order-summary-title">{t("summary.title")}</h3>}

      {shippingError && (
        <p className="order-summary-error" role="alert">
          {shippingError}
        </p>
      )}

      <div className="order-summary-grid order-summary-grid--settle">
        <div className="order-summary-grid-head">
          <span>{t("summary.participants")}</span>
          <span className="order-summary-col-num">{t("summary.recordCount")}</span>
          <span className="order-summary-col-amount">{t("summary.items")}</span>
          <span className="order-summary-col-amount">{t("summary.postage")}</span>
          <span className="order-summary-col-amount">{t("summary.due")}</span>
          <span className="order-summary-col-settle">{t("summary.settle")}</span>
        </div>

        {memberTotals.map((row) => {
          const settling = settlingUserId === row.userId;
          const settled = Boolean(row.settled);
          return (
            <div
              key={`${row.userId ?? ""}-${row.name}`}
              className={`order-summary-grid-row${
                settled ? " order-summary-grid-row--settled" : ""
              }`}
            >
              <span className="order-summary-col-name">{row.name}</span>
              <span className="order-summary-col-num">{row.count}</span>
              <span className="order-summary-col-amount">
                {formatPrice(row.total, row.currency)}
                {row.hasUnknownPrice && (
                  <span className="muted fine">{t("common.withoutPrice")}</span>
                )}
              </span>
              <span className="order-summary-col-amount">
                {formatPrice(row.shippingShare ?? 0, currency)}
              </span>
              <span className="order-summary-col-amount order-summary-due">
                {formatPrice(row.due ?? row.total, currency)}
              </span>
              <span className="order-summary-col-settle">
                <button
                  type="button"
                  className={`order-settle-btn${
                    settled ? " order-settle-btn--settled" : ""
                  }`}
                  disabled={
                    !canManageSettle ||
                    readOnly ||
                    !row.userId ||
                    settling ||
                    !onToggleSettle
                  }
                  aria-pressed={settled}
                  aria-label={
                    settled
                      ? t("summary.unsettleAria", { name: row.name })
                      : t("summary.settleAria", { name: row.name })
                  }
                  title={
                    settled ? t("summary.settled") : t("summary.markSettled")
                  }
                  onClick={() => onToggleSettle?.(row.userId, !settled)}
                >
                  <span className="order-settle-icon" aria-hidden>
                    <ClipboardCheck size={18} strokeWidth={2.25} />
                    <span className="order-settle-currency">$</span>
                  </span>
                </button>
              </span>
            </div>
          );
        })}

        <div className="order-summary-grid-divider" aria-hidden />

        <div className="order-summary-grid-row order-summary-grid-row--subtotal">
          <span className="order-summary-col-name">
            <strong>{t("summary.subtotal")}</strong>
          </span>
          <span className="order-summary-col-num">
            <strong>{count ?? 0}</strong>
          </span>
          <span className="order-summary-col-amount">
            <strong>{formatPrice(itemsTotal, currency)}</strong>
            {hasUnknown && (
              <span className="muted fine">{t("common.someWithoutPrice")}</span>
            )}
          </span>
          <span className="order-summary-col-amount" />
          <span className="order-summary-col-amount" />
          <span className="order-summary-col-settle" />
        </div>

        <div className="order-summary-grid-row order-summary-grid-row--shipping">
          <span className="order-summary-col-name">
            <strong>{t("summary.shipping")}</strong>
            {!readOnly && (
              <span className="muted fine">{t("summary.shippingHint")}</span>
            )}
          </span>
          <span className="order-summary-col-num" />
          <span className="order-summary-col-amount order-summary-col-span">
            {readOnly ? (
              <strong>{formatPrice(shipping, shipCur)}</strong>
            ) : (
              <label className="order-summary-field">
                <input
                  type="text"
                  inputMode="decimal"
                  className="order-summary-field-input"
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
                <span className="order-summary-field-suffix">{shipCur}</span>
                <Pencil size={13} className="order-summary-field-icon" aria-hidden />
              </label>
            )}
          </span>
        </div>

        <div className="order-summary-grid-row order-summary-grid-row--mode">
          <span className="order-summary-col-name">
            <strong>{t("summary.shippingMode")}</strong>
            {!readOnly && (
              <span className="muted fine">{t("summary.shippingModeHint")}</span>
            )}
          </span>
          <span className="order-summary-col-num" />
          <span className="order-summary-col-amount order-summary-col-span">
            {readOnly ? (
              <span>
                {byItems
                  ? t("summary.modeByItems")
                  : t("summary.modeEqual")}
              </span>
            ) : (
              <div
                className="order-summary-mode-toggle"
                role="group"
                aria-label={t("summary.shippingMode")}
              >
                <button
                  type="button"
                  className={`order-summary-mode-btn${
                    draftMode === "equal" ? " order-summary-mode-btn--active" : ""
                  }`}
                  disabled={savingShipping}
                  onClick={() => changeMode("equal")}
                >
                  {t("summary.modeEqual")}
                </button>
                <button
                  type="button"
                  className={`order-summary-mode-btn${
                    draftMode === "by_items"
                      ? " order-summary-mode-btn--active"
                      : ""
                  }`}
                  disabled={savingShipping}
                  onClick={() => changeMode("by_items")}
                >
                  {t("summary.modeByItems")}
                </button>
              </div>
            )}
          </span>
        </div>

        {!byItems && (
          <div className="order-summary-grid-row order-summary-grid-row--split">
            <span className="order-summary-col-name">
              <strong>{t("summary.splitShipping")}</strong>
              {!readOnly && (
                <span className="muted fine">{t("summary.peopleCount")}</span>
              )}
            </span>
            <span className="order-summary-col-num" />
            <span className="order-summary-col-amount order-summary-col-span">
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
                <div className="order-summary-split-field-wrap">
                  <label className="order-summary-field order-summary-field--compact">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="order-summary-field-input order-summary-field-input--compact"
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
                    <Pencil size={13} className="order-summary-field-icon" aria-hidden />
                  </label>
                  {perPerson != null && shipping > 0 && (
                    <span className="order-summary-per-person muted fine">
                      {t("summary.perPerson", {
                        price: formatPrice(perPerson, shipCur),
                      })}
                    </span>
                  )}
                </div>
              )}
            </span>
          </div>
        )}

        {byItems && shipping > 0 && perPerson != null && (
          <div className="order-summary-grid-row order-summary-grid-row--split">
            <span className="order-summary-col-name">
              <span className="muted fine">
                {t("summary.perRecord", {
                  price: formatPrice(perPerson, shipCur),
                })}
              </span>
            </span>
            <span className="order-summary-col-num" />
            <span className="order-summary-col-amount order-summary-col-span" />
          </div>
        )}

        <div
          className="order-summary-grid-divider order-summary-grid-divider--strong"
          aria-hidden
        />

        <div className="order-summary-grid-row order-summary-grid-row--grand">
          <span className="order-summary-col-name">
            <strong>{t("summary.totalWithShipping")}</strong>
          </span>
          <span className="order-summary-col-num" />
          <span className="order-summary-col-amount order-summary-col-span">
            <strong className="order-total-value order-summary-grand-total">
              {formatPrice(total, currency)}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
