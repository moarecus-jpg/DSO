import { useEffect, useState } from "react";
import { ArrowLeft, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../shared/orderTotals.js";
import { placListingTitle } from "../../shared/plac.js";
import { api } from "../api.js";
import { UserAvatar } from "../components/UserAvatar.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { resolveUserAvatarUrl } from "../utils/userAvatarUrl.js";

function partyLabel(party) {
  if (party?.discogsUsername) return `@${party.discogsUsername}`;
  if (party?.username) return `@${party.username}`;
  return party?.name ?? "—";
}

export function PlacOrders() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    api("/api/plac/orders")
      .then((data) => setOrders(data.orders ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(orderId, status) {
    setBusyId(orderId);
    try {
      const { order } = await api(`/api/plac/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((row) => (row.id === orderId ? order : row)));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page page-orders page-plac page-plac-orders">
      <div className="plac-cart-header">
        <Link to="/plac" className="plac-user-back btn btn-ghost btn-sm">
          <ArrowLeft size={16} aria-hidden />
          {t("plac.backToMarketplace")}
        </Link>
        <h1 className="plac-cart-title">{t("plac.ordersTitle")}</h1>
        <p className="muted fine">{t("plac.ordersSubtitle")}</p>
      </div>

      {loading ? (
        <p className="orders-loading">{t("common.loadingItems")}</p>
      ) : orders.length === 0 ? (
        <div className="orders-empty plac-empty">
          <Package size={40} strokeWidth={1.2} />
          <p>{t("plac.ordersEmpty")}</p>
        </div>
      ) : (
        <div className="plac-orders-list">
          {orders.map((order) => {
            const isBuyer = order.buyerId === user?.id;
            const counterparty = isBuyer ? order.seller : order.buyer;
            const roleLabel = isBuyer ? t("plac.orderFrom") : t("plac.orderBy");

            return (
              <article key={order.id} className="plac-order-card card">
                <div className="plac-order-head">
                  <UserAvatar
                    name={counterparty?.name ?? "—"}
                    avatarUrl={resolveUserAvatarUrl(counterparty)}
                    className="plac-cart-seller-avatar"
                    size={40}
                  />
                  <div>
                    <p className="muted fine">{roleLabel}</p>
                    <p className="plac-cart-seller-name">{partyLabel(counterparty)}</p>
                  </div>
                  <span className={`plac-order-status plac-order-status--${order.status}`}>
                    {t(`plac.orderStatus.${order.status}`)}
                  </span>
                </div>

                <ul className="plac-cart-items">
                  {(order.items ?? []).map((item) => (
                    <li key={item.id} className="plac-cart-item">
                      <div className="plac-cart-item-cover">
                        {item.thumbnailUrl ? (
                          <img src={item.thumbnailUrl} alt="" />
                        ) : (
                          <div className="plac-card-cover-fallback" aria-hidden />
                        )}
                      </div>
                      <div className="plac-cart-item-body">
                        <p className="plac-cart-item-title">
                          {placListingTitle(item)}
                        </p>
                      </div>
                      <span className="plac-cart-item-price">{formatPrice(item.priceValue)}</span>
                    </li>
                  ))}
                </ul>

                <div className="plac-order-footer">
                  <strong>{formatPrice(order.totalValue ?? 0)}</strong>
                  <div className="plac-order-actions">
                    {isBuyer && order.status === "pending" && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busyId === order.id}
                        onClick={() => updateStatus(order.id, "cancelled")}
                      >
                        {t("plac.cancelOrder")}
                      </button>
                    )}
                    {!isBuyer && order.status === "pending" && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busyId === order.id}
                          onClick={() => updateStatus(order.id, "accepted")}
                        >
                          {t("plac.acceptOrder")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-danger-text"
                          disabled={busyId === order.id}
                          onClick={() => updateStatus(order.id, "declined")}
                        >
                          {t("plac.declineOrder")}
                        </button>
                      </>
                    )}
                    {!isBuyer && order.status === "accepted" && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busyId === order.id}
                        onClick={() => updateStatus(order.id, "completed")}
                      >
                        {t("plac.completeOrder")}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
