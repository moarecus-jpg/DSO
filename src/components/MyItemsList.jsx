import { Link } from "react-router-dom";
import { Disc3, ExternalLink } from "lucide-react";
import { DiscogsCartActions } from "./DiscogsCartActions.jsx";
import { formatPrice, isLinkUnavailable, listingIdFor } from "../../shared/orderTotals.js";
import { getStoreConfig, isShopStore } from "../../shared/stores.js";
import { isArchivedSession } from "../../shared/orderStatus.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { OrderStoreAvatar } from "./OrderStoreAvatar.jsx";
import { StatusPill } from "./StatusPill.jsx";

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
        const isArchived = isArchivedSession(group.sessionStatus);
        const storeConfig = isShopStore(group.store)
          ? getStoreConfig(group.store)
          : null;
        return (
          <section key={group.sessionId} className="my-items-group">
            <header className="my-items-group-header">
              <OrderStoreAvatar
                store={group.store}
                username={group.sellerUsername}
                avatarUrl={group.sellerAvatarUrl}
                className="my-items-seller-avatar"
                size={52}
              />
              <div className="my-items-group-meta">
                <Link to={`/session/${group.sessionId}`} className="my-items-order-link">
                  {group.orderTitle}
                </Link>
                <p className="my-items-seller">
                  {storeConfig ? storeConfig.label : `@${group.sellerUsername}`}
                </p>
              </div>
              <StatusPill status={group.sessionStatus} />
            </header>

            <ul className="my-items-rows">
              {group.items.map((item) => {
                const unavailable = isLinkUnavailable(item);
                return (
                <li
                  key={item.id}
                  className={`my-items-row${unavailable ? " my-items-row--unavailable" : ""}`}
                >
                  <div className="my-items-row-main">
                    {unavailable && (
                      <span className="order-item-unavailable-badge">
                        {t("items.unavailable")}
                      </span>
                    )}
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
                      link={{
                        listing_id: item.listingId,
                        url: item.url,
                        availability: item.availability,
                      }}
                      store={group.store}
                      onRemove={
                        !isArchived && onRemoveItem
                          ? () => onRemoveItem(item)
                          : undefined
                      }
                      removing={removingItemId === item.id}
                    />
                  </div>
                  <div className="my-items-row-price">
                    {unavailable ? (
                      <span className="order-item-price--unavailable">
                        {formatPrice(item.priceValue, item.priceCurrency)}
                      </span>
                    ) : (
                      formatPrice(item.priceValue, item.priceCurrency)
                    )}
                  </div>
                </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
