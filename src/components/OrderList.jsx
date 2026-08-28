import { Link } from "react-router-dom";
import { Calendar, Disc3, MessageSquare, UserRound, Users } from "lucide-react";
import { displayOrderTitle } from "../../shared/orderTitle.js";
import { needsAttention } from "../../shared/orderDashboard.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { OrderStoreAvatar } from "./OrderStoreAvatar.jsx";
import { StatusPill } from "./StatusPill.jsx";

function formatOrderDate(createdAt, localeTag) {
  if (!createdAt) return null;
  const d = new Date(createdAt.includes("T") ? createdAt : `${createdAt}Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(localeTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OrderCardContent({ s, title, dateLabel, creatorLabel, t }) {
  const itemCount = s.link_count ?? 0;
  const noteCount = s.note_count ?? 0;
  const attention = needsAttention(s);

  return (
    <>
      <div className="order-card-v2-top">
        <OrderStoreAvatar
          store={s.store}
          username={s.seller_username}
          avatarUrl={s.seller_avatar_url}
          className="order-card-v2-avatar"
          size={56}
        />
        <StatusPill status={s.status} />
      </div>
      <div className="order-card-v2-body">
        <h3 className="order-card-v2-title">{title}</h3>
        {dateLabel && (
          <p className="order-card-v2-date">
            <Calendar size={14} aria-hidden />
            {dateLabel}
          </p>
        )}
        {creatorLabel && (
          <p className="order-card-v2-creator">
            <UserRound size={14} aria-hidden />
            {t("orders.openedBy", { name: creatorLabel })}
          </p>
        )}
      </div>
      <div className="order-card-v2-footer">
        <span className="order-card-v2-meta" title={t("orders.previewMembers")}>
          <Users size={15} aria-hidden />
          {s.member_count ?? 1}
        </span>
        <span className="order-card-v2-meta" title={t("orders.previewItems")}>
          <Disc3 size={15} aria-hidden />
          {itemCount}
        </span>
        <span className="order-card-v2-meta" title={t("orders.previewNotes")}>
          <MessageSquare size={15} aria-hidden />
          {noteCount}
        </span>
        {attention ? (
          <span className="order-card-v2-alert">{t("orders.chip.attention")}</span>
        ) : null}
      </div>
    </>
  );
}

export function OrderList({
  sessions,
  loading,
  emptyMessage,
  selectedId = null,
  onSelect = null,
  previewMode = false,
}) {
  const { t, localeTag } = useLocale();

  if (loading) {
    return <p className="orders-loading">{t("common.loadingOrders")}</p>;
  }

  if (sessions.length === 0) {
    return (
      <div className="orders-empty">
        <Disc3 size={40} strokeWidth={1.2} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="order-list order-list-v2">
      {sessions.map((s) => {
        const title = displayOrderTitle(s);
        const dateLabel = formatOrderDate(s.created_at, localeTag);
        const creatorLabel =
          s.creator_name ??
          (s.creator_username ? `@${s.creator_username}` : null);
        const selected = selectedId === s.id;
        const className = `order-card-v2${selected ? " order-card-v2--selected" : ""}`;

        if (previewMode && onSelect) {
          return (
            <button
              key={s.id}
              type="button"
              className={className}
              aria-pressed={selected}
              onClick={() => onSelect(s)}
            >
              <OrderCardContent
                s={s}
                title={title}
                dateLabel={dateLabel}
                creatorLabel={creatorLabel}
                t={t}
              />
            </button>
          );
        }

        return (
          <Link key={s.id} to={`/session/${s.id}`} className={className}>
            <OrderCardContent
              s={s}
              title={title}
              dateLabel={dateLabel}
              creatorLabel={creatorLabel}
              t={t}
            />
          </Link>
        );
      })}
    </div>
  );
}
