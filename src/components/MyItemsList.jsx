import { Link } from "react-router-dom";
import { Disc3, ExternalLink } from "lucide-react";
import { DiscogsCartActions } from "./DiscogsCartActions.jsx";
import { formatPrice, listingIdFor } from "../../shared/orderTotals.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { SellerAvatar } from "./SellerAvatar.jsx";

export function MyItemsList({
  groups = [],
  loading,
  emptyMessage,
  onRemoveItem,
  removingItemId,
}) {
  const { t } = useLocale();

  if (loading) {
    return <p className="orders-loading">{t("common.loadingItems")}</p>;
  }

  if (groups.length === 0) {
    return (
      <div className="orders-empty">
        <Disc3 size={40} strokeWidth={1.2} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="my-items-list">
      {groups.map((group) => {
        const isClosed = group.sessionStatus === "closed";
        return (
          <section key={group.sessionId} className="my-items-group">
            <header className="my-items-group-header">
              <SellerAvatar
                username={group.sellerUsername}
                avatarUrl={group.sellerAvatarUrl}
                className="my-items-seller-avatar"
                size={52}
              />
              <div className="my-items-group-meta">
                <Link to={`/session/${group.sessionId}`} className="my-items-order-link">
                  {group.orderTitle}
                </Link>
                <p className="my-items-seller">@{group.sellerUsername}</p>
              </div>
              <span
                className={`status-pill-v2 ${isClosed ? "status-pill-v2-closed" : "status-pill-v2-open"}`}
              >
                <span className="status-dot" />
                {isClosed ? t("common.closed") : t("common.open")}
              </span>
            </header>

            <ul className="my-items-rows">
              {group.items.map((item) => (
                <li key={item.id} className="my-items-row">
                  <div className="my-items-row-main">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="my-items-item-title"
                    >
                      {item.itemTitle}
                      <ExternalLink size={14} aria-hidden />
                    </a>
                    <span className="my-items-listing-id muted fine">
                      #{listingIdFor({ listing_id: item.listingId, url: item.url })}
                    </span>
                    {item.ordererName && (
                      <span className="my-items-orderer muted fine">
                        {t("session.orderedBy")} {item.ordererName}
                      </span>
                    )}
                    <DiscogsCartActions
                      link={{ listing_id: item.listingId, url: item.url }}
                      onRemove={
                        !isClosed && onRemoveItem
                          ? () => onRemoveItem(item)
                          : undefined
                      }
                      removing={removingItemId === item.id}
                    />
                  </div>
                  <div className="my-items-row-price">
                    {formatPrice(item.priceValue, item.priceCurrency)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
