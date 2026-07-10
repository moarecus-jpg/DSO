import { Languages } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

export function LanguageToggle({ className = "" }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className={`sidebar-lang-toggle ${className}`.trim()}>
      <span className="sidebar-lang-toggle-label">
        <Languages size={16} aria-hidden />
        {t("language.label")}
      </span>
      <select
        className="sidebar-lang-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        aria-label={t("language.label")}
      >
        <option value="sl">{t("language.sl")}</option>
        <option value="en">{t("language.en")}</option>
      </select>
    </label>
  );
}
