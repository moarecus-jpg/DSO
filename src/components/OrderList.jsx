import { Link } from "react-router-dom";
import { Disc3, Users } from "lucide-react";
import { formatOrderTitle } from "../../shared/orderTitle.js";
import { SellerAvatar } from "./SellerAvatar.jsx";

export function OrderList({ sessions, loading, emptyMessage }) {
  if (loading) {
    return <p className="muted center">Loading…</p>;
  }

  if (sessions.length === 0) {
    return (
      <div className="empty card">
        <Disc3 size={40} strokeWidth={1.2} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="order-list">
      {sessions.map((s) => {
        const isClosed = s.status === "closed";
        return (
          <Link key={s.id} to={`/session/${s.id}`} className="order-row card">
            <SellerAvatar
              username={s.seller_username}
              avatarUrl={s.seller_avatar_url}
            />
            <div className="order-body">
              <div className="order-row-top">
                <h3 className="order-title">
                  {s.order_number != null
                    ? formatOrderTitle(s.order_number)
                    : s.title}
                </h3>
                <span
                  className={`status-pill ${isClosed ? "status-pill-closed" : "status-pill-active"}`}
                >
                  <span className="status-dot" />
                  {isClosed ? "Zaključeno" : "Odprto"}
                </span>
              </div>
              <span className="order-seller">@{s.seller_username}</span>
            </div>
            <div className="order-aside">
              <div className="order-meta">
                <Users size={14} />
                {s.member_count}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
