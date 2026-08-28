import { Link, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { BrandMark } from "./BrandMark.jsx";
import { LanguageToggle } from "./LanguageToggle.jsx";
import { NotificationToggle } from "./NotificationToggle.jsx";
import { StealthModeToggle } from "./StealthModeToggle.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function MobileTopBar() {
  const { pathname } = useLocation();
  const { t } = useLocale();

  if (pathname.startsWith("/session/")) {
    return null;
  }

  return (
    <header className="mobile-topbar">
      <Link to="/" className="mobile-topbar-brand" title="DSO — Discogs Slovenia Orders">
        <BrandMark variant="nav" />
      </Link>

      <div className="mobile-topbar-actions">
        <LanguageToggle compact hideLabel className="mobile-topbar-lang" />

        <StealthModeToggle variant="icon" />

        <NotificationToggle variant="icon" />

        <Link
          to="/settings"
          className={`mobile-topbar-icon-btn${
            pathname === "/settings" ? " mobile-topbar-icon-btn--active" : ""
          }`}
          aria-label={t("settings.title")}
          title={t("settings.title")}
        >
          <Settings size={18} />
        </Link>
      </div>
    </header>
  );
}
