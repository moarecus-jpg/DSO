import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { Disc3, Loader2, Package, Plus, X } from "lucide-react";
import { GRADES } from "../../shared/orderReview.js";
import { parseDiscogsUrlList } from "../../shared/parseRecordUrl.js";
import { formatPrice } from "../../shared/orderTotals.js";
import {
  isSupportedPlacDiscogsUrl,
  PLAC_CATEGORIES,
  PLAC_OTHER_CONDITIONS,
} from "../../shared/plac.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { AppSelect } from "./AppSelect.jsx";

function releaseTitle(release) {
  return [release.artist, release.title].filter(Boolean).join(" — ") || "—";
}

function PlacBatchProgress({ progress, t }) {
  if (!progress || progress.total <= 1) return null;

  const pct = Math.min(100, Math.round((progress.current / progress.total) * 100));
  const label =
    progress.phase === "publish"
      ? t("plac.publishProgress", { current: progress.current, total: progress.total })
      : t("plac.previewProgress", { current: progress.current, total: progress.total });

  return (
    <div
      className="plac-batch-progress"
      role="progressbar"
      aria-valuenow={progress.current}
      aria-valuemin={0}
      aria-valuemax={progress.total}
      aria-label={label}
    >
      <div className="plac-batch-progress-head">
        <span className="plac-batch-progress-label">{label}</span>
        <span className="plac-batch-progress-pct muted fine">{pct}%</span>
      </div>
      <div className="plac-batch-progress-track">
        <div className="plac-batch-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PlacSellDialog({ open, onClose, onCreated }) {
  const { t } = useLocale();
  const [listingType, setListingType] = useState("vinyl");
  const [urlsText, setUrlsText] = useState("");
  const [previews, setPreviews] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [previewing, setPreviewing] = useState(false);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("equipment");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [priceValue, setPriceValue] = useState("");
  const [mediaCondition, setMediaCondition] = useState(GRADES[2]);
  const [otherCondition, setOtherCondition] = useState(PLAC_OTHER_CONDITIONS[2]);
  const [sleeveCondition, setSleeveCondition] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [error, setError] = useState(null);

  const { valid: parsedUrls, invalid: invalidUrls } = useMemo(
    () => parseDiscogsUrlList(urlsText),
    [urlsText]
  );

  const validUrls = useMemo(
    () => parsedUrls.filter((url) => isSupportedPlacDiscogsUrl(url)),
    [parsedUrls]
  );

  const unsupportedUrls = useMemo(
    () => parsedUrls.filter((url) => !isSupportedPlacDiscogsUrl(url)),
    [parsedUrls]
  );

  const previewsFromListings = useMemo(
    () => previews.some((row) => row.fromListing),
    [previews]
  );

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
    if (!open) return undefined;
    setListingType("vinyl");
    setUrlsText("");
    setPreviews([]);
    setPreviewErrors([]);
    setTitle("");
    setBrand("");
    setCategory("equipment");
    setThumbnailUrl("");
    setExternalUrl("");
    setPriceValue("");
    setMediaCondition(GRADES[2]);
    setOtherCondition(PLAC_OTHER_CONDITIONS[2]);
    setSleeveCondition("");
    setNote("");
    setError(null);
    setSubmitting(false);
    setBatchProgress(null);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add("modal-open");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape" && !submitting && !previewing) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, submitting, previewing, onClose]);

  function clearPreviews() {
    setPreviews([]);
    setPreviewErrors([]);
  }

  function applyPreviewDefaults(releases) {
    const firstWithPrice = releases.find((row) => row.priceValue != null);
    if (firstWithPrice?.priceValue != null) {
      setPriceValue(String(firstWithPrice.priceValue));
    }
    const firstWithMedia = releases.find((row) => row.mediaCondition);
    if (firstWithMedia?.mediaCondition) {
      setMediaCondition(firstWithMedia.mediaCondition);
    }
    const firstWithSleeve = releases.find((row) => row.sleeveCondition);
    if (firstWithSleeve?.sleeveCondition) {
      setSleeveCondition(firstWithSleeve.sleeveCondition);
    }
  }

  async function handlePreview() {
    setPreviewErrors([]);
    setError(null);

    if (validUrls.length === 0) {
      if (!urlsText.trim()) {
        setError(t("plac.noUrlsEntered"));
      } else if (parsedUrls.length > 0) {
        setError(t("plac.noSupportedUrls"));
      } else {
        setError(t("plac.invalidUrls"));
      }
      return;
    }

    setPreviewing(true);
    setBatchProgress({ current: 0, total: validUrls.length, phase: "preview" });
    const releases = [];
    const errors = [];

    try {
      for (let index = 0; index < validUrls.length; index += 1) {
        const releaseUrl = validUrls[index];
        try {
          const data = await api("/api/plac/preview-batch", {
            method: "POST",
            body: JSON.stringify({ releaseUrls: [releaseUrl] }),
          });
          releases.push(...(data.releases ?? []));
          errors.push(...(data.errors ?? []));
        } catch (err) {
          errors.push({ releaseUrl, error: err.message });
        }
        setBatchProgress({ current: index + 1, total: validUrls.length, phase: "preview" });
        if (releases.length > 0) {
          setPreviews([...releases]);
        }
      }

      setPreviews(releases);
      setPreviewErrors(errors);
      if (releases.length > 0) {
        applyPreviewDefaults(releases);
      } else {
        setError(errors[0]?.error ?? t("plac.previewFailed"));
      }
    } catch (err) {
      setPreviews([]);
      setPreviewErrors([]);
      setError(err.message);
    } finally {
      setPreviewing(false);
      setBatchProgress(null);
    }
  }

  const canSubmitVinyl =
    previews.length > 0 &&
    (previews.every((row) => row.fromListing && row.priceValue != null) ||
      (Boolean(priceValue) && Boolean(mediaCondition)));
  const canSubmitOther = Boolean(title.trim() && priceValue);

  const publishLabel = useMemo(() => {
    if (submitting && batchProgress?.phase === "publish") {
      return t("plac.publishProgress", {
        current: batchProgress.current,
        total: batchProgress.total,
      });
    }
    if (submitting) {
      return previews.length > 1 ? t("plac.publishingMany") : t("plac.publishing");
    }
    if (listingType === "vinyl" && previews.length > 1) {
      return t("plac.publishMany", { count: previews.length });
    }
    return t("plac.publish");
  }, [submitting, batchProgress, listingType, previews.length, t]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (listingType === "other") {
        const { listing } = await api("/api/plac", {
          method: "POST",
          body: JSON.stringify({
            listingType: "other",
            title: title.trim(),
            brand: brand.trim() || null,
            category,
            thumbnailUrl: thumbnailUrl.trim() || null,
            externalUrl: externalUrl.trim() || null,
            priceValue,
            mediaCondition: otherCondition,
            note,
          }),
        });
        onCreated?.([listing]);
        onClose();
        return;
      }

      if (previews.length === 1) {
        const { listing } = await api("/api/plac", {
          method: "POST",
          body: JSON.stringify({
            listingType: "vinyl",
            releaseUrl: previews[0].releaseUrl ?? validUrls[0],
            priceValue,
            mediaCondition,
            sleeveCondition: sleeveCondition || null,
            note,
          }),
        });
        onCreated?.([listing]);
        onClose();
        return;
      }

      const publishUrls = previews.map((row) => row.releaseUrl).filter(Boolean);
      const listings = [];
      const errors = [];

      setBatchProgress({ current: 0, total: publishUrls.length, phase: "publish" });

      for (let index = 0; index < publishUrls.length; index += 1) {
        const releaseUrl = publishUrls[index];
        try {
          const data = await api("/api/plac/batch", {
            method: "POST",
            body: JSON.stringify({
              releaseUrls: [releaseUrl],
              priceValue,
              mediaCondition,
              sleeveCondition: sleeveCondition || null,
              note,
            }),
          });
          listings.push(...(data.listings ?? []));
          errors.push(...(data.errors ?? []));
        } catch (err) {
          errors.push({ releaseUrl, error: err.message });
        }
        setBatchProgress({ current: index + 1, total: publishUrls.length, phase: "publish" });
      }

      setBatchProgress(null);

      if (errors.length) {
        setPreviewErrors(errors);
      }

      if (listings.length) {
        onCreated?.(listings);
        onClose();
      } else {
        setError(errors[0]?.error ?? t("plac.batchFailed"));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setBatchProgress(null);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" onClick={() => !submitting && !previewing && onClose()}>
      <div
        className="modal card modal-new-order plac-sell-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plac-sell-title"
      >
        <div className="modal-header plac-sell-header">
          <div className="plac-sell-header-text">
            <p className="plac-sell-eyebrow">{t("plac.title")}</p>
            <h2 id="plac-sell-title">{t("plac.sellTitle")}</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={submitting || previewing}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="plac-sell-type-tabs" role="tablist" aria-label={t("plac.listingType")}>
          <button
            type="button"
            role="tab"
            aria-selected={listingType === "vinyl"}
            className={`plac-sell-type-tab${listingType === "vinyl" ? " active" : ""}`}
            onClick={() => setListingType("vinyl")}
          >
            <Disc3 size={16} aria-hidden />
            {t("plac.typeVinyl")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listingType === "other"}
            className={`plac-sell-type-tab${listingType === "other" ? " active" : ""}`}
            onClick={() => setListingType("other")}
          >
            <Package size={16} aria-hidden />
            {t("plac.typeOther")}
          </button>
        </div>

        <form className="plac-sell-form" onSubmit={handleSubmit}>
          <div className="plac-sell-scroll">
            {listingType === "vinyl" ? (
              <>
                <section className="plac-sell-section">
                  <div className="plac-sell-section-head">
                    <h3>{t("plac.releaseUrl")}</h3>
                    <p className="muted fine">{t("plac.releaseUrlsHint")}</p>
                  </div>
                  <textarea
                    className="plac-sell-textarea modal-urls-textarea"
                    value={urlsText}
                    onChange={(e) => {
                      setUrlsText(e.target.value);
                      clearPreviews();
                      setError(null);
                    }}
                    placeholder={"https://www.discogs.com/sell/item/123\nhttps://www.discogs.com/release/456"}
                    rows={4}
                    disabled={previewing || submitting}
                  />
                  {validUrls.length > 0 && (
                    <p className="plac-sell-hint muted fine">
                      {validUrls.length === 1
                        ? t("items.validLinkOne")
                        : t("items.validLinkMany", { count: validUrls.length })}
                    </p>
                  )}
                  {invalidUrls.length > 0 && (
                    <p className="form-error fine">
                      {invalidUrls.length === 1
                        ? t("items.invalidLineOne")
                        : t("items.invalidLineMany", { count: invalidUrls.length })}
                    </p>
                  )}
                  {unsupportedUrls.length > 0 && (
                    <p className="form-error fine">{t("plac.unsupportedUrlHint")}</p>
                  )}
                  {(error || previewErrors.length > 0) && (
                    <div className="plac-sell-inline-errors">
                      {error && <p className="form-error fine">{error}</p>}
                      {previewErrors.map((row) => (
                        <p key={row.releaseUrl} className="form-error fine">
                          {row.releaseUrl}: {row.error}
                        </p>
                      ))}
                    </div>
                  )}
                  <PlacBatchProgress progress={previewing ? batchProgress : null} t={t} />
                  <button
                    type="button"
                    className="btn btn-ghost plac-preview-btn"
                    onClick={handlePreview}
                    disabled={previewing || submitting}
                  >
                    {previewing ? (
                      <>
                        <Loader2 size={16} className="spin" aria-hidden />
                        {batchProgress
                          ? t("plac.previewProgress", {
                              current: batchProgress.current,
                              total: batchProgress.total,
                            })
                          : t("plac.previewing")}
                      </>
                    ) : (
                      <>
                        <Plus size={16} aria-hidden />
                        {t("plac.preview")}
                      </>
                    )}
                  </button>
                </section>

                {previews.length > 0 && (
                  <section className="plac-sell-section">
                    <div className="plac-sell-section-head">
                      <h3>{t("plac.previewSection")}</h3>
                      <p className="muted fine">
                        {previews.length === 1
                          ? t("plac.previewLoadedOne")
                          : t("plac.previewLoadedMany", { count: previews.length })}
                      </p>
                    </div>
                    <div className="plac-preview-grid">
                      {previews.map((release) => (
                        <article
                          key={release.listingId ?? release.releaseUrl ?? release.releaseId}
                          className="plac-preview-card"
                        >
                          {release.thumbnailUrl ? (
                            <img src={release.thumbnailUrl} alt="" className="plac-preview-cover" />
                          ) : (
                            <div className="plac-preview-cover plac-preview-cover--empty" aria-hidden />
                          )}
                          <div className="plac-preview-body">
                            <p className="plac-preview-title">{releaseTitle(release)}</p>
                            <ul className="plac-preview-meta muted fine">
                              {release.year != null && <li>{release.year}</li>}
                              {release.format && <li>{release.format}</li>}
                              {release.genre && <li>{release.genre}</li>}
                              {release.fromListing && release.priceValue != null && (
                                <li>{formatPrice(release.priceValue)}</li>
                              )}
                              {release.fromListing && release.mediaCondition && (
                                <li>{release.mediaCondition}</li>
                              )}
                            </ul>
                            {release.fromListing && (
                              <span className="plac-preview-badge">{t("plac.fromDiscogsListing")}</span>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {previewErrors.length > 0 && previews.length > 0 && (
                  <div className="plac-sell-warnings">
                    {previewErrors.map((row) => (
                      <p key={row.releaseUrl} className="form-error fine">
                        {row.releaseUrl}: {row.error}
                      </p>
                    ))}
                  </div>
                )}

                <section className="plac-sell-section">
                  <div className="plac-sell-section-head">
                    <h3>{t("plac.sharedSettings")}</h3>
                    {previews.length > 1 && (
                      <p className="muted fine">
                        {previewsFromListings
                          ? t("plac.sharedSettingsListingHint")
                          : t("plac.sharedSettingsHint")}
                      </p>
                    )}
                  </div>

                  <div className="plac-sell-fields">
                    <label className="plac-sell-field">
                      <span className="plac-sell-label">{t("plac.price")}</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={priceValue}
                        onChange={(e) => setPriceValue(e.target.value)}
                        required={!previews.every((row) => row.fromListing && row.priceValue != null)}
                      />
                      {previewsFromListings && (
                        <span className="muted fine">{t("plac.priceListingHint")}</span>
                      )}
                    </label>

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

                    <label className="plac-sell-field plac-sell-field--wide">
                      <span className="plac-sell-label">{t("plac.note")}</span>
                      <textarea
                        className="plac-sell-textarea plac-sell-note"
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t("plac.notePlaceholder")}
                      />
                    </label>
                  </div>
                </section>
              </>
            ) : (
              <section className="plac-sell-section">
                <div className="plac-sell-fields">
                  <label className="plac-sell-field plac-sell-field--wide">
                    <span className="plac-sell-label">{t("plac.itemTitle")}</span>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t("plac.itemTitlePlaceholder")}
                      required
                    />
                  </label>

                  <label className="plac-sell-field">
                    <span className="plac-sell-label">{t("plac.brand")}</span>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder={t("plac.brandPlaceholder")}
                    />
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

                  <label className="plac-sell-field plac-sell-field--wide">
                    <span className="plac-sell-label">{t("plac.imageUrl")}</span>
                    <input
                      type="url"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    <span className="muted fine">{t("plac.imageUrlHint")}</span>
                  </label>

                  <label className="plac-sell-field plac-sell-field--wide">
                    <span className="plac-sell-label">{t("plac.externalUrl")}</span>
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    <span className="muted fine">{t("plac.externalUrlHint")}</span>
                  </label>

                  <label className="plac-sell-field">
                    <span className="plac-sell-label">{t("plac.itemCondition")}</span>
                    <AppSelect
                      value={otherCondition}
                      onChange={setOtherCondition}
                      options={otherConditionOptions}
                      ariaLabel={t("plac.itemCondition")}
                    />
                  </label>

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
                  </label>

                  <label className="plac-sell-field plac-sell-field--wide">
                    <span className="plac-sell-label">{t("plac.note")}</span>
                    <textarea
                      className="plac-sell-textarea plac-sell-note"
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={t("plac.notePlaceholder")}
                    />
                  </label>
                </div>
              </section>
            )}
          </div>

          <PlacBatchProgress progress={submitting ? batchProgress : null} t={t} />

          {error && <p className="form-error plac-sell-error">{error}</p>}

          <div className="plac-sell-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting || previewing}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                submitting ||
                previewing ||
                (listingType === "vinyl" ? !canSubmitVinyl : !canSubmitOther)
              }
            >
              {submitting && <Loader2 size={16} className="spin" aria-hidden />}
              {publishLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
