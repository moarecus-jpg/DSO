import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Disc3,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { displayOrderTitle } from "../../shared/orderTitle.js";
import {
  isOpenSession,
  isReopenableSession,
} from "../../shared/orderStatus.js";
import { getStoreConfig } from "../../shared/stores.js";
import { sessionTimestamp } from "../../shared/orderDashboard.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { CloseOrderDialog } from "./CloseOrderDialog.jsx";
import { OrderStoreAvatar } from "./OrderStoreAvatar.jsx";
import { StatusPill } from "./StatusPill.jsx";
import { UserAvatar } from "./UserAvatar.jsx";

function formatCreatedAt(createdAt, localeTag) {
  if (!createdAt) return null;
  const d = new Date(createdAt.includes("T") ? createdAt : `${createdAt}Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(localeTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTargetDate(targetDate, localeTag) {
  if (!targetDate) return "—";
  const d = new Date(`${targetDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return targetDate;
  return d.toLocaleDateString(localeTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatActivityTime(value, localeTag) {
  if (!value) return "";
  const d = new Date(String(value).includes("T") ? value : `${value}Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(localeTag, {
    day: "numeric",
    month: "short",
  });
}

function buildActivity(session, detail, t) {
  const events = [];
  const creatorLabel =
    session.creator_name ??
    (session.creator_username ? `@${session.creator_username}` : t("common.unknown"));
  events.push({
    id: "opened",
    at: sessionTimestamp(session.created_at),
    time: session.created_at,
    text: t("orders.activityOpened", { name: creatorLabel }),
    name: creatorLabel,
  });

  const byUser = new Map();
  for (const link of detail?.links ?? []) {
    const key = link.user_id ?? "unknown";
    const entry = byUser.get(key) ?? {
      count: 0,
      name: link.user_name ?? link.member_name ?? key,
      at: 0,
      time: link.created_at,
    };
    entry.count += 1;
    const ts = sessionTimestamp(link.created_at);
    if (ts >= entry.at) {
      entry.at = ts;
      entry.time = link.created_at;
    }
    byUser.set(key, entry);
  }
  for (const [userId, entry] of byUser) {
    events.push({
      id: `items-${userId}`,
      at: entry.at,
      time: entry.time,
      text: t("orders.activityAddedItems", { name: entry.name, count: entry.count }),
      name: entry.name,
    });
  }

  for (const note of detail?.notes ?? []) {
    events.push({
      id: `note-${note.id}`,
      at: sessionTimestamp(note.created_at),
      time: note.created_at,
      text: t("orders.activityNote", { name: note.user_name ?? t("common.unknown") }),
      name: note.user_name,
    });
  }

  events.sort((a, b) => b.at - a.at);
  return events.slice(0, 6);
}

export function OrderDetailPreview({
  session,
  detail,
  loading,
  error,
  canClose,
  closing,
  canReopen = false,
  reopening = false,
  onClose,
  onCloseOrder,
  onReopenOrder,
  variant = "panel",
}) {
  const { t, localeTag } = useLocale();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const rootClass =
    variant === "sheet"
      ? "order-preview order-preview--sheet"
      : "order-preview";

  if (!session) {
    return (
      <aside className={`${rootClass} order-preview--empty`} aria-label={t("orders.previewTitle")}>
        <div className="order-preview-empty">
          <Disc3 size={36} strokeWidth={1.2} aria-hidden />
          <p>{t("orders.previewSelect")}</p>
        </div>
      </aside>
    );
  }

  const isOpen = isOpenSession(session.status);
  const title = displayOrderTitle(session);
  const creatorLabel =
    session.creator_name ??
    (session.creator_username ? `@${session.creator_username}` : null);
  const members = detail?.members ?? [];
  const noteCount = detail?.notes?.length ?? 0;
  const itemCount = detail?.links?.length ?? session.link_count ?? 0;
  const memberCount = members.length || session.member_count || 1;
  const targetDate = detail?.target_date ?? session.target_date;
  const targetLabel = targetDate ? formatTargetDate(targetDate, localeTag) : null;
  const createdLabel = formatCreatedAt(session.created_at, localeTag);
  const showClose = canClose && isOpen;
  const showReopen = canReopen && isReopenableSession(session.status);
  const showMenu = showClose || showReopen;

  return (
    <aside className={rootClass} aria-label={t("orders.previewTitle")}>
      <div className="order-preview-header">
        <OrderStoreAvatar
          store={session.store}
          username={session.seller_username}
          avatarUrl={session.seller_avatar_url}
          className="order-preview-avatar"
          size={72}
        />
        <div className="order-preview-heading">
          <h2 className="order-preview-title">{title}</h2>
          {creatorLabel && (
            <p className="order-preview-creator">
              <UserRound size={14} aria-hidden />
              {t("orders.openedBy", { name: creatorLabel })}
            </p>
          )}
          {createdLabel && (
            <p className="order-preview-creator">
              <Calendar size={14} aria-hidden />
              {createdLabel}
            </p>
          )}
        </div>
        <button
          type="button"
          className="order-preview-dismiss"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="order-preview-badges">
        <StatusPill status={session.status} />
        {targetLabel && (
          <span className="order-preview-badge-meta">
            <Target size={14} aria-hidden />
            {targetLabel}
          </span>
        )}
        {showMenu && (
          <div className="order-preview-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="order-preview-menu-btn"
              onClick={() => setMenuOpen((current) => !current)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={t("orders.previewActions")}
            >
              <MoreHorizontal size={18} aria-hidden />
            </button>
            {menuOpen && (
              <div className="order-preview-menu" role="menu">
                {showClose && (
                  <button
                    type="button"
                    role="menuitem"
                    className="order-preview-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setCloseDialogOpen(true);
                    }}
                    disabled={closing}
                  >
                    <Lock size={15} aria-hidden />
                    {closing ? t("session.closing") : t("session.closeOrder")}
                  </button>
                )}
                {showReopen && (
                  <button
                    type="button"
                    role="menuitem"
                    className="order-preview-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      onReopenOrder?.();
                    }}
                    disabled={reopening}
                  >
                    <RotateCcw size={15} aria-hidden />
                    {reopening ? t("session.reopening") : t("session.reopenOrder")}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="order-preview-stats">
        <div className="order-preview-stat">
          <span className="order-preview-stat-value">{memberCount}</span>
          <span className="order-preview-stat-label">{t("orders.previewMembers")}</span>
        </div>
        <div className="order-preview-stat">
          <span className="order-preview-stat-value">{itemCount}</span>
          <span className="order-preview-stat-label">{t("orders.previewItems")}</span>
        </div>
        <div className="order-preview-stat">
          <span className="order-preview-stat-value">{loading ? "…" : noteCount}</span>
          <span className="order-preview-stat-label">{t("orders.previewMessages")}</span>
        </div>
      </div>

      <div className="order-preview-section">
        <h3 className="order-preview-section-title">{t("orders.previewAbout")}</h3>
        <p className="order-preview-about">
          {session.seller_username
            ? `@${session.seller_username} · ${getStoreConfig(session.store).label}`
            : getStoreConfig(session.store).label}
        </p>
      </div>

      <div className="order-preview-section">
        <h3 className="order-preview-section-title">{t("orders.previewActivity")}</h3>
        {loading && !detail ? (
          <p className="muted fine">{t("common.loading")}</p>
        ) : (
          <ul className="order-preview-activity">
            {buildActivity(session, detail, t).map((event) => (
              <li key={event.id} className="order-preview-activity-item">
                <UserAvatar name={event.name} className="order-preview-activity-avatar" size={28} />
                <div className="order-preview-activity-text">
                  <p>{event.text}</p>
                  <small>{formatActivityTime(event.time, localeTag)}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="form-error fine">{error}</p>}

      <div className="order-preview-actions">
        <Link to={`/session/${session.id}`} className="btn btn-primary order-preview-view-btn">
          {t("orders.viewDetails")}
          <ArrowRight size={18} aria-hidden />
        </Link>
      </div>

      <CloseOrderDialog
        open={closeDialogOpen}
        closing={closing}
        onClose={() => setCloseDialogOpen(false)}
        onChoose={async (outcome) => {
          const ok = await onCloseOrder?.(outcome);
          if (ok !== false) setCloseDialogOpen(false);
        }}
      />
    </aside>
  );
}
