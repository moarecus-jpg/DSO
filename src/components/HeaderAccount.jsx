import { Link } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { UserAvatar } from "./UserAvatar.jsx";

export function HeaderAccount({ className = "", compact = false }) {
  const { user, logout } = useAuth();
  const { t } = useLocale();

  if (!user) return null;

  if (compact) {
    return (
      <Link
        to="/settings"
        className={`mobile-topbar-account-btn ${className}`.trim()}
        aria-label={user.name}
        title={user.name}
      >
        <UserAvatar
          name={user.name}
          avatarUrl={user.discogsConnected ? user.discogsAvatarUrl : user.picture}
          className="mobile-topbar-account-avatar"
          size={30}
        />
      </Link>
    );
  }

  return (
    <div className={`header-account ${className}`.trim()}>
      <Link to="/settings" className="header-account-card">
        <UserAvatar
          name={user.name}
          avatarUrl={user.discogsConnected ? user.discogsAvatarUrl : user.picture}
          className="header-account-avatar"
          size={34}
        />
        <div className="header-account-text">
          <p className="header-account-name">{user.name}</p>
          <p className="header-account-meta">
            {user.isAdmin ? t("nav.admin") : t("settings.title")}
          </p>
        </div>
        <ChevronDown size={16} className="header-account-chevron" aria-hidden />
      </Link>
      <button
        type="button"
        className="header-account-logout"
        onClick={logout}
        aria-label={t("nav.logout")}
        title={t("nav.logout")}
      >
        <LogOut size={16} aria-hidden />
      </button>
    </div>
  );
}
