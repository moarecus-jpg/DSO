import { useEffect, useMemo, useState } from "react";
import { Disc3, X } from "lucide-react";
import { parseDiscogsUrlList } from "../../shared/parseRecordUrl.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function AddRecordModal({
  open,
  onClose,
  onSubmit,
  submitting,
  sellerUsername,
}) {
  const { t } = useLocale();
  const [urlsText, setUrlsText] = useState("");
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!open) {
      setUrlsText("");
      setProgress(null);
    }
  }, [open]);

  const { valid: validUrls, invalid: invalidUrls } = useMemo(
    () => parseDiscogsUrlList(urlsText),
    [urlsText]
  );

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validUrls.length) {
      alert(
        invalidUrls.length ? t("items.noValidLinks") : t("items.enterAtLeastOne")
      );
      return;
    }

    setProgress({ current: 0, total: validUrls.length });
    try {
      const result = await onSubmit({
        urls: validUrls,
        onProgress: setProgress,
      });
      if (result?.ok !== false) {
        setUrlsText("");
        setProgress(null);
        onClose();
      }
    } catch (err) {
      alert(err.message ?? t("session.addFailed"));
    } finally {
      setProgress(null);
    }
  }

  const busy = submitting || progress != null;
  const submitLabel =
    progress && progress.total > 0
      ? t("items.adding", { current: progress.current, total: progress.total })
      : validUrls.length === 0
        ? t("items.add")
        : validUrls.length === 1
          ? t("items.addOne")
          : t("items.addMany", { count: validUrls.length });

  return (
    <div
      className="modal-overlay"
      onClick={busy ? undefined : onClose}
      role="presentation"
    >
      <div className="modal card modal-add-record" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Disc3 size={20} />
            {t("items.addItem")}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-link-form">
          <p className="muted fine">{t("items.linksHint", { seller: sellerUsername })}</p>
          <label>
            {t("items.linksLabel")}
            <textarea
              className="modal-urls-textarea"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              placeholder={
                "https://www.discogs.com/sell/item/123\nhttps://www.discogs.com/shop/item/456"
              }
              rows={6}
              autoFocus
              disabled={busy}
            />
          </label>
          {validUrls.length > 0 && (
            <p className="muted fine">
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
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || validUrls.length === 0}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
