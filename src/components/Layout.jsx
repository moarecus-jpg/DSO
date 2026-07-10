import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";

export function Layout() {
  return (
    <div className="layout layout-dashboard">
      <div className="layout-glow" aria-hidden>
        <div className="layout-glow-orb layout-glow-orb--violet" />
        <div className="layout-glow-orb layout-glow-orb--indigo" />
      </div>
      <div className="app-shell app-shell-v2">
        <Sidebar />
        <main className="app-main app-main-v2">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
