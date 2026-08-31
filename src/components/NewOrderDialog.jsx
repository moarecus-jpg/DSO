import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { NewOrderForm } from "./NewOrderForm.jsx";

export function NewOrderDialog({ open, onClose }) {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    setError(null);
    setFormKey((key) => key + 1);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add("modal-open");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event) {
      if (event.key === "Escape" && !creating) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, creating, onClose]);

  async function handleCreate({ store, sellerUsername }) {
    setError(null);
    setCreating(true);
    try {
      const body =
        store && store !== "discogs"
          ? { store }
          : { store: "discogs", sellerUsername };
      const { session } = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify(body),
      });
      onClose();
      navigate(`/session/${session.id}?add=1`, { replace: true });
    } catch (err) {
      setError(err.message ?? t("orders.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={creating ? undefined : onClose}
      role="presentation"
    >
      <div
        className="modal card modal-new-order"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-order-title"
      >
        <div className="modal-header">
          <h2 id="new-order-title">
            <Plus size={20} aria-hidden />
            {t("orders.newOrder")}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={creating}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>
        <NewOrderForm
          key={formKey}
          inModal
          onSubmit={handleCreate}
          onCancel={onClose}
          creating={creating}
          error={error}
        />
      </div>
    </div>,
    document.body
  );
}
