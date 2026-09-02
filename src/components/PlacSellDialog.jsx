import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { GRADES } from "../../shared/orderReview.js";
import { parseDiscogsRecordUrl } from "../../shared/parseRecordUrl.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { AppSelect } from "./AppSelect.jsx";

export function PlacSellDialog({ open, onClose, onCreated }) {
  const { t } = useLocale();
  const [releaseUrl, setReleaseUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [priceValue, setPriceValue] = useState("");
  const [mediaCondition, setMediaCondition] = useState(GRADES[2]);
  const [sleeveCondition, setSleeveCondition] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const gradeOptions = useMemo(
    () => GRADES.map((grade) => ({ value: grade, label: grade })),
    []
  );

  const sleeveOptions = useMemo(
    () => [
      { value: "", label: t("plac.sleeveOptional") },
      ...GRADES.map((grade) => ({ value: grade, label: grade })),
    ],
    [t]
  );

  useEffect(() => {
    if (!open) return undefined;
    setReleaseUrl("");
    setPreview(null);
    setPreviewError(null);
    setPriceValue("");
    setMediaCondition(GRADES[2]);
    setSleeveCondition("");
    setNote("");
    setError(null);
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add("modal-open");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape" && !submitting) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, submitting, onClose]);

  async function handlePreview() {
    const trimmed = releaseUrl.trim();
    const parsed = parseDiscogsRecordUrl(trimmed);
    if (!parsed.valid || parsed.releaseId == null) {
      setPreview(null);
      setPreviewError(t("plac.invalidReleaseUrl"));
      return;
    }

    setPreviewing(true);
    setPreviewError(null);
    try {
      const data = await api("/api/plac/preview", {
        method: "POST",
        body: JSON.stringify({ releaseUrl: trimmed }),
      });
      setPreview(data.release);
    } catch (err) {
      setPreview(null);
      setPreviewError(err.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { listing } = await api("/api/plac", {
        method: "POST",
        body: JSON.stringify({
          releaseUrl: releaseUrl.trim(),
          priceValue,
          mediaCondition,
          sleeveCondition: sleeveCondition || null,
          note,
        }),
      });
      onCreated?.(listing);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" onClick={() => !submitting && onClose()}>
      <div
        className="modal card modal-new-order plac-sell-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plac-sell-title"
      >
        <div className="modal-header">
          <h2 id="plac-sell-title">{t("plac.sellTitle")}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        <form className="plac-sell-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span className="label">{t("plac.releaseUrl")}</span>
            <input
              type="url"
              value={releaseUrl}
              onChange={(e) => {
                setReleaseUrl(e.target.value);
                setPreview(null);
                setPreviewError(null);
              }}
              placeholder="https://www.discogs.com/release/..."
              required
            />
            <span className="muted fine">{t("plac.releaseUrlHint")}</span>
          </label>

          <button
            type="button"
            className="btn btn-ghost plac-preview-btn"
            onClick={handlePreview}
            disabled={previewing || !releaseUrl.trim()}
          >
            {previewing ? (
              <>
                <Loader2 size={16} className="spin" aria-hidden />
                {t("plac.previewing")}
              </>
            ) : (
              t("plac.preview")
            )}
          </button>

          {previewError && <p className="form-error">{previewError}</p>}

          {preview && (
            <div className="plac-preview-card">
              {preview.thumbnailUrl && (
                <img src={preview.thumbnailUrl} alt="" className="plac-preview-cover" />
              )}
              <div>
                <p className="plac-preview-title">
                  {[preview.artist, preview.title].filter(Boolean).join(" — ")}
                </p>
                <ul className="plac-preview-meta muted fine">
                  {preview.year != null && <li>{t("plac.year")}: {preview.year}</li>}
                  {preview.genre && <li>{t("plac.genre")}: {preview.genre}</li>}
                  {preview.country && <li>{t("plac.country")}: {preview.country}</li>}
                  {preview.format && <li>{t("plac.format")}: {preview.format}</li>}
                </ul>
              </div>
            </div>
          )}

          <label className="form-field">
            <span className="label">{t("plac.price")}</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span className="label">{t("plac.mediaCondition")}</span>
            <AppSelect
              value={mediaCondition}
              onChange={setMediaCondition}
              options={gradeOptions}
              ariaLabel={t("plac.mediaCondition")}
            />
          </label>

          <label className="form-field">
            <span className="label">{t("plac.sleeveCondition")}</span>
            <AppSelect
              value={sleeveCondition}
              onChange={setSleeveCondition}
              options={sleeveOptions}
              ariaLabel={t("plac.sleeveCondition")}
            />
          </label>

          <label className="form-field">
            <span className="label">{t("plac.note")}</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("plac.notePlaceholder")}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-card-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !preview}>
              {submitting ? t("plac.publishing") : t("plac.publish")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
