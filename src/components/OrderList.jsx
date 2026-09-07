import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  Disc3,
  Heart,
  MessageSquare,
  Square,
  UserRound,
  Users,
} from "lucide-react";
import { displayOrderTitle } from "../../shared/orderTitle.js";
import { needsAttention } from "../../shared/orderDashboard.js";
import { sellerMywantsUrl } from "../../shared/discogsUrls.js";
import { isShopStore } from "../../shared/stores.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { useSellerChecklist } from "../hooks/useSellerChecklist.js";
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

function stopCardEvent(e) {
  e.preventDefault();
  e.stopPropagation();
}

function OrderCardMain({ s, title, dateLabel, creatorLabel, t }) {
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
        <h3 className="order-card-v2-title">
          {title}
          {attention ? (
            <AlertTriangle
              className="order-card-v2-alert"
              size={15}
              aria-label={t("orders.chip.attention")}
            />
          ) : null}
        </h3>
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
    </>
  );
}

function OrderCardFooter({
  s,
  t,
  checked,
  onToggleChecked,
  wantlistUrl,
}) {
  const itemCount = s.link_count ?? 0;
  const noteCount = s.note_count ?? 0;

  return (
    <div className="order-card-v2-footer">
      <div className="order-card-v2-meta-row">
        <span className="order-card-v2-meta" title={t("orders.previewMembers")}>
          <Users size={15} aria-hidden />
          {s.member_count ?? 1}
        </span>
        <span className="order-card-v2-meta" title={t("orders.previewItems")}>
          <Disc3 size={15} aria-hidden />
          {itemCount}
        </span>
        <span className="order-card-v2-meta" title={t("orders.previewMessages")}>
          <MessageSquare size={15} aria-hidden />
          {noteCount}
        </span>
      </div>
      <div
        className="order-card-v2-actions"
        onClick={stopCardEvent}
        onKeyDown={stopCardEvent}
      >
        <button
          type="button"
          className={`order-card-v2-action${checked ? " is-checked" : ""}`}
          aria-pressed={checked}
          title={checked ? t("orders.uncheckSeller") : t("orders.checkSeller")}
          aria-label={checked ? t("orders.uncheckSeller") : t("orders.checkSeller")}
          onClick={(e) => {
            stopCardEvent(e);
            onToggleChecked(s.seller_username);
          }}
        >
          {checked ? (
            <CheckSquare size={15} strokeWidth={2.3} aria-hidden />
          ) : (
            <Square size={15} strokeWidth={2.3} aria-hidden />
          )}
          <span>{checked ? t("orders.checked") : t("orders.check")}</span>
        </button>
        {wantlistUrl ? (
          <a
            href={wantlistUrl}
            target="_blank"
            rel="noreferrer"
            className="order-card-v2-action order-card-v2-action--wantlist"
            title={t("session.openWantlist")}
            aria-label={t("session.openWantlist")}
            onClick={stopCardEvent}
          >
            <Heart size={15} strokeWidth={2.3} aria-hidden />
            <span>{t("orders.wantlist")}</span>
          </a>
        ) : null}
      </div>
    </div>
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
  const { user } = useAuth();
  const { isChecked, toggleChecked } = useSellerChecklist();

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
        const checked = isChecked(s.seller_username);
        const wantlistUrl =
          !isShopStore(s.store) && s.seller_username
            ? sellerMywantsUrl(s.seller_username, user?.discogsUsername)
            : null;
        const className = [
          "order-card-v2",
          selected ? "order-card-v2--selected" : "",
          checked ? "order-card-v2--checked" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const main = (
          <OrderCardMain
            s={s}
            title={title}
            dateLabel={dateLabel}
            creatorLabel={creatorLabel}
            t={t}
          />
        );
        const footer = (
          <OrderCardFooter
            s={s}
            t={t}
            checked={checked}
            onToggleChecked={toggleChecked}
            wantlistUrl={wantlistUrl}
          />
        );

        if (previewMode && onSelect) {
          return (
            <div
              key={s.id}
              className={className}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => onSelect(s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(s);
                }
              }}
            >
              {main}
              {footer}
            </div>
          );
        }

        return (
          <div key={s.id} className={className}>
            <Link to={`/session/${s.id}`} className="order-card-v2-main">
              {main}
            </Link>
            {footer}
          </div>
        );
      })}
    </div>
  );
}
