import { NavLink, useSearchParams } from "react-router-dom";
import { Archive, ArrowUpRight, Plus, Zap } from "lucide-react";

export function Sidebar() {
  const [searchParams] = useSearchParams();
  const newOrderOpen = searchParams.get("new") === "1";

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink
          to={{ pathname: "/", search: "?new=1" }}
          className={() =>
            `sidebar-link sidebar-link-cta${newOrderOpen ? " active" : ""}`
          }
        >
          <Plus size={18} strokeWidth={2.5} />
          Novo naročilo
          <ArrowUpRight size={14} className="sidebar-cta-arrow" />
        </NavLink>

        <div className="sidebar-divider" />

        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `sidebar-link${isActive && !newOrderOpen ? " active" : ""}`
          }
        >
          <Zap size={18} />
          Odprta naročila
        </NavLink>
        <NavLink
          to="/closed"
          className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
        >
          <Archive size={18} />
          Zaključena naročila
        </NavLink>
      </nav>
    </aside>
  );
}
