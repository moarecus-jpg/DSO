import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Archive, X } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

export function CloseOrderDialog({ open, closing = false, onClose, onChoose }) {
  const { t } = useLocale();

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

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={closing ? undefined : onClose}
      role="presentation"
    >
      <div
        className="modal card modal-close-order"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-order-title"
      >
        <div className="modal-header">
          <h2 id="close-order-title">
            <Archive size={20} aria-hidden />
            {t("session.closeHow")}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={closing}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <div className="close-order-choices">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onChoose("ordered")}
              disabled={closing}
            >
              {closing ? t("session.closing") : t("session.closeAsOrdered")}
            </button>
            <p className="muted fine">{t("session.confirmCloseOrdered")}</p>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onChoose("unplaced")}
              disabled={closing}
            >
              {closing ? t("session.closing") : t("session.closeAsUnplaced")}
            </button>
            <p className="muted fine">{t("session.confirmCloseUnplaced")}</p>
          </div>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={closing}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
