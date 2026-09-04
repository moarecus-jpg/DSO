import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import {
  PLAC_FACET_DEFAULT_OPEN,
  PLAC_FACET_KEYS,
} from "../../shared/placFacets.js";
import { useLocale } from "../hooks/useLocale.jsx";

const MIN_VISIBLE = 6;
const HEAD_H = 38;
const PILL_H = 32;
const CHIP_ROW_H = 34;
const MORE_H = 22;
const SECTION_GAP = 4;
const PANEL_PAD = 20;

function estimateSectionBodyHeight(facetKey, visibleCount, { includeMore = true } = {}) {
  if (visibleCount <= 0) return 0;
  const more = includeMore ? MORE_H : 0;
  if (facetKey === "country") {
    const rows = Math.ceil(visibleCount / 2);
    return rows * CHIP_ROW_H + more;
  }
  return visibleCount * PILL_H + more;
}

function distributeVisibleCounts(panelHeight, sections) {
  const collapsed = sections.filter((s) => !s.open);
  const open = sections.filter((s) => s.open);
  if (open.length === 0) {
    return Object.fromEntries(sections.map((s) => [s.key, 0]));
  }

  const collapsedH = collapsed.length * HEAD_H;
  const openHeadsH = open.length * (HEAD_H + SECTION_GAP);
  let budget = Math.max(
    0,
    panelHeight - PANEL_PAD - collapsedH - openHeadsH
  );

  const counts = Object.fromEntries(sections.map((s) => [s.key, 0]));

  for (const section of open) {
    const baseline = Math.min(MIN_VISIBLE, section.total);
    const includeMore = baseline < section.total;
    budget -= estimateSectionBodyHeight(section.key, baseline, { includeMore });
    counts[section.key] = baseline;
  }

  // Prefer filling Style first (usually the longest list), then others.
  const growOrder = [
    ...open.filter((s) => s.key === "style"),
    ...open.filter((s) => s.key !== "style"),
  ];

  let grew = true;
  while (grew && budget > 8) {
    grew = false;
    for (const section of growOrder) {
      if (counts[section.key] >= section.total) continue;
      const step = section.key === "country" ? 2 : 1;
      const from = counts[section.key];
      const capped = Math.min(from + step, section.total);
      const before = estimateSectionBodyHeight(section.key, from, {
        includeMore: from < section.total,
      });
      const after = estimateSectionBodyHeight(section.key, capped, {
        includeMore: capped < section.total,
      });
      const delta = after - before;
      if (delta <= budget + 2) {
        budget -= delta;
        counts[section.key] = capped;
        grew = true;
      }
    }
  }

  return counts;
}

function FacetGroup({
  facetKey,
  options,
  selectedValues,
  onToggle,
  optionLabel,
  open,
  onOpenChange,
  visibleLimit,
}) {
  const { t } = useLocale();
  const [forcedAll, setForcedAll] = useState(false);

  const limit = forcedAll
    ? options.length
    : Math.max(MIN_VISIBLE, visibleLimit ?? MIN_VISIBLE);
  const visible = options.slice(0, Math.min(limit, options.length));
  const canShowMore = !forcedAll && options.length > visible.length;
  const canShowLess = forcedAll && options.length > MIN_VISIBLE;
  const isChip = facetKey === "country";
  const activeInGroup = selectedValues.length;

  if (options.length === 0) return null;

  return (
    <section className={`plac-dig-facet${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="plac-dig-facet-head"
        onClick={() => onOpenChange(!open)}
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
          {(canShowMore || canShowLess) && (
            <button
              type="button"
              className="plac-dig-facet-more"
              onClick={() => setForcedAll((v) => !v)}
            >
              {canShowLess ? t("plac.facets.showLess") : t("plac.facets.showMore")}
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
  const panelRef = useRef(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const [openMap, setOpenMap] = useState(() =>
    Object.fromEntries(
      PLAC_FACET_KEYS.map((key) => [key, PLAC_FACET_DEFAULT_OPEN.has(key)])
    )
  );

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

  useLayoutEffect(() => {
    const node = panelRef.current;
    if (!node) return undefined;

    const measure = () => {
      // Use the stretched column height, not content-sized height.
      const aside = node.parentElement;
      const h = Math.floor(
        aside?.clientHeight || node.clientHeight || node.getBoundingClientRect().height
      );
      if (h > 0) setPanelHeight(h);
    };

    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const ro = new ResizeObserver(() => measure());
    ro.observe(node);
    if (node.parentElement) ro.observe(node.parentElement);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    setOpenMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const key of visibleKeys) {
        if (!(key in next)) {
          next[key] = PLAC_FACET_DEFAULT_OPEN.has(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [visibleKeys]);

  const sectionSpecs = useMemo(
    () =>
      visibleKeys.map((key) => ({
        key,
        open: Boolean(openMap[key]),
        total: (options[key] ?? []).length,
      })),
    [visibleKeys, openMap, options]
  );

  const visibleCounts = useMemo(() => {
    if (!panelHeight) {
      return Object.fromEntries(
        visibleKeys.map((key) => [
          key,
          openMap[key] ? MIN_VISIBLE : 0,
        ])
      );
    }
    return distributeVisibleCounts(panelHeight, sectionSpecs);
  }, [panelHeight, sectionSpecs, visibleKeys, openMap]);

  if (!open) return null;

  return (
    <aside className="plac-dig-filters is-open">
      <div className="plac-dig-filters-panel" ref={panelRef}>
        {activeCount > 0 && (
          <div className="plac-dig-filters-header">
            <button
              type="button"
              className="plac-dig-filters-clear"
              onClick={clearAll}
            >
              {t("plac.facets.clearAll")}
            </button>
          </div>
        )}

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
              open={Boolean(openMap[key])}
              onOpenChange={(nextOpen) =>
                setOpenMap((prev) => ({ ...prev, [key]: nextOpen }))
              }
              visibleLimit={visibleCounts[key] ?? MIN_VISIBLE}
            />
          ))
        )}
      </div>
    </aside>
  );
}
