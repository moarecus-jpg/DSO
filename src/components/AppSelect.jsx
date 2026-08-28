import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

function filterOptions(options, query) {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((option) => option.label.toLowerCase().includes(q));
}

export function AppSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  disabled = false,
  searchable,
  prefix = null,
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listId = useId();
  const searchId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];
  const searchableEnabled = searchable ?? options.length > 2;

  const visibleOptions = useMemo(
    () => (searchableEnabled ? filterOptions(options, query) : options),
    [options, query, searchableEnabled]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlightIndex(0);
      return undefined;
    }

    if (searchableEnabled) {
      searchRef.current?.focus({ preventScroll: true });
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, searchableEnabled]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, open]);

  function closeMenu() {
    setOpen(false);
  }

  function choose(nextValue) {
    onChange(nextValue);
    closeMenu();
  }

  function chooseHighlighted() {
    const option = visibleOptions[highlightIndex];
    if (option) choose(option.value);
  }

  function handleMenuKeyDown(event) {
    if (!searchableEnabled) {
      if (event.key === "Escape") closeMenu();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) =>
        visibleOptions.length === 0 ? 0 : Math.min(current + 1, visibleOptions.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      chooseHighlighted();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  }

  return (
    <div
      ref={rootRef}
      className={`app-select${open ? " app-select--open" : ""} ${className}`.trim()}
      onKeyDown={open ? handleMenuKeyDown : undefined}
    >
      <button
        type="button"
        className="app-select-trigger"
        onClick={() => !disabled && setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        {prefix && <span className="app-select-prefix">{prefix}</span>}
        <span className="app-select-value">{selected?.label}</span>
        <ChevronDown className="app-select-chevron" size={16} aria-hidden />
      </button>

      {open && (
        <div id={listId} className="app-select-menu" role="listbox" aria-label={ariaLabel}>
          {searchableEnabled && (
            <div className="app-select-search-wrap">
              <input
                ref={searchRef}
                id={searchId}
                type="search"
                className="app-select-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleMenuKeyDown}
                placeholder={t("common.selectSearch")}
                aria-controls={listId}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}
          <ul className="app-select-options">
            {visibleOptions.length === 0 ? (
              <li className="app-select-empty" role="presentation">
                {t("common.noSearchResults")}
              </li>
            ) : (
              visibleOptions.map((option, index) => {
                const isActive = option.value === value;
                const isHighlighted = index === highlightIndex;
                return (
                  <li key={option.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`app-select-option${isActive ? " active" : ""}${
                        isHighlighted ? " highlighted" : ""
                      }`}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => choose(option.value)}
                    >
                      {option.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
