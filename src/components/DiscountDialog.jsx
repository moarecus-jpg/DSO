import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Percent, X } from "lucide-react";
import {
  formatPrice,
  isLinkUnavailable,
  linkDiscountApplies,
  recordTitle,
} from "../../shared/orderTotals.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function DiscountDialog({
  open,
  links = [],
  discountPercent = 0,
  saving = false,
  onClose,
  onSave,
}) {
  const { t } = useLocale();
  const eligibleLinks = useMemo(
    () =>
      (links ?? []).filter(
        (link) => !link.blurred && !isLinkUnavailable(link)
      ),
    [links]
  );

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [draftPercent, setDraftPercent] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add("modal-open");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const next = new Set();
    for (const link of eligibleLinks) {
      if (linkDiscountApplies(link)) next.add(String(link.id));
    }
    setSelectedIds(next);
    const value = Number(discountPercent);
    setDraftPercent(
      Number.isFinite(value) && value > 0 ? String(value) : ""
    );
  }, [open, eligibleLinks, discountPercent]);

  if (!open) return null;

  const allSelected =
    eligibleLinks.length > 0 &&
    eligibleLinks.every((link) => selectedIds.has(String(link.id)));

  function toggleLink(linkId) {
    const id = String(linkId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(eligibleLinks.map((link) => String(link.id))));
  }

  async function handleConfirm() {
    const trimmed = draftPercent.trim();
    const nextDiscount =
      trimmed === "" ? 0 : Number(trimmed.replace(",", "."));
    if (
      trimmed !== "" &&
      (Number.isNaN(nextDiscount) || nextDiscount < 0 || nextDiscount > 100)
    ) {
      alert(t("summary.invalidDiscount"));
      return;
    }
    if (nextDiscount > 0 && selectedIds.size === 0) {
      alert(t("summary.discountNeedItems"));
      return;
    }
    await onSave?.({
      discountPercent: nextDiscount || 0,
      discountLinkIds: [...selectedIds],
    });
  }

  return createPortal(
    <div
      className="modal-overlay"
      onClick={saving ? undefined : onClose}
      role="presentation"
    >
      <div
        className="modal card modal-discount"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discount-dialog-title"
      >
        <div className="modal-header">
          <h2 id="discount-dialog-title">
            <Percent size={20} aria-hidden />
            {t("summary.discountDialogTitle")}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body modal-discount-body">
          <p className="muted fine">{t("summary.discountDialogHint")}</p>

          {eligibleLinks.length === 0 ? (
            <p className="muted">{t("summary.discountNoItems")}</p>
          ) : (
            <>
              <div className="discount-dialog-toolbar">
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  onClick={toggleAll}
                  disabled={saving}
                >
                  {allSelected
                    ? t("summary.discountClearAll")
                    : t("summary.discountSelectAll")}
                </button>
                <span className="muted fine">
                  {t("summary.discountSelectedCount", {
                    count: selectedIds.size,
                    total: eligibleLinks.length,
                  })}
                </span>
              </div>

              <ul className="discount-dialog-list">
                {eligibleLinks.map((link) => {
                  const id = String(link.id);
                  const checked = selectedIds.has(id);
                  return (
                    <li key={id}>
                      <label className="discount-dialog-item">
                        <span className="ui-check ui-check--lg">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={saving}
                            onChange={() => toggleLink(id)}
                          />
                        </span>
                        <span className="discount-dialog-item-text">
                          <span className="discount-dialog-item-title">
                            {recordTitle(link)}
                          </span>
                          <span className="discount-dialog-item-meta muted fine">
                            {link.user_name ?? t("common.unknown")}
                            {" · "}
                            {formatPrice(link.price_value, link.price_currency)}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <label className="discount-dialog-percent">
            <span className="modal-field-label">
              {t("summary.discountPercentLabel")}
            </span>
            <span className="order-summary-field order-summary-field--compact">
              <input
                type="text"
                inputMode="decimal"
                className="order-summary-field-input order-summary-field-input--compact"
                value={draftPercent}
                onChange={(e) => setDraftPercent(e.target.value)}
                placeholder="0"
                disabled={saving}
                aria-label={t("summary.discountAria")}
              />
              <span className="order-summary-field-suffix">%</span>
            </span>
          </label>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={saving || eligibleLinks.length === 0}
          >
            {saving ? t("common.saving") : t("summary.discountConfirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
