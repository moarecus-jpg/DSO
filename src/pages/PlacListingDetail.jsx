import { useEffect, useState } from "react";
import { ExternalLink, Store } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatPrice } from "../../shared/orderTotals.js";
import { placListingTitle } from "../../shared/plac.js";
import { PlacAddToCartButton } from "../components/PlacAddToCartButton.jsx";
import { PlacPageHeader } from "../components/PlacPageHeader.jsx";
import { PlacSellDialog } from "../components/PlacSellDialog.jsx";
import { UserAvatar } from "../components/UserAvatar.jsx";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { usePlacCart } from "../hooks/usePlacCart.jsx";
import { resolveUserAvatarUrl } from "../utils/userAvatarUrl.js";

function sellerLabel(seller) {
  if (seller?.discogsUsername) return `@${seller.discogsUsername}`;
  if (seller?.username) return `@${seller.username}`;
  return seller?.name ?? "—";
}

export function PlacListingDetail() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const { user } = useAuth();
  const { count: cartCount } = usePlacCart();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api(`/api/plac/${listingId}`)
      .then((data) => setListing(data.listing ?? null))
      .catch((err) => {
        setListing(null);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [listingId]);

  const isOwner = user?.id === listing?.userId;
  const isVinyl = listing?.listingType !== "other";
  const titleText = listing ? placListingTitle(listing) : "";
  const backTo = listing?.seller?.id ? `/plac/u/${listing.seller.id}` : "/plac";

  async function handleMarkSold() {
    setBusy(true);
    try {
      const { listing: updated } = await api(`/api/plac/${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "sold" }),
      });
      setListing(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!confirm(t("plac.confirmRemove"))) return;
    setBusy(true);
    try {
      await api(`/api/plac/${listing.id}`, { method: "DELETE" });
      navigate("/plac/mine", { replace: true });
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-orders page-plac page-plac-detail">
      <PlacPageHeader
        backTo={{ to: backTo, label: t("plac.backToSeller") }}
        title={loading ? t("common.loading") : listing ? titleText : t("plac.listingNotFound")}
        subtitle={listing?.seller ? sellerLabel(listing.seller) : error ?? undefined}
        showSearch={false}
        cartCount={cartCount}
        onSell={() => setSellOpen(true)}
      />

      {loading ? (
        <p className="orders-loading">{t("common.loadingItems")}</p>
      ) : !listing ? (
        <div className="orders-empty plac-empty">
          <Store size={40} strokeWidth={1.2} />
          <p>{error ?? t("plac.listingNotFound")}</p>
        </div>
      ) : (
        <article className="plac-detail card">
          <div className="plac-detail-layout">
            <div className="plac-detail-cover">
              {listing.thumbnailUrl ? (
                <img src={listing.thumbnailUrl} alt="" />
              ) : (
                <div className="plac-card-cover-fallback" aria-hidden />
              )}
              {listing.category && listing.category !== "vinyl" && (
                <span className="plac-card-category">{t(`plac.category.${listing.category}`)}</span>
              )}
            </div>

            <div className="plac-detail-body">
              {listing.status !== "active" && (
                <span className={`plac-status plac-status--${listing.status}`}>
                  {t(`plac.${listing.status}`)}
                </span>
              )}

              <h1 className="plac-detail-title">{titleText}</h1>

              {isVinyl && (
                <div className="plac-detail-meta">
                  {listing.year != null && <span>{listing.year}</span>}
                  {listing.genre && <span>{listing.genre}</span>}
                  {listing.country && <span>{listing.country}</span>}
                </div>
              )}

              {listing.format && <p className="muted fine">{listing.format}</p>}

              <div className="plac-detail-conditions">
                <div>
                  <span className="plac-detail-label">{t("plac.mediaCondition")}</span>
                  <span className="plac-card-condition">{listing.mediaCondition}</span>
                </div>
                {listing.sleeveCondition && (
                  <div>
                    <span className="plac-detail-label">{t("plac.sleeveCondition")}</span>
                    <span className="plac-card-condition">{listing.sleeveCondition}</span>
                  </div>
                )}
              </div>

              {listing.note && (
                <div className="plac-detail-note">
                  <span className="plac-detail-label">{t("plac.note")}</span>
                  <p>{listing.note}</p>
                </div>
              )}

              <p className="plac-detail-price">{formatPrice(listing.priceValue)}</p>

              {listing.seller && (
                <Link to={`/plac/u/${listing.seller.id}`} className="plac-detail-seller">
                  <UserAvatar
                    name={listing.seller.name}
                    avatarUrl={resolveUserAvatarUrl(listing.seller)}
                    className="plac-cart-seller-avatar"
                    size={40}
                  />
                  <div>
                    <span className="plac-detail-label">{t("plac.seller")}</span>
                    <p className="plac-detail-seller-name">{sellerLabel(listing.seller)}</p>
                    {listing.seller.name && listing.seller.discogsUsername && (
                      <p className="muted fine">{listing.seller.name}</p>
                    )}
                  </div>
                </Link>
              )}

              <div className="plac-detail-actions">
                {!isOwner && listing.status === "active" && (
                  <PlacAddToCartButton listing={listing} large />
                )}

                {listing.releaseUrl && (
                  <a
                    href={listing.releaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost"
                  >
                    <ExternalLink size={16} aria-hidden />
                    {t("plac.openExternal")}
                  </a>
                )}

                {isOwner && listing.status === "active" && (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy}
                      onClick={handleMarkSold}
                    >
                      {t("plac.markSold")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-danger-text"
                      disabled={busy}
                      onClick={handleRemove}
                    >
                      {t("plac.remove")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </article>
      )}

      <PlacSellDialog open={sellOpen} onClose={() => setSellOpen(false)} />
    </div>
  );
}
