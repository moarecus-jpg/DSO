import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Disc3,
  Lock,
  MessageSquare,
  RotateCcw,
  Target,
  UserRound,
  Users,
  X,
  ChevronRight,
} from "lucide-react";
import { displayOrderTitle } from "../../shared/orderTitle.js";
import {
  isOpenSession,
  isReopenableSession,
} from "../../shared/orderStatus.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { CloseOrderDialog } from "./CloseOrderDialog.jsx";
import { OrderStoreAvatar } from "./OrderStoreAvatar.jsx";
import { StatusPill } from "./StatusPill.jsx";

function formatCreatedAt(createdAt, localeTag) {
  if (!createdAt) return "—";
  const d = new Date(createdAt.includes("T") ? createdAt : `${createdAt}Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(localeTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
  const targetLabel = formatTargetDate(
    detail?.target_date ?? session.target_date,
    localeTag
  );
  const showClose = canClose && isOpen;
  const showReopen = canReopen && isReopenableSession(session.status);

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
          <div className="order-preview-badges">
            <StatusPill status={session.status} />
            <span className="order-preview-badge-meta">
              <Users size={14} aria-hidden />
              {memberCount}
            </span>
          </div>
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
          <span className="order-preview-stat-label">{t("orders.previewNotes")}</span>
        </div>
        <div className="order-preview-stat">
          <span className="order-preview-stat-value order-preview-stat-value--sm">
            {targetLabel}
          </span>
          <span className="order-preview-stat-label">{t("orders.previewTarget")}</span>
        </div>
      </div>

      <div className="order-preview-section">
        <h3 className="order-preview-section-title">{t("session.participants")}</h3>
        {loading && !detail ? (
          <p className="muted fine">{t("common.loading")}</p>
        ) : error ? (
          <p className="form-error fine">{error}</p>
        ) : members.length === 0 ? (
          <p className="muted fine">{t("orders.previewNoMembers")}</p>
        ) : (
          <ul className="order-preview-members">
            {members.map((member) => (
              <li key={member.id} className="order-preview-member">
                {member.picture ? (
                  <img
                    src={member.picture}
                    alt=""
                    className="order-preview-member-avatar"
                  />
                ) : (
                  <span className="order-preview-member-avatar order-preview-member-avatar--fallback">
                    <UserRound size={16} aria-hidden />
                  </span>
                )}
                <div className="order-preview-member-text">
                  <span className="order-preview-member-name">{member.name}</span>
                  {member.discogs_username ? (
                    <small>@{member.discogs_username}</small>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="order-preview-meta-row">
        <div>
          <span className="order-preview-meta-label">
            <Calendar size={13} aria-hidden />
            {t("orders.previewCreated")}
          </span>
          <span className="order-preview-meta-value">
            {formatCreatedAt(session.created_at, localeTag)}
          </span>
        </div>
        <div>
          <span className="order-preview-meta-label">
            <Target size={13} aria-hidden />
            {t("orders.previewTarget")}
          </span>
          <span className="order-preview-meta-value">{targetLabel}</span>
        </div>
        <div>
          <span className="order-preview-meta-label">
            <MessageSquare size={13} aria-hidden />
            {t("orders.previewNotes")}
          </span>
          <span className="order-preview-meta-value">
            {loading && !detail ? "…" : noteCount}
          </span>
        </div>
      </div>

      <div className="order-preview-actions">
        {showClose && (
          <button
            type="button"
            className="btn btn-ghost order-preview-close-btn"
            onClick={() => setCloseDialogOpen(true)}
            disabled={closing}
          >
            <Lock size={15} aria-hidden />
            {closing ? t("session.closing") : t("session.closeOrder")}
          </button>
        )}
        {showReopen && (
          <button
            type="button"
            className="btn btn-ghost order-preview-close-btn"
            onClick={onReopenOrder}
            disabled={reopening}
          >
            <RotateCcw size={15} aria-hidden />
            {reopening ? t("session.reopening") : t("session.reopenOrder")}
          </button>
        )}
        <Link to={`/session/${session.id}`} className="btn btn-primary order-preview-view-btn">
          {t("orders.openOrder")}
          <ChevronRight size={18} aria-hidden />
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
