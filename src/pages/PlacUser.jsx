import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Store } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PlacListingCard } from "../components/PlacListingCard.jsx";
import { UserAvatar } from "../components/UserAvatar.jsx";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";

function sellerLabel(seller) {
  if (seller?.discogsUsername) return `@${seller.discogsUsername}`;
  if (seller?.username) return `@${seller.username}`;
  return seller?.name ?? "—";
}

export function PlacUser() {
  const { t } = useLocale();
  const { userId } = useParams();
  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api(`/api/plac/user/${userId}`)
      .then((data) => {
        setSeller(data.seller ?? null);
        setListings(data.listings ?? []);
      })
      .catch((err) => {
        setSeller(null);
        setListings([]);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const subtitle = useMemo(() => {
    if (loading) return t("common.loading");
    if (error) return error;
    if (!seller) return t("plac.sellerNotFound");
    return t("plac.sellerListingCount", { count: listings.length });
  }, [loading, error, seller, listings.length, t]);

  return (
    <div className="page page-orders page-plac page-plac-user">
      <div className="plac-user-header">
        <Link to="/plac" className="plac-user-back btn btn-ghost btn-sm">
          <ArrowLeft size={16} aria-hidden />
          {t("plac.backToMarketplace")}
        </Link>

        {seller && (
          <div className="plac-user-profile">
            <UserAvatar
              name={seller.name}
              avatarUrl={seller.picture}
              className="plac-user-avatar"
              size={72}
            />
            <div>
              <h1 className="plac-user-title">{sellerLabel(seller)}</h1>
              {seller.name && seller.discogsUsername && (
                <p className="muted fine">{seller.name}</p>
              )}
              <p className="muted fine">{subtitle}</p>
            </div>
          </div>
        )}

        {!seller && !loading && (
          <h1 className="plac-user-title">{t("plac.sellerNotFound")}</h1>
        )}
      </div>

      {loading ? (
        <p className="orders-loading">{t("common.loadingItems")}</p>
      ) : listings.length === 0 ? (
        <div className="orders-empty plac-empty">
          <Store size={40} strokeWidth={1.2} />
          <p>{error ? error : t("plac.sellerEmpty")}</p>
        </div>
      ) : (
        <div className="plac-grid plac-user-gallery">
          {listings.map((listing) => (
            <PlacListingCard key={listing.id} listing={listing} showSeller={false} />
          ))}
        </div>
      )}
    </div>
  );
}
