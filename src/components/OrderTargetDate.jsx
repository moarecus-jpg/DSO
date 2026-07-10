import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

function formatTargetDate(value, localeTag) {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function OrderTargetDate({
  targetDate,
  readOnly = false,
  saving = false,
  onSave,
}) {
  const { t, localeTag } = useLocale();
  const [draft, setDraft] = useState(targetDate ?? "");

  useEffect(() => {
    setDraft(targetDate ?? "");
  }, [targetDate]);

  async function commit() {
    if (!onSave || readOnly) return;
    const next = draft.trim() === "" ? null : draft;
    const current = targetDate ?? null;
    if (next === current) return;
    await onSave(next);
  }

  const formatted = formatTargetDate(targetDate, localeTag);

  return (
    <div className="order-target-date card">
      <div className="order-target-date-header">
        <Calendar size={18} aria-hidden />
        <span className="order-target-date-label">{t("session.targetDate")}</span>
      </div>
      {readOnly ? (
        <p className="order-target-date-value">
          {formatted ?? <span className="muted fine">{t("session.targetDateUnset")}</span>}
        </p>
      ) : (
        <div className="order-target-date-edit">
          <input
            type="date"
            className="order-target-date-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.target.blur();
              }
            }}
            disabled={saving}
            aria-label={t("session.targetDateAria")}
          />
          {formatted && (
            <span className="order-target-date-preview muted fine">{formatted}</span>
          )}
        </div>
      )}
      {!readOnly && (
        <p className="order-target-date-hint muted fine">{t("session.targetDateHint")}</p>
      )}
    </div>
  );
}
