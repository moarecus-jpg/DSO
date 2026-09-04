import { Inbox } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../hooks/useLocale.jsx";
import { usePlacCounts } from "../hooks/usePlacCounts.js";

export function PlacInboxLink({ compact = false, className = "" }) {
  const { t } = useLocale();
  const { inboxUnread } = usePlacCounts();
  const { pathname } = useLocation();
  const onInbox = pathname.startsWith("/plac/inbox");

  if (compact) {
    return (
      <Link
        to="/plac/inbox"
        className={`mobile-topbar-icon-btn plac-inbox-link-compact${
          onInbox ? " mobile-topbar-icon-btn--active" : ""
        }${className ? ` ${className}` : ""}`}
        aria-current={onInbox ? "page" : undefined}
        aria-label={t("plac.inboxTitle")}
        title={t("plac.inboxTitle")}
      >
        <Inbox size={18} aria-hidden />
        {inboxUnread > 0 && (
          <span className="plac-cart-badge plac-cart-badge--compact">{inboxUnread}</span>
        )}
      </Link>
    );
  }

  return (
    <Link
      to="/plac/inbox"
      className={`btn btn-ghost plac-inbox-link${onInbox ? " active" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-current={onInbox ? "page" : undefined}
    >
      <Inbox size={18} aria-hidden />
      {t("plac.inboxTitle")}
      {inboxUnread > 0 && <span className="plac-cart-badge">{inboxUnread}</span>}
    </Link>
  );
}
