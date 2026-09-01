import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  CircleOff,
  Ban,
  Folder,
  Lock,
  Package,
  Plus,
  BarChart3,
} from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";
import { BrandMark } from "./BrandMark.jsx";
import { LanguageToggle } from "./LanguageToggle.jsx";
import { StealthModeToggle } from "./StealthModeToggle.jsx";
import { NotificationToggle } from "./NotificationToggle.jsx";
import { api } from "../api.js";

export function Sidebar() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useLocale();
  const newOrderOpen = searchParams.get("new") === "1";
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    api("/api/sessions/counts")
      .then((d) => setCounts(d.counts))
      .catch(() => setCounts(null));
  }, []);

  return (
    <aside className="sidebar sidebar-v2">
      <div className="sidebar-top">
        <div className="sidebar-logo-stage" aria-hidden="true" />
        <Link to="/" className="sidebar-brand" title="DSO — Discogs Slovenia Orders">
          <BrandMark variant="sidebar" />
        </Link>

        <NavLink
          to={{ pathname, search: "?new=1" }}
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
            <span className="sidebar-link-icon sidebar-link-icon--open" aria-hidden>
              <Folder size={18} strokeWidth={2.1} />
            </span>
            <span className="sidebar-link-label">{t("nav.openOrders")}</span>
            {counts?.open > 0 && (
              <span className="sidebar-link-count">{counts.open}</span>
            )}
          </NavLink>
          <NavLink
            to="/closed"
            className={({ isActive }) =>
              `sidebar-link-v2 sidebar-link-v2--closed${isActive ? " active" : ""}`
            }
          >
            <span className="sidebar-link-icon sidebar-link-icon--closed" aria-hidden>
              <Lock size={18} strokeWidth={2.1} />
            </span>
            <span className="sidebar-link-label">{t("nav.closedOrders")}</span>
            {counts?.closed > 0 && (
              <span className="sidebar-link-count">{counts.closed}</span>
            )}
          </NavLink>
          <NavLink
            to="/unplaced"
            className={({ isActive }) => `sidebar-link-v2${isActive ? " active" : ""}`}
          >
            <span className="sidebar-link-icon sidebar-link-icon--unplaced" aria-hidden>
              <CircleOff size={18} strokeWidth={2.1} />
            </span>
            <span className="sidebar-link-label">{t("nav.unplacedOrders")}</span>
            {counts?.unplaced > 0 && (
              <span className="sidebar-link-count">{counts.unplaced}</span>
            )}
          </NavLink>
          <NavLink
            to="/canceled"
            className={({ isActive }) => `sidebar-link-v2${isActive ? " active" : ""}`}
          >
            <span className="sidebar-link-icon sidebar-link-icon--canceled" aria-hidden>
              <Ban size={18} strokeWidth={2.1} />
            </span>
            <span className="sidebar-link-label">{t("nav.canceledOrders")}</span>
            {counts?.canceled > 0 && (
              <span className="sidebar-link-count">{counts.canceled}</span>
            )}
          </NavLink>
          <NavLink
            to="/my-items"
            className={({ isActive }) => `sidebar-link-v2${isActive ? " active" : ""}`}
          >
            <span className="sidebar-link-icon sidebar-link-icon--items" aria-hidden>
              <Package size={18} strokeWidth={2.1} />
            </span>
            <span className="sidebar-link-label">{t("nav.myItems")}</span>
          </NavLink>
          <NavLink
            to="/my-statistics"
            className={({ isActive }) => `sidebar-link-v2${isActive ? " active" : ""}`}
          >
            <span className="sidebar-link-icon sidebar-link-icon--stats" aria-hidden>
              <BarChart3 size={18} strokeWidth={2.1} />
            </span>
            <span className="sidebar-link-label">{t("nav.myStatistics")}</span>
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-footer">
        <StealthModeToggle className="sidebar-footer-item" />

        <NotificationToggle className="sidebar-footer-item" />

        <LanguageToggle className="sidebar-footer-item" compact />
      </div>
    </aside>
  );
}
