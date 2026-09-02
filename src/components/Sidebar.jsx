import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Ban,
  BarChart3,
  ChevronRight,
  CircleOff,
  Folder,
  Lock,
  Package,
  Plus,
  Settings,
  Store,
} from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";
import { BrandMark } from "./BrandMark.jsx";
import { LanguageToggle } from "./LanguageToggle.jsx";
import { StealthModeToggle } from "./StealthModeToggle.jsx";
import { NotificationToggle } from "./NotificationToggle.jsx";
import { api } from "../api.js";

const ORDER_LINKS = [
  {
    to: "/",
    end: true,
    icon: Folder,
    iconClass: "open",
    labelKey: "openOrders",
    countKey: "open",
    isActive: (isActive, newOrderOpen) => isActive && !newOrderOpen,
  },
  {
    to: "/closed",
    icon: Lock,
    iconClass: "closed",
    labelKey: "closedOrders",
    countKey: "closed",
    linkClass: "sidebar-link-v2--closed",
  },
  {
    to: "/unplaced",
    icon: CircleOff,
    iconClass: "unplaced",
    labelKey: "unplacedOrders",
    countKey: "unplaced",
  },
  {
    to: "/canceled",
    icon: Ban,
    iconClass: "canceled",
    labelKey: "canceledOrders",
    countKey: "canceled",
  },
  {
    to: "/my-items",
    icon: Package,
    iconClass: "items",
    labelKey: "myItems",
  },
  {
    to: "/my-statistics",
    icon: BarChart3,
    iconClass: "stats",
    labelKey: "myStatistics",
  },
];

const PLAC_LINKS = [
  {
    to: "/plac",
    end: true,
    icon: Store,
    iconClass: "plac",
    labelKey: "plac",
  },
  {
    to: "/plac/mine",
    icon: Package,
    iconClass: "plac-mine",
    labelKey: "placMine",
    countKey: "placMine",
  },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useLocale();
  const newOrderOpen = searchParams.get("new") === "1";
  const [counts, setCounts] = useState(null);
  const [placCounts, setPlacCounts] = useState(null);

  useEffect(() => {
    api("/api/sessions/counts")
      .then((d) => setCounts(d.counts))
      .catch(() => setCounts(null));
    api("/api/plac/counts")
      .then((d) => setPlacCounts(d))
      .catch(() => setPlacCounts(null));
  }, []);

  return (
    <aside className="sidebar sidebar-v2">
      <div className="sidebar-top">
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

        <div className="sidebar-section">
          <nav className="sidebar-nav sidebar-nav-v2" aria-label={t("nav.mainNav")}>
            {ORDER_LINKS.map((item) => {
              const Icon = item.icon;
              const count = item.countKey ? counts?.[item.countKey] : 0;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => {
                    const active = item.isActive
                      ? item.isActive(isActive, newOrderOpen)
                      : isActive;
                    return [
                      "sidebar-link-v2",
                      item.linkClass,
                      active ? "active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                  }}
                >
                  <span
                    className={`sidebar-link-icon sidebar-link-icon--${item.iconClass}`}
                    aria-hidden
                  >
                    <Icon size={18} strokeWidth={2.1} />
                  </span>
                  <span className="sidebar-link-label">{t(`nav.${item.labelKey}`)}</span>
                  {count > 0 ? (
                    <span className="sidebar-link-count">{count}</span>
                  ) : (
                    <ChevronRight
                      className="sidebar-link-chevron"
                      size={16}
                      strokeWidth={2.2}
                      aria-hidden
                    />
                  )}
                  <span className="sidebar-link-active-dot" aria-hidden />
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-section">
          <nav className="sidebar-nav sidebar-nav-v2" aria-label={t("nav.plac")}>
            {PLAC_LINKS.map((item) => {
              const Icon = item.icon;
              const count =
                item.countKey === "placMine" ? placCounts?.mine : 0;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    ["sidebar-link-v2", isActive ? "active" : ""]
                      .filter(Boolean)
                      .join(" ")
                  }
                >
                  <span
                    className={`sidebar-link-icon sidebar-link-icon--${item.iconClass}`}
                    aria-hidden
                  >
                    <Icon size={18} strokeWidth={2.1} />
                  </span>
                  <span className="sidebar-link-label">{t(`nav.${item.labelKey}`)}</span>
                  {count > 0 ? (
                    <span className="sidebar-link-count">{count}</span>
                  ) : (
                    <ChevronRight
                      className="sidebar-link-chevron"
                      size={16}
                      strokeWidth={2.2}
                      aria-hidden
                    />
                  )}
                  <span className="sidebar-link-active-dot" aria-hidden />
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="sidebar-footer">
        <p className="sidebar-section-label sidebar-section-label--footer">
          <Settings size={13} strokeWidth={2.2} aria-hidden />
          {t("nav.sectionSettings")}
        </p>

        <StealthModeToggle className="sidebar-footer-item" />

        <NotificationToggle className="sidebar-footer-item" />

        <LanguageToggle className="sidebar-footer-item" compact />
      </div>
    </aside>
  );
}
