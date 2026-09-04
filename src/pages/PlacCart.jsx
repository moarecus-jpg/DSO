import { useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatPrice } from "../../shared/orderTotals.js";
import { placListingTitle } from "../../shared/plac.js";
import { formatMediaGradeLabel } from "../../shared/orderReview.js";
import { PlacPageHeader } from "../components/PlacPageHeader.jsx";
import { PlacPrice } from "../components/PlacPrice.jsx";
import { PlacSellDialog } from "../components/PlacSellDialog.jsx";
import { api } from "../api.js";
import { UserAvatar } from "../components/UserAvatar.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { usePlacCart } from "../hooks/usePlacCart.jsx";
import { resolveUserAvatarUrl } from "../utils/userAvatarUrl.js";

function sellerLabel(seller) {
  if (seller?.discogsUsername) return `@${seller.discogsUsername}`;
  if (seller?.username) return `@${seller.username}`;
  return seller?.name ?? "—";
}

export function PlacCart() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, groupedBySeller, totalValue, removeItem, removeItems } = usePlacCart();
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [sellOpen, setSellOpen] = useState(false);

  async function handlePlaceOrder() {
    if (!items.length) return;
    setPlacing(true);
    setError(null);
    const placedIds = [];

    try {
      for (const group of groupedBySeller) {
        const sellerId = group.seller?.id ?? group.items[0]?.userId;
        const listingIds = group.items.map((item) => item.id);
        await api("/api/plac/orders", {
          method: "POST",
          body: JSON.stringify({ sellerId, listingIds, note: note.trim() || null }),
        });
        placedIds.push(...listingIds);
      }
      removeItems(placedIds);
      setNote("");
      navigate("/plac/orders");
    } catch (err) {
      setError(err.message ?? t("plac.orderFailed"));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="page page-orders page-plac page-plac-cart">
      <PlacPageHeader
        backTo={{ to: "/plac", label: t("plac.backToMarketplace") }}
        title={t("plac.cartTitle")}
        subtitle={t("plac.cartSubtitle")}
        showSearch={false}
        onSell={() => setSellOpen(true)}
      />

      {items.length === 0 ? (
        <div className="orders-empty plac-empty">
          <ShoppingCart size={40} strokeWidth={1.2} />
          <p>{t("plac.cartEmpty")}</p>
          <Link to="/plac" className="btn btn-primary">
            {t("plac.browse")}
          </Link>
        </div>
      ) : (
        <>
          <div className="plac-cart-groups">
            {groupedBySeller.map((group) => {
              const seller = group.seller;
              const sellerId = seller?.id ?? group.items[0]?.userId;
              const groupTotal = group.items.reduce((sum, item) => sum + item.priceValue, 0);

              return (
                <section key={sellerId} className="plac-cart-group card">
                  <div className="plac-cart-seller">
                    <UserAvatar
                      name={seller?.name ?? "—"}
                      avatarUrl={resolveUserAvatarUrl(seller)}
                      className="plac-cart-seller-avatar"
                      size={40}
                    />
                    <div>
                      <p className="plac-cart-seller-name">{sellerLabel(seller)}</p>
                      {seller?.name && seller?.discogsUsername && (
                        <p className="muted fine">{seller.name}</p>
                      )}
                    </div>
                    <span className="plac-cart-group-total">{formatPrice(groupTotal)}</span>
                  </div>

                  <ul className="plac-cart-items">
                    {group.items.map((item) => (
                      <li key={item.id} className="plac-cart-item">
                        <div className="plac-cart-item-cover">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" />
                          ) : (
                            <div className="plac-card-cover-fallback" aria-hidden />
                          )}
                        </div>
                        <div className="plac-cart-item-body">
                          <p className="plac-cart-item-title">{placListingTitle(item)}</p>
                          <p className="muted fine">
                            {item.listingType !== "other"
                              ? formatMediaGradeLabel(item.mediaCondition) || item.mediaCondition
                              : item.mediaCondition}
                          </p>
                        </div>
                        <PlacPrice listing={item} className="plac-cart-item-price" />
                        <button
                          type="button"
                          className="plac-cart-item-remove"
                          onClick={() => removeItem(item.id)}
                          aria-label={t("plac.removeFromCart")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <div className="plac-cart-checkout card">
            <label className="plac-cart-note">
              {t("plac.orderNote")}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("plac.orderNotePlaceholder")}
                rows={3}
                disabled={placing}
              />
            </label>

            <div className="plac-cart-summary">
              <span>{t("plac.cartTotal")}</span>
              <strong>{formatPrice(totalValue)}</strong>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
              type="button"
              className="btn btn-primary plac-cart-place-order"
              onClick={handlePlaceOrder}
              disabled={placing || !user}
            >
              {placing ? t("plac.placingOrder") : t("plac.placeOrder")}
            </button>
          </div>
        </>
      )}

      <PlacSellDialog open={sellOpen} onClose={() => setSellOpen(false)} />
    </div>
  );
}
