import { NavLink, useSearchParams } from "react-router-dom";
import { Folder, Lock, Package, Plus, Settings } from "lucide-react";

export function MobileNav() {
  const [searchParams] = useSearchParams();
  const newOrderOpen = searchParams.get("new") === "1";

  return (
    <nav className="mobile-nav" aria-label="Glavna navigacija">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `mobile-nav-link${isActive && !newOrderOpen ? " active" : ""}`
        }
      >
        <Folder size={20} strokeWidth={2} />
        <span>Odprta</span>
      </NavLink>

      <NavLink
        to="/closed"
        className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
      >
        <Lock size={20} strokeWidth={2} />
        <span>Zaključena</span>
      </NavLink>

      <NavLink
        to={{ pathname: "/", search: "?new=1" }}
        className={() => `mobile-nav-fab${newOrderOpen ? " active" : ""}`}
        aria-label="Novo naročilo"
      >
        <Plus size={26} strokeWidth={2.5} />
      </NavLink>

      <NavLink
        to="/my-items"
        className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
      >
        <Package size={20} strokeWidth={2} />
        <span>Itemi</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) => `mobile-nav-link${isActive ? " active" : ""}`}
      >
        <Settings size={20} strokeWidth={2} />
        <span>Profil</span>
      </NavLink>
    </nav>
  );
}
