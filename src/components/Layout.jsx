import { Link, Outlet } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { BrandMark } from "./BrandMark.jsx";
import { Sidebar } from "./Sidebar.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { UserAvatar } from "./UserAvatar.jsx";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <nav className="nav">
        <Link to="/" className="brand" title="DSO — Discogs Slovenia Orders">
          <BrandMark variant="nav" />
        </Link>
        <div className="nav-right">
          <Link to="/settings" className="nav-icon-btn" title="Settings">
            <Settings size={18} />
          </Link>
          <div className="nav-user-block">
            <UserAvatar
              name={user?.name}
              avatarUrl={
                user?.discogsConnected ? user.discogsAvatarUrl : user?.picture
              }
            />
            <span className="nav-user-name">{user?.name}</span>
          </div>
          <button className="nav-icon-btn" onClick={logout} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </nav>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
