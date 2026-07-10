import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIsoDate(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDisplayDate(value, localeTag, placeholder) {
  const date = parseIsoDate(value);
  if (!date) return placeholder;
  return date.toLocaleDateString(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function buildCalendarDays(viewMonth) {
  const first = startOfMonth(viewMonth);
  const startOffset = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

export function AppDatePicker({
  value,
  onChange,
  ariaLabel,
  placeholder,
  disabled = false,
  className = "",
}) {
  const { t, localeTag } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelId = useId();
  const selected = parseIsoDate(value);
  const todayIso = toIsoDate(new Date());
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());

  useEffect(() => {
    if (selected) setViewMonth(selected);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const weekdayLabels = useMemo(() => {
    const base = new Date(2023, 0, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(base);
      day.setDate(base.getDate() + index);
      return day.toLocaleDateString(localeTag, { weekday: "short" });
    });
  }, [localeTag]);

  const days = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);
  const monthLabel = viewMonth.toLocaleDateString(localeTag, {
    month: "long",
    year: "numeric",
  });
  const displayValue = formatDisplayDate(value, localeTag, placeholder);

  function choose(date) {
    onChange?.(toIsoDate(date));
    setOpen(false);
  }

  function clear() {
    onChange?.(null);
    setOpen(false);
  }

  function chooseToday() {
    const today = new Date();
    setViewMonth(today);
    onChange?.(todayIso);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`app-date-picker${open ? " app-date-picker--open" : ""} ${className}`.trim()}
    >
      <button
        type="button"
        className="app-date-picker-trigger"
        onClick={() => !disabled && setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <Calendar className="app-date-picker-icon" size={16} aria-hidden />
        <span
          className={`app-date-picker-value${value ? "" : " app-date-picker-value--placeholder"}`}
        >
          {displayValue}
        </span>
        <ChevronDown className="app-date-picker-chevron" size={16} aria-hidden />
      </button>

      {open && (
        <div id={panelId} className="app-date-picker-panel" role="dialog" aria-label={ariaLabel}>
          <div className="app-date-picker-nav">
            <button
              type="button"
              className="app-date-picker-nav-btn"
              onClick={() => setViewMonth((current) => addMonths(current, -1))}
              aria-label={t("session.targetDatePrevMonth")}
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <span className="app-date-picker-month">{monthLabel}</span>
            <button
              type="button"
              className="app-date-picker-nav-btn"
              onClick={() => setViewMonth((current) => addMonths(current, 1))}
              aria-label={t("session.targetDateNextMonth")}
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>

          <div className="app-date-picker-weekdays" aria-hidden>
            {weekdayLabels.map((label) => (
              <span key={label} className="app-date-picker-weekday">
                {label}
              </span>
            ))}
          </div>

          <div className="app-date-picker-grid">
            {days.map((day) => {
              const iso = toIsoDate(day);
              const inMonth = day.getMonth() === viewMonth.getMonth();
              const isSelected = value === iso;
              const isToday = iso === todayIso;
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    "app-date-picker-day",
                    !inMonth && "app-date-picker-day--muted",
                    isSelected && "app-date-picker-day--selected",
                    isToday && "app-date-picker-day--today",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => choose(day)}
                  aria-pressed={isSelected}
                  aria-label={day.toLocaleDateString(localeTag, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="app-date-picker-footer">
            <button type="button" className="app-date-picker-footer-btn" onClick={clear}>
              {t("session.targetDateClear")}
            </button>
            <button type="button" className="app-date-picker-footer-btn" onClick={chooseToday}>
              {t("session.targetDateToday")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
