import { Languages } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";
import { AppSelect } from "./AppSelect.jsx";

const LOCALES = ["sl", "en"];

export function LanguageToggle({ className = "", compact = false }) {
  const { locale, setLocale, t } = useLocale();

  const options = LOCALES.map((value) => ({
    value,
    label: compact ? value.toUpperCase() : t(`language.${value}`),
  }));

  return (
    <div className={`sidebar-lang-toggle ${className}`.trim()}>
      {!compact && (
        <span className="sidebar-lang-toggle-label">
          <Languages size={16} aria-hidden />
          {t("language.label")}
        </span>
      )}
      <AppSelect
        className={`lang-select${compact ? " lang-select--compact" : ""}`}
        value={locale}
        onChange={setLocale}
        options={options}
        ariaLabel={t("language.label")}
      />
    </div>
  );
}
