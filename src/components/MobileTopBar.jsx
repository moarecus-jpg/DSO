import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "./BrandMark.jsx";

export function MobileTopBar() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/session/")) {
    return null;
  }

  return (
    <header className="mobile-topbar">
      <Link to="/" className="mobile-topbar-brand" title="DSO — Discogs Slovenia Orders">
        <BrandMark variant="sidebar" />
      </Link>
    </header>
  );
}
