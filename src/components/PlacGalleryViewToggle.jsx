import { AlignJustify, List, Maximize2, Minimize2 } from "lucide-react";
import { PLAC_GALLERY_VIEWS } from "../hooks/usePlacGalleryView.js";
import { useLocale } from "../hooks/useLocale.jsx";

const VIEW_ICONS = {
  compact: Minimize2,
  large: Maximize2,
  list: List,
  discogs: AlignJustify,
};

const VIEW_LABEL_KEYS = {
  compact: "plac.viewCompact",
  large: "plac.viewLarge",
  list: "plac.viewList",
  discogs: "plac.viewDiscogs",
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
