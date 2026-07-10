import { Link, NavLink, useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  Folder,
  Lock,
  LogOut,
  Moon,
  Package,
  Plus,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";
import { useTheme } from "../hooks/useTheme.jsx";
import { BrandMark } from "./BrandMark.jsx";
import { UserAvatar } from "./UserAvatar.jsx";

export function Sidebar() {
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
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
          Novo naročilo
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
            Odprta naročila
          </NavLink>
          <NavLink
            to="/closed"
            className={({ isActive }) => `sidebar-link-v2${isActive ? " active" : ""}`}
          >
            <Lock size={18} />
            Zaključena naročila
          </NavLink>
          <NavLink
            to="/my-items"
            className={({ isActive }) => `sidebar-link-v2${isActive ? " active" : ""}`}
          >
            <Package size={18} />
            Naročeni Itemi
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-footer">
        <Link to="/settings" className="sidebar-user-card">
          <UserAvatar
            name={user?.name}
            avatarUrl={
              user?.discogsConnected ? user.discogsAvatarUrl : user?.picture
            }
            className="sidebar-user-avatar"
            size={48}
          />
          <div className="sidebar-user-text">
            <p className="sidebar-user-name">{user?.name}</p>
            <p className="sidebar-user-meta">
              {user?.discogsUsername ? `@${user.discogsUsername}` : user?.username ?? ""}
            </p>
          </div>
          <ChevronDown size={18} className="sidebar-user-chevron" aria-hidden />
        </Link>

        <label className="sidebar-theme-toggle">
          <span className="sidebar-theme-toggle-label">
            <Moon size={16} aria-hidden />
            Temni način
          </span>
          <input
            type="checkbox"
            className="sidebar-theme-toggle-input"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
          />
          <span className="sidebar-theme-toggle-track" aria-hidden />
        </label>

        <button type="button" className="sidebar-logout" onClick={logout}>
          <LogOut size={16} />
          Odjava
        </button>
      </div>
    </aside>
  );
}
