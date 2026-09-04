import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { GRADES } from "../../shared/orderReview.js";
import { placListingTitle, PLAC_CATEGORIES, PLAC_OTHER_CONDITIONS } from "../../shared/plac.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { AppSelect } from "./AppSelect.jsx";

export function PlacEditDialog({ open, listing, onClose, onSaved }) {
  const { t } = useLocale();
  const isVinyl = listing?.listingType !== "other";
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("equipment");
  const [priceValue, setPriceValue] = useState("");
  const [mediaCondition, setMediaCondition] = useState(GRADES[2]);
  const [otherCondition, setOtherCondition] = useState(PLAC_OTHER_CONDITIONS[2]);
  const [sleeveCondition, setSleeveCondition] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const gradeOptions = useMemo(
    () => GRADES.map((grade) => ({ value: grade, label: grade })),
    []
  );
  const otherConditionOptions = useMemo(
    () => PLAC_OTHER_CONDITIONS.map((value) => ({ value, label: value })),
    []
  );
  const categoryOptions = useMemo(
    () =>
      PLAC_CATEGORIES.filter((value) => value !== "vinyl").map((value) => ({
        value,
        label: t(`plac.category.${value}`),
      })),
    [t]
  );
  const sleeveOptions = useMemo(
    () => [
      { value: "", label: t("plac.sleeveOptional") },
      ...GRADES.map((grade) => ({ value: grade, label: grade })),
    ],
    [t]
  );

  useEffect(() => {
    if (!open || !listing) return;
    setTitle(listing.title ?? "");
    setBrand(listing.artist ?? "");
    setCategory(listing.category && listing.category !== "vinyl" ? listing.category : "equipment");
    setPriceValue(String(listing.originalPriceValue ?? listing.priceValue ?? ""));
    if (isVinyl) {
      setMediaCondition(listing.mediaCondition || GRADES[2]);
      setSleeveCondition(listing.sleeveCondition || "");
    } else {
      setOtherCondition(listing.mediaCondition || PLAC_OTHER_CONDITIONS[2]);
    }
    setNote(listing.note ?? "");
    setError(null);
    setSubmitting(false);
  }, [open, listing, isVinyl]);

  if (!open || !listing) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        priceValue: Number(priceValue),
        note,
      };
      if (isVinyl) {
        body.mediaCondition = mediaCondition;
        body.sleeveCondition = sleeveCondition || null;
      } else {
        body.title = title.trim();
        body.artist = brand.trim() || null;
        body.category = category;
        body.mediaCondition = otherCondition;
      }
      const { listing: updated } = await api(`/api/plac/${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved?.(updated);
      onClose?.();
    } catch (err) {
      setError(err.message ?? t("plac.editFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal card modal-new-order plac-sell-dialog plac-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plac-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header plac-sell-header">
          <div className="plac-sell-header-text">
            <p className="plac-sell-eyebrow">{t("plac.mine")}</p>
            <h2 id="plac-edit-title">{t("plac.editTitle")}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </div>

        <form className="plac-sell-form" onSubmit={handleSubmit}>
          <p className="muted fine plac-edit-listing-label">{placListingTitle(listing)}</p>

          <div className="plac-sell-fields">
            {!isVinyl && (
              <>
                <label className="plac-sell-field plac-sell-field--wide">
                  <span className="plac-sell-label">{t("plac.itemTitle")}</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </label>
                <label className="plac-sell-field">
                  <span className="plac-sell-label">{t("plac.brand")}</span>
                  <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} />
                </label>
                <label className="plac-sell-field">
                  <span className="plac-sell-label">{t("plac.categoryLabel")}</span>
                  <AppSelect
                    value={category}
                    onChange={setCategory}
                    options={categoryOptions}
                    ariaLabel={t("plac.categoryLabel")}
                  />
                </label>
              </>
            )}

            <label className="plac-sell-field">
              <span className="plac-sell-label">{t("plac.price")}</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                required
              />
              {listing.discountPercent > 0 && (
                <span className="muted fine">{t("plac.editPriceHint")}</span>
              )}
            </label>

            {isVinyl ? (
              <>
                <label className="plac-sell-field">
                  <span className="plac-sell-label">{t("plac.mediaCondition")}</span>
                  <AppSelect
                    value={mediaCondition}
                    onChange={setMediaCondition}
                    options={gradeOptions}
                    ariaLabel={t("plac.mediaCondition")}
                  />
                </label>
                <label className="plac-sell-field">
                  <span className="plac-sell-label">{t("plac.sleeveCondition")}</span>
                  <AppSelect
                    value={sleeveCondition}
                    onChange={setSleeveCondition}
                    options={sleeveOptions}
                    ariaLabel={t("plac.sleeveCondition")}
                  />
                </label>
              </>
            ) : (
              <label className="plac-sell-field">
                <span className="plac-sell-label">{t("plac.itemCondition")}</span>
                <AppSelect
                  value={otherCondition}
                  onChange={setOtherCondition}
                  options={otherConditionOptions}
                  ariaLabel={t("plac.itemCondition")}
                />
              </label>
            )}

            <label className="plac-sell-field plac-sell-field--wide">
              <span className="plac-sell-label">{t("plac.note")}</span>
              <textarea
                className="plac-sell-textarea plac-sell-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("plac.notePlaceholder")}
              />
            </label>
          </div>

          {error && <p className="form-error plac-sell-error">{error}</p>}

          <div className="plac-sell-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting && <Loader2 size={16} className="spin" aria-hidden />}
              {submitting ? t("plac.saving") : t("plac.saveListing")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
