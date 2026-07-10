import { Trash2 } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

export function RemoveFromOrderButton({ onRemove, removing, className = "" }) {
  const { t } = useLocale();

  if (!onRemove) return null;

  return (
    <button
      type="button"
      className={`remove-from-order ${className}`.trim()}
      onClick={onRemove}
      disabled={removing}
      title={t("items.removeFromOrderHint")}
    >
      <Trash2 size={14} aria-hidden />
      {removing ? t("items.removing") : t("items.removeFromOrder")}
    </button>
  );
}
