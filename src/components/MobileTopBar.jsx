import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "./BrandMark.jsx";
import { CommunitySwitcher } from "./CommunitySwitcher.jsx";
import { StealthModeToggle } from "./StealthModeToggle.jsx";
import { HeaderAccount } from "./HeaderAccount.jsx";

export function MobileTopBar() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/session/")) {
    return null;
  }

  return (
    <header className="mobile-topbar">
      <Link to="/" className="mobile-topbar-brand" title="DSO — Discogs Slovenia Orders">
        <BrandMark variant="nav" />
      </Link>
      <div className="mobile-topbar-community">
        <CommunitySwitcher />
      </div>

      <div className="mobile-topbar-actions">
        <StealthModeToggle variant="icon" />
        <HeaderAccount compact />
      </div>
    </header>
  );
}
