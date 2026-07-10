import { Link, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { BrandMark } from "./BrandMark.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { useTheme } from "../hooks/useTheme.jsx";

export function MobileTopBar() {
  const { pathname } = useLocation();
  const { locale, setLocale, t } = useLocale();
  const { darkMode, setDarkMode } = useTheme();

  if (pathname.startsWith("/session/")) {
    return null;
  }

  return (
    <header className="mobile-topbar">
      <Link to="/" className="mobile-topbar-brand" title="DSO — Discogs Slovenia Orders">
        <BrandMark variant="nav" />
      </Link>

      <div className="mobile-topbar-actions">
        <label className="mobile-topbar-lang">
          <span className="sr-only">{t("language.label")}</span>
          <select
            className="mobile-topbar-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            aria-label={t("language.label")}
          >
            <option value="sl">SL</option>
            <option value="en">EN</option>
          </select>
        </label>

        <button
          type="button"
          className="mobile-topbar-icon-btn"
          onClick={() => setDarkMode(!darkMode)}
          aria-label={t("nav.darkMode")}
          aria-pressed={darkMode}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
