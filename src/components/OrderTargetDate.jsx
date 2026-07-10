import { Calendar } from "lucide-react";
import { AppDatePicker } from "./AppDatePicker.jsx";
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

  async function handleChange(next) {
    if (!onSave || readOnly) return;
    const current = targetDate ?? null;
    if ((next ?? null) === current) return;
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
        <AppDatePicker
          value={targetDate ?? ""}
          onChange={handleChange}
          disabled={saving}
          ariaLabel={t("session.targetDateAria")}
          placeholder={t("session.targetDatePlaceholder")}
        />
      )}
      {!readOnly && (
        <p className="order-target-date-hint muted fine">{t("session.targetDateHint")}</p>
      )}
    </div>
  );
}
