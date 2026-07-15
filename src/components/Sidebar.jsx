import { Link, NavLink, useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  Folder,
  Lock,
  LogOut,
  Moon,
  Package,
  Plus,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { useTheme } from "../hooks/useTheme.jsx";
import { BrandMark } from "./BrandMark.jsx";
import { LanguageToggle } from "./LanguageToggle.jsx";
import { StealthModeToggle } from "./StealthModeToggle.jsx";
import { NotificationToggle } from "./NotificationToggle.jsx";
import { UserAvatar } from "./UserAvatar.jsx";

export function Sidebar() {
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const { t } = useLocale();
  const newOrderOpen = searchParams.get("new") === "1";

  return (
    <aside className="sidebar sidebar-v2">
      <div className="sidebar-top">
        <Link to="/" className="sidebar-brand" title="DSO — Discogs Slovenia Orders">
          <BrandMark variant="sidebar" />
        </Link>

        <NavLink
          to={{ pathname: "/", search: "?new=1" }}
          className={() =>
            `sidebar-cta${newOrderOpen ? " sidebar-cta-active" : ""}`
          }
        >
          <Plus size={20} strokeWidth={2.5} />
          {t("nav.newOrder")}
        </NavLink>

        <nav className="sidebar-nav sidebar-nav-v2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-link-v2${isActive && !newOrderOpen ? " active" : ""}`
            }
          >
            <Folder size={18} />
            {t("nav.openOrders")}
          </NavLink>
          <NavLink
            to="/closed"
            className={({ isActive }) => `sidebar-link-v2${isActive ? " active" : ""}`}
          >
            <Lock size={18} />
            {t("nav.closedOrders")}
          </NavLink>
          <NavLink
            to="/my-items"
            className={({ isActive }) => `sidebar-link-v2${isActive ? " active" : ""}`}
          >
            <Package size={18} />
            {t("nav.myItems")}
          </NavLink>
          <NavLink
            to="/my-statistics"
            className={({ isActive }) => `sidebar-link-v2${isActive ? " active" : ""}`}
          >
            <BarChart3 size={18} />
            {t("nav.myStatistics")}
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-footer">
        <label className="sidebar-footer-item sidebar-theme-toggle">
          <span className="sidebar-theme-toggle-label">
            <Moon size={16} aria-hidden />
            {t("nav.darkMode")}
          </span>
          <input
            type="checkbox"
            className="sidebar-theme-toggle-input"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
          />
          <span className="sidebar-theme-toggle-track" aria-hidden />
        </label>

        <StealthModeToggle className="sidebar-footer-item" />

        <NotificationToggle className="sidebar-footer-item" />

        <LanguageToggle className="sidebar-footer-item" compact />

        <div className="sidebar-footer-item sidebar-footer-account">
          <Link to="/settings" className="sidebar-user-card">
            <UserAvatar
              name={user?.name}
              avatarUrl={
                user?.discogsConnected ? user.discogsAvatarUrl : user?.picture
              }
              className="sidebar-user-avatar"
              size={36}
            />
            <div className="sidebar-user-text">
              <p className="sidebar-user-name">{t("settings.title")}</p>
            </div>
            <ChevronDown size={18} className="sidebar-user-chevron" aria-hidden />
          </Link>

          <button
            type="button"
            className="sidebar-logout sidebar-logout--aside"
            onClick={logout}
            aria-label={t("nav.logout")}
            title={t("nav.logout")}
          >
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </div>
    </aside>
  );
}
