import { LayoutGrid, List, Maximize2 } from "lucide-react";
import { PLAC_GALLERY_VIEWS } from "../hooks/usePlacGalleryView.js";
import { useLocale } from "../hooks/useLocale.jsx";

const VIEW_ICONS = {
  default: LayoutGrid,
  large: Maximize2,
  list: List,
};

const VIEW_LABEL_KEYS = {
  default: "plac.viewDefault",
  large: "plac.viewLarge",
  list: "plac.viewList",
};

export function PlacGalleryViewToggle({ view, onChange, className = "" }) {
  const { t } = useLocale();

  return (
    <div
      className={`plac-gallery-view-toggle ${className}`.trim()}
      role="group"
      aria-label={t("plac.galleryView")}
    >
      {PLAC_GALLERY_VIEWS.map((option) => {
        const Icon = VIEW_ICONS[option];
        const active = view === option;
        return (
          <button
            key={option}
            type="button"
            className={`plac-gallery-view-btn${active ? " active" : ""}`}
            onClick={() => onChange(option)}
            aria-pressed={active}
            title={t(VIEW_LABEL_KEYS[option])}
          >
            <Icon size={16} aria-hidden />
            <span className="plac-gallery-view-label">{t(VIEW_LABEL_KEYS[option])}</span>
          </button>
        );
      })}
    </div>
  );
}
