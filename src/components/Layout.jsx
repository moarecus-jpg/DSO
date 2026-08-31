import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";
import { MobileNav } from "./MobileNav.jsx";
import { MobileTopBar } from "./MobileTopBar.jsx";
import { PersistenceBanner } from "./PersistenceBanner.jsx";
import { NewOrderDialog } from "./NewOrderDialog.jsx";

export function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onSession = pathname.startsWith("/session/");
  const newOrderOpen = searchParams.get("new") === "1";

  function closeNewOrder() {
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    const search = next.toString();
    navigate({ pathname, search: search ? `?${search}` : "" }, { replace: true });
  }

  return (
    <div
      className={`layout layout-dashboard${
        onSession ? " layout-dashboard--session" : ""
      }`}
    >
      <div className="layout-vinyl-bg" aria-hidden="true" />
      <MobileTopBar />
      <PersistenceBanner />
      <div className="app-shell app-shell-v2">
        <Sidebar />
        <main className="app-main app-main-v2">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <NewOrderDialog open={newOrderOpen} onClose={closeNewOrder} />
    </div>
  );
}
