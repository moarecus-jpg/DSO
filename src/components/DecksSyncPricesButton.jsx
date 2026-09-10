import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Euro, ExternalLink, X } from "lucide-react";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";

/**
 * Decks prices from Railway are US/export; EU VAT prices must be read
 * in the user's browser on decks.de (same pattern as the cart bookmarklet).
 */
export function DecksSyncPricesButton({
  sessionId,
  disabled = false,
  className = "",
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookmarkHref, setBookmarkHref] = useState(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);

  async function prepareAndOpen() {
    if (disabled || loading) return;
    setOpen(true);
    setLoading(true);
    setError(null);
    setBookmarkHref(null);
    try {
      const data = await api(`/api/sessions/${sessionId}/decks-prices/prepare`, {
        method: "POST",
      });
      setBookmarkHref(data.bookmarklet);
      setCount(data.count ?? 0);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={className || "btn btn-ghost"}
        disabled={disabled || loading}
        onClick={prepareAndOpen}
        title={t("session.decksSyncPricesHint")}
      >
        <Euro size={16} aria-hidden />
        {loading
          ? t("session.decksSyncPricesPreparing")
          : t("session.decksSyncPrices")}
      </button>

      {open
        ? createPortal(
            <div
              className="modal-overlay"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                className="modal card modal-hhv-cart"
                role="dialog"
                aria-modal="true"
                aria-labelledby="decks-sync-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2 id="decks-sync-title">
                    {t("session.decksSyncModalTitle")}
                  </h2>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setOpen(false)}
                    aria-label={t("common.close")}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <p className="muted">{t("session.decksSyncWhy")}</p>
                  {loading ? (
                    <p>{t("session.decksSyncPricesPreparing")}</p>
                  ) : error ? (
                    <p className="error-text">{error}</p>
                  ) : (
                    <>
                      <ol className="hhv-cart-steps">
                        <li>{t("session.decksSyncStep1")}</li>
                        <li>{t("session.decksSyncStep2")}</li>
                        <li>{t("session.decksSyncStep3")}</li>
                      </ol>
                      <p className="hhv-cart-drag-hint">
                        {t("session.decksSyncDragHint")}
                      </p>
                      {bookmarkHref ? (
                        <a
                          className="btn btn-primary hhv-cart-bookmark"
                          href={bookmarkHref}
                          onClick={(e) => {
                            e.preventDefault();
                            alert(t("session.decksSyncDontClick"));
                          }}
                          draggable
                          title={t("session.decksSyncBookmarkTitle", { count })}
                        >
                          <Euro size={16} aria-hidden />
                          {t("session.decksSyncBookmarkLabel", { count })}
                        </a>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="modal-actions">
                  <a
                    className="btn btn-ghost"
                    href="https://www.decks.de/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={16} aria-hidden />
                    {t("session.decksSyncOpenShop")}
                  </a>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setOpen(false)}
                  >
                    {t("common.close")}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
