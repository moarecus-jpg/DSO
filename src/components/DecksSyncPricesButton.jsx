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
  autoOpen = false,
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookmarkHref, setBookmarkHref] = useState(null);
  const [count, setCount] = useState(0);
  const [error, setError] = useState(null);

  async function prepare() {
    setLoading(true);
    setError(null);
    try {
      const data = await api(`/api/sessions/${sessionId}/decks-prices/prepare`, {
        method: "POST",
      });
      setBookmarkHref(data.bookmarklet);
      setCount(data.count ?? 0);
      setOpen(true);
    } catch (err) {
      setError(err.message);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoOpen || disabled) return undefined;
    prepare();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, sessionId, disabled]);

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
        onClick={prepare}
        title={t("session.decksSyncPricesHint")}
      >
        <Euro size={16} aria-hidden />
        {loading
          ? t("session.decksSyncPricesPreparing")
          : t("session.decksSyncPrices")}
      </button>

      {open &&
        createPortal(
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={() => setOpen(false)}
          >
            <div
              className="modal shop-cart-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="decks-sync-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 id="decks-sync-title">{t("session.decksSyncModalTitle")}</h2>
                <button
                  type="button"
                  className="btn btn-ghost icon-btn"
                  onClick={() => setOpen(false)}
                  aria-label={t("common.close")}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <p>{t("session.decksSyncWhy")}</p>
                {error ? (
                  <p className="error-text">{error}</p>
                ) : (
                  <>
                    <ol className="shop-cart-steps">
                      <li>{t("session.decksSyncStep1")}</li>
                      <li>{t("session.decksSyncStep2")}</li>
                      <li>{t("session.decksSyncStep3")}</li>
                    </ol>
                    <p className="shop-cart-drag-hint">
                      {t("session.decksSyncDragHint")}
                    </p>
                    {bookmarkHref ? (
                      <p>
                        <a
                          className="btn btn-primary shop-cart-bookmark"
                          href={bookmarkHref}
                          onClick={(e) => e.preventDefault()}
                          title={t("session.decksSyncBookmarkTitle", {
                            count,
                          })}
                        >
                          {t("session.decksSyncBookmarkLabel", { count })}
                        </a>
                      </p>
                    ) : null}
                    <p className="muted">{t("session.decksSyncDontClick")}</p>
                    <p>
                      <a
                        className="btn btn-ghost"
                        href="https://www.decks.de/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={16} aria-hidden />
                        {t("session.decksSyncOpenShop")}
                      </a>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
