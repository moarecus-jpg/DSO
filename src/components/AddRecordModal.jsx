import { useEffect, useMemo, useState } from "react";
import { Disc3, X } from "lucide-react";
import { parseDiscogsUrlList } from "../../shared/parseRecordUrl.js";

export function AddRecordModal({
  open,
  onClose,
  onSubmit,
  submitting,
  sellerUsername,
}) {
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
        invalidUrls.length
          ? "Nobena povezava ni veljavna. Preveri format (/sell/item/… ali /shop/item/…)."
          : "Vnesi vsaj eno Discogs povezavo (ena na vrstico)."
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
      alert(err.message ?? "Napaka pri dodajanju.");
    } finally {
      setProgress(null);
    }
  }

  const busy = submitting || progress != null;
  const submitLabel =
    progress && progress.total > 0
      ? `Dodajam ${progress.current}/${progress.total}…`
      : validUrls.length === 0
        ? "Dodaj"
        : validUrls.length === 1
          ? "Dodaj 1 item"
          : `Dodaj ${validUrls.length} itemov`;

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
            Dodaj Item
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Zapri"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-link-form">
          <p className="muted fine">
            Prilepi eno ali več povezav do listingov pri sellerju{" "}
            <strong>@{sellerUsername}</strong> — <strong>ena na vrstico</strong>.
          </p>
          <label>
            Povezave do itemov
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
                ? "1 veljavna povezava"
                : `${validUrls.length} veljavnih povezav`}
            </p>
          )}
          {invalidUrls.length > 0 && (
            <p className="form-error fine">
              {invalidUrls.length === 1
                ? "1 vrstica ni veljavna Discogs povezava"
                : `${invalidUrls.length} vrstic ni veljavnih Discogs povezav`}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Prekliči
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
