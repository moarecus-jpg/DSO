import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import {
  PLAC_FACET_DEFAULT_OPEN,
  PLAC_FACET_KEYS,
} from "../../shared/placFacets.js";
import { useLocale } from "../hooks/useLocale.jsx";

const INITIAL_VISIBLE = 7;

function FacetGroup({
  facetKey,
  options,
  selectedValues,
  onToggle,
  optionLabel,
  defaultOpen,
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? options : options.slice(0, INITIAL_VISIBLE);
  const canShowMore = options.length > INITIAL_VISIBLE;
  const isChip = facetKey === "country";
  const activeInGroup = selectedValues.length;

  if (options.length === 0) return null;

  return (
    <section className={`plac-dig-facet${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="plac-dig-facet-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="plac-dig-facet-title">
          {t(`plac.facets.${facetKey}`)}
          {activeInGroup > 0 && (
            <span className="plac-dig-facet-active-count">{activeInGroup}</span>
          )}
        </span>
        {open ? (
          <ChevronDown size={16} aria-hidden className="plac-dig-facet-chevron" />
        ) : (
          <ChevronRight size={16} aria-hidden className="plac-dig-facet-chevron" />
        )}
      </button>

      {open && (
        <div className="plac-dig-facet-body">
          <div
            className={
              isChip ? "plac-dig-facet-chips" : "plac-dig-facet-pills"
            }
            role="group"
            aria-label={t(`plac.facets.${facetKey}`)}
          >
            {visible.map((opt) => {
              const active = selectedValues.includes(opt.value);
              const label = optionLabel(facetKey, opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`plac-dig-facet-option${active ? " is-active" : ""}${
                    isChip ? " plac-dig-facet-option--chip" : ""
                  }`}
                  aria-pressed={active}
                  onClick={() => onToggle(facetKey, opt.value)}
                >
                  <span className="plac-dig-facet-option-label">{label}</span>
                  <span className="plac-dig-facet-option-count">{opt.count}</span>
                </button>
              );
            })}
          </div>
          {canShowMore && (
            <button
              type="button"
              className="plac-dig-facet-more"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? t("plac.facets.showLess") : t("plac.facets.showMore")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export function PlacDigFiltersToggle({ open, onOpenChange, activeCount = 0 }) {
  const { t } = useLocale();

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm plac-dig-filters-toggle${
        open ? " is-active" : ""
      }`}
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
    >
      <SlidersHorizontal size={16} aria-hidden />
      {t("plac.facets.filters")}
      {activeCount > 0 && (
        <span className="plac-dig-filters-badge">{activeCount}</span>
      )}
    </button>
  );
}

export function PlacDigFilters({ options, selected, onChange, open }) {
  const { t } = useLocale();

  function toggle(facetKey, value) {
    const current = selected[facetKey] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...selected, [facetKey]: next });
  }

  function clearAll() {
    onChange(Object.fromEntries(PLAC_FACET_KEYS.map((key) => [key, []])));
  }

  const activeCount = useMemo(
    () =>
      PLAC_FACET_KEYS.reduce((sum, key) => sum + (selected[key]?.length ?? 0), 0),
    [selected]
  );

  function optionLabel(facetKey, value) {
    if (facetKey === "category") {
      const key = `plac.category.${value}`;
      const translated = t(key);
      return translated === key ? value : translated;
    }
    if (facetKey === "price") {
      return t(`plac.facets.priceBuckets.${value}`);
    }
    return value;
  }

  const visibleKeys = PLAC_FACET_KEYS.filter(
    (key) => (options[key] ?? []).length > 0
  );
  const hasAnyOptions = visibleKeys.length > 0;

  if (!open) return null;

  return (
    <aside className="plac-dig-filters is-open">
      <div className="plac-dig-filters-panel">
        <div className="plac-dig-filters-header">
          <h2 className="plac-dig-filters-heading">{t("plac.facets.filters")}</h2>
          {activeCount > 0 && (
            <button
              type="button"
              className="plac-dig-filters-clear"
              onClick={clearAll}
            >
              {t("plac.facets.clearAll")}
            </button>
          )}
        </div>

        {!hasAnyOptions ? (
          <p className="muted fine">{t("plac.facets.empty")}</p>
        ) : (
          visibleKeys.map((key) => (
            <FacetGroup
              key={key}
              facetKey={key}
              options={options[key] ?? []}
              selectedValues={selected[key] ?? []}
              onToggle={toggle}
              optionLabel={optionLabel}
              defaultOpen={PLAC_FACET_DEFAULT_OPEN.has(key)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
