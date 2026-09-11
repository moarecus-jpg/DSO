import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useSearchParams } from "react-router-dom";
import {
  Ban,
  BarChart3,
  CircleOff,
  Folder,
  HandCoins,
  Lock,
  MoreHorizontal,
  Package,
  Plus,
  Settings,
  Store,
} from "lucide-react";
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  const moreActive =
    pathname.startsWith("/unplaced") ||
    pathname.startsWith("/canceled") ||
    pathname.startsWith("/my-statistics") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/settings");

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    function onPointerDown(event) {
      if (!moreRef.current?.contains(event.target)) setMoreOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

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
            <Folder size={18} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobileOpen")}</span>
        </NavLink>

        <NavLink
          to="/closed"
          className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
        >
          <NavIcon>
            <Lock size={18} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobileClosed")}</span>
        </NavLink>

        <NavLink
          to="/my-items"
          className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
        >
          <NavIcon>
            <Package size={18} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobileItems")}</span>
        </NavLink>

        <NavLink
          to="/plac"
          className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
        >
          <NavIcon>
            <Store size={18} strokeWidth={2} />
          </NavIcon>
          <span className="mobile-nav-label">{t("nav.mobilePlac")}</span>
        </NavLink>

        <div className="mobile-nav-more" ref={moreRef}>
          <button
            type="button"
            className={`mobile-nav-link mobile-nav-more-btn${
              moreActive || moreOpen ? " active" : ""
            }`}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            <NavIcon>
              <MoreHorizontal size={18} strokeWidth={2} />
            </NavIcon>
            <span className="mobile-nav-label">{t("nav.mobileMore")}</span>
          </button>
          {moreOpen ? (
            <div className="mobile-nav-more-menu" role="menu">
              <NavLink
                to="/unplaced"
                role="menuitem"
                className="mobile-nav-more-item"
                onClick={() => setMoreOpen(false)}
              >
                <CircleOff size={16} strokeWidth={2.1} aria-hidden />
                {t("nav.mobileUnplaced")}
              </NavLink>
              <NavLink
                to="/canceled"
                role="menuitem"
                className="mobile-nav-more-item"
                onClick={() => setMoreOpen(false)}
              >
                <Ban size={16} strokeWidth={2.1} aria-hidden />
                {t("nav.mobileCanceled")}
              </NavLink>
              <NavLink
                to="/my-statistics"
                role="menuitem"
                className="mobile-nav-more-item"
                onClick={() => setMoreOpen(false)}
              >
                <BarChart3 size={16} strokeWidth={2.1} aria-hidden />
                {t("nav.mobileStatistics")}
              </NavLink>
              <NavLink
                to="/payments"
                role="menuitem"
                className="mobile-nav-more-item"
                onClick={() => setMoreOpen(false)}
              >
                <HandCoins size={16} strokeWidth={2.1} aria-hidden />
                {t("nav.paymentRequests")}
              </NavLink>
              <NavLink
                to="/settings"
                role="menuitem"
                className="mobile-nav-more-item"
                onClick={() => setMoreOpen(false)}
              >
                <Settings size={16} strokeWidth={2.1} aria-hidden />
                {t("settings.title")}
              </NavLink>
            </div>
          ) : null}
        </div>
      </div>

      <NavLink
        to={{ pathname, search: "?new=1" }}
        className={() => `mobile-nav-fab${newOrderOpen ? " active" : ""}`}
        aria-label={t("nav.newOrder")}
      >
        <Plus size={22} strokeWidth={2.5} />
      </NavLink>
    </nav>
  );
}
