import { useEffect, useMemo, useState } from "react";
import { Store } from "lucide-react";
import { useParams } from "react-router-dom";
import { PlacListingCard } from "../components/PlacListingCard.jsx";
import { PlacPageHeader } from "../components/PlacPageHeader.jsx";
import { PlacSellDialog } from "../components/PlacSellDialog.jsx";
import { UserAvatar } from "../components/UserAvatar.jsx";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { usePlacGalleryView } from "../hooks/usePlacGalleryView.js";
import { resolveUserAvatarUrl } from "../utils/userAvatarUrl.js";

function sellerLabel(seller) {
  if (seller?.discogsUsername) return `@${seller.discogsUsername}`;
  if (seller?.username) return `@${seller.username}`;
  return seller?.name ?? "—";
}

export function PlacUser() {
  const { t } = useLocale();
  const { userId } = useParams();
  const { view, setView } = usePlacGalleryView();
  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [sellOpen, setSellOpen] = useState(false);

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

  const filteredListings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (listing) =>
        listing.artist?.toLowerCase().includes(q) ||
        listing.title?.toLowerCase().includes(q) ||
        listing.genre?.toLowerCase().includes(q) ||
        listing.country?.toLowerCase().includes(q) ||
        listing.category?.toLowerCase().includes(q)
    );
  }, [listings, query]);

  const headerSubtitle = useMemo(() => {
    if (loading) return t("common.loading");
    if (error) return error;
    if (!seller) return t("plac.sellerNotFound");
    const parts = [];
    if (seller.name && seller.discogsUsername) parts.push(seller.name);
    parts.push(t("plac.sellerListingCount", { count: listings.length }));
    return parts.join(" · ");
  }, [loading, error, seller, listings.length, t]);

  return (
    <div className="page page-orders page-plac page-plac-user">
      <PlacPageHeader
        backTo={{ to: "/plac", label: t("plac.backToMarketplace") }}
        titleLeading={
          seller ? (
            <UserAvatar
              name={seller.name}
              avatarUrl={resolveUserAvatarUrl(seller)}
              className="plac-user-avatar"
              size={56}
            />
          ) : null
        }
        title={seller ? sellerLabel(seller) : t("plac.sellerNotFound")}
        subtitle={headerSubtitle}
        query={query}
        onQueryChange={setQuery}
        placeholder={t("plac.searchPlaceholder")}
        onSell={() => setSellOpen(true)}
        showGalleryView={!loading && filteredListings.length > 0}
        galleryView={view}
        onGalleryViewChange={setView}
      />

      {loading ? (
        <p className="orders-loading">{t("common.loadingItems")}</p>
      ) : filteredListings.length === 0 ? (
        <div className="orders-empty plac-empty">
          <Store size={40} strokeWidth={1.2} />
          <p>{error ? error : query.trim() ? t("plac.emptySearch") : t("plac.sellerEmpty")}</p>
        </div>
      ) : (
        <div className={`plac-grid plac-user-gallery plac-grid--${view}`}>
          {filteredListings.map((listing) => (
            <PlacListingCard
              key={listing.id}
              listing={listing}
              showSeller={false}
              showCart
              detailLink
              iconActions={view === "large"}
            />
          ))}
        </div>
      )}

      <PlacSellDialog open={sellOpen} onClose={() => setSellOpen(false)} />
    </div>
  );
}
