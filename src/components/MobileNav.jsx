import { NavLink, useSearchParams } from "react-router-dom";
import { Folder, Lock, Package, Plus, Settings } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

export function MobileNav() {
  const [searchParams] = useSearchParams();
  const { t } = useLocale();
  const newOrderOpen = searchParams.get("new") === "1";

  return (
    <nav className="mobile-nav" aria-label={t("nav.mainNav")}>
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `mobile-nav-link${isActive && !newOrderOpen ? " active" : ""}`
        }
      >
        <Folder size={20} strokeWidth={2} />
        <span>{t("nav.mobileOpen")}</span>
      </NavLink>

      <NavLink
        to="/closed"
        className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
      >
        <Lock size={20} strokeWidth={2} />
        <span>{t("nav.mobileClosed")}</span>
      </NavLink>

      <NavLink
        to={{ pathname: "/", search: "?new=1" }}
        className={() => `mobile-nav-fab${newOrderOpen ? " active" : ""}`}
        aria-label={t("nav.newOrder")}
      >
        <Plus size={26} strokeWidth={2.5} />
      </NavLink>

      <NavLink
        to="/my-items"
        className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
      >
        <Package size={20} strokeWidth={2} />
        <span>{t("nav.mobileItems")}</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
      >
        <Settings size={20} strokeWidth={2} />
        <span>{t("nav.mobileProfile")}</span>
      </NavLink>
    </nav>
  );
}
