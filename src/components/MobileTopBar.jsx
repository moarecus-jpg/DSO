import { Link, useLocation } from "react-router-dom";
import { APP_TITLE } from "../../shared/brand.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { BrandMark } from "./BrandMark.jsx";
import { CommunitySwitcher } from "./CommunitySwitcher.jsx";
import { PlacCartLink } from "./PlacCartLink.jsx";
import { PlacInboxLink } from "./PlacInboxLink.jsx";
import { StealthModeToggle } from "./StealthModeToggle.jsx";
import { UserAvatar } from "./UserAvatar.jsx";

export function MobileTopBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  if (pathname.startsWith("/session/")) {
    return null;
  }

  return (
    <header className="mobile-topbar">
      <div className="mobile-topbar-left">
        <Link to="/" className="mobile-topbar-brand" title={APP_TITLE}>
          <BrandMark variant="icon" />
        </Link>
        <CommunitySwitcher compact />
      </div>

      <div className="mobile-topbar-actions">
        <StealthModeToggle variant="icon" />
        <PlacCartLink compact />
        <PlacInboxLink compact />
        {user ? (
          <Link
            to="/settings"
            className="mobile-topbar-account-btn"
            aria-label={user.name}
            title={user.name}
          >
            <UserAvatar
              name={user.name}
              avatarUrl={user.discogsConnected ? user.discogsAvatarUrl : user.picture}
              className="mobile-topbar-account-avatar"
              size={30}
            />
          </Link>
        ) : null}
      </div>
    </header>
  );
}
