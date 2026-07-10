import { Link } from "react-router-dom";
import { Calendar, ChevronRight, Disc3, UserRound, Users } from "lucide-react";
import { displayOrderTitle } from "../../shared/orderTitle.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { SellerAvatar } from "./SellerAvatar.jsx";

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

export function OrderList({ sessions, loading, emptyMessage }) {
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
        const isClosed = s.status === "closed";
        const title = displayOrderTitle(s);
        const dateLabel = formatOrderDate(s.created_at, localeTag);
        const creatorLabel =
          s.creator_name ??
          (s.creator_username ? `@${s.creator_username}` : null);

        return (
          <Link key={s.id} to={`/session/${s.id}`} className="order-card-v2">
            <SellerAvatar
              username={s.seller_username}
              avatarUrl={s.seller_avatar_url}
              className="order-card-v2-avatar"
              size={80}
            />
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
            <div className="order-card-v2-aside">
              <span
                className={`status-pill-v2 ${isClosed ? "status-pill-v2-closed" : "status-pill-v2-open"}`}
              >
                <span className="status-dot" />
                {isClosed ? t("common.closed") : t("common.open")}
              </span>
              <div className="order-card-v2-meta">
                <Users size={18} aria-hidden />
                {s.member_count ?? 1}
              </div>
              <ChevronRight className="order-card-v2-chevron" size={24} aria-hidden />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
