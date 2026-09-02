import { NavLink, useLocation, useSearchParams } from "react-router-dom";
import { Ban, BarChart3, CircleOff, Folder, Lock, Package, Plus, Store } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

function NavIcon({ children }) {
  return (
    <span className="mobile-nav-icon" aria-hidden>
      {children}
    </span>
  );
}

export function MobileNav() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useLocale();
  const newOrderOpen = searchParams.get("new") === "1";

  if (pathname.startsWith("/session/")) {
    return null;
  }

  return (
    <nav className="mobile-nav" aria-label={t("nav.mainNav")}>
      <div className="mobile-nav-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `mobile-nav-link${isActive && !newOrderOpen ? " active" : ""}`
          }
        >
          <NavIcon>
            <Folder size={20} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobileOpen")}</span>
        </NavLink>

        <NavLink
          to="/closed"
          className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
        >
          <NavIcon>
            <Lock size={20} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobileClosed")}</span>
        </NavLink>

        <NavLink
          to="/unplaced"
          className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
        >
          <NavIcon>
            <CircleOff size={20} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobileUnplaced")}</span>
        </NavLink>

        <NavLink
          to="/canceled"
          className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
        >
          <NavIcon>
            <Ban size={20} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobileCanceled")}</span>
        </NavLink>

        <NavLink
          to="/my-items"
          className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
        >
          <NavIcon>
            <Package size={20} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobileItems")}</span>
        </NavLink>

        <NavLink
          to="/plac"
          className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
        >
          <NavIcon>
            <Store size={20} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobilePlac")}</span>
        </NavLink>

        <NavLink
          to="/my-statistics"
          className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
        >
          <NavIcon>
            <BarChart3 size={20} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobileStatistics")}</span>
        </NavLink>
      </div>

      <NavLink
        to={{ pathname, search: "?new=1" }}
        className={() => `mobile-nav-fab${newOrderOpen ? " active" : ""}`}
        aria-label={t("nav.newOrder")}
      >
        <Plus size={26} strokeWidth={2.5} />
      </NavLink>
    </nav>
  );
}
