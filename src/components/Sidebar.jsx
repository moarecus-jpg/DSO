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
  LayoutGrid,
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
    descKey: "openOrdersDesc",
    countKey: "open",
    isActive: (isActive, newOrderOpen) => isActive && !newOrderOpen,
  },
  {
    to: "/closed",
    icon: Lock,
    iconClass: "closed",
    labelKey: "closedOrders",
    descKey: "closedOrdersDesc",
    countKey: "closed",
    linkClass: "sidebar-link-v2--closed",
  },
  {
    to: "/unplaced",
    icon: CircleOff,
    iconClass: "unplaced",
    labelKey: "unplacedOrders",
    descKey: "unplacedOrdersDesc",
    countKey: "unplaced",
  },
  {
    to: "/canceled",
    icon: Ban,
    iconClass: "canceled",
    labelKey: "canceledOrders",
    descKey: "canceledOrdersDesc",
    countKey: "canceled",
  },
  {
    to: "/my-items",
    icon: Package,
    iconClass: "items",
    labelKey: "myItems",
    descKey: "myItemsDesc",
  },
  {
    to: "/my-statistics",
    icon: BarChart3,
    iconClass: "stats",
    labelKey: "myStatistics",
    descKey: "myStatisticsDesc",
  },
];

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
      <div className="sidebar-v2-bg" aria-hidden="true" />

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
          <span className="sidebar-cta-icon" aria-hidden>
            <Plus size={20} strokeWidth={2.5} />
          </span>
          <span className="sidebar-cta-text">
            <span className="sidebar-cta-label">{t("nav.newOrder")}</span>
            <span className="sidebar-cta-desc">{t("nav.newOrderDesc")}</span>
          </span>
        </NavLink>

        <div className="sidebar-section">
          <p className="sidebar-section-label">
            <LayoutGrid size={13} strokeWidth={2.2} aria-hidden />
            {t("nav.sectionOrders")}
          </p>

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
                  <span className="sidebar-link-text">
                    <span className="sidebar-link-label">{t(`nav.${item.labelKey}`)}</span>
                    <span className="sidebar-link-desc">{t(`nav.${item.descKey}`)}</span>
                  </span>
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
