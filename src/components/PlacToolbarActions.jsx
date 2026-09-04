import { Plus } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

export function PlacToolbarActions({ onSell, showSell = true }) {
  const { t } = useLocale();

  if (!showSell || !onSell) return null;

  return (
    <div className="plac-toolbar-actions">
      <button type="button" className="btn btn-primary plac-sell-btn" onClick={onSell} aria-label={t("plac.sell")}>
        <Plus size={18} aria-hidden />
        <span className="ui-label">{t("plac.sell")}</span>
      </button>
    </div>
  );
}
