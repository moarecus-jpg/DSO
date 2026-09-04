import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { PLAC_FACET_KEYS } from "../../shared/placFacets.js";
import { useLocale } from "../hooks/useLocale.jsx";

const INITIAL_VISIBLE = 8;

function FacetGroup({ facetKey, options, selectedValues, onToggle, categoryLabel }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.value.toLowerCase().includes(q));
  }, [options, query]);

  const visible = expanded ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const canShowMore = filtered.length > INITIAL_VISIBLE;

  if (options.length === 0) return null;

  return (
    <section className="plac-dig-facet">
      <h3 className="plac-dig-facet-title">{t(`plac.facets.${facetKey}`)}</h3>
      {options.length > 6 && (
        <div className="plac-dig-facet-search">
          <Search size={14} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setExpanded(true);
            }}
            placeholder={t("plac.facets.filterPlaceholder")}
            aria-label={t("plac.facets.filterAria", { facet: t(`plac.facets.${facetKey}`) })}
          />
        </div>
      )}
      <ul className="plac-dig-facet-list">
        {visible.map((opt) => {
          const id = `plac-facet-${facetKey}-${opt.value}`;
          const checked = selectedValues.includes(opt.value);
          const label =
            facetKey === "category" ? categoryLabel(opt.value) : opt.value;
          return (
            <li key={opt.value}>
              <label className="plac-dig-facet-option" htmlFor={id}>
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(facetKey, opt.value)}
                />
                <span className="plac-dig-facet-option-label">{label}</span>
                <span className="plac-dig-facet-option-count">{opt.count}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {canShowMore && (
        <button
          type="button"
          className="plac-dig-facet-more"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp size={14} aria-hidden />
              {t("plac.facets.showLess")}
            </>
          ) : (
            <>
              <ChevronDown size={14} aria-hidden />
              {t("plac.facets.showMore")}
            </>
          )}
        </button>
      )}
    </section>
  );
}

export function PlacDigFilters({
  options,
  selected,
  onChange,
  open,
  onOpenChange,
  resultCount,
}) {
  const { t } = useLocale();

  function toggle(facetKey, value) {
    const current = selected[facetKey] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...selected, [facetKey]: next });
  }

  function clearAll() {
    onChange(
      Object.fromEntries(PLAC_FACET_KEYS.map((key) => [key, []]))
    );
  }

  const activeCount = PLAC_FACET_KEYS.reduce(
    (sum, key) => sum + (selected[key]?.length ?? 0),
    0
  );

  function categoryLabel(value) {
    const key = `plac.category.${value}`;
    const translated = t(key);
    return translated === key ? value : translated;
  }

  const hasAnyOptions = PLAC_FACET_KEYS.some((key) => (options[key] ?? []).length > 0);

  return (
    <aside className={`plac-dig-filters${open ? " is-open" : ""}`}>
      <div className="plac-dig-filters-toolbar">
        <button
          type="button"
          className="btn btn-ghost btn-sm plac-dig-filters-toggle"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
        >
          {open ? <PanelLeftClose size={16} aria-hidden /> : <PanelLeftOpen size={16} aria-hidden />}
          {t("plac.facets.filters")}
          {activeCount > 0 && (
            <span className="plac-dig-filters-badge">{activeCount}</span>
          )}
        </button>
        {activeCount > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
            <X size={14} aria-hidden />
            {t("plac.facets.clear")}
          </button>
        )}
      </div>

      {open && (
        <div className="plac-dig-filters-panel">
          <p className="plac-dig-filters-count muted fine">
            {t("plac.facets.resultCount", { count: resultCount })}
          </p>
          {!hasAnyOptions ? (
            <p className="muted fine">{t("plac.facets.empty")}</p>
          ) : (
            PLAC_FACET_KEYS.map((key) => (
              <FacetGroup
                key={key}
                facetKey={key}
                options={options[key] ?? []}
                selectedValues={selected[key] ?? []}
                onToggle={toggle}
                categoryLabel={categoryLabel}
              />
            ))
          )}
        </div>
      )}
    </aside>
  );
}
