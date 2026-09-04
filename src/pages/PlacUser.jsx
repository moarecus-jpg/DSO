import { useEffect, useMemo, useState } from "react";
import { Store } from "lucide-react";
import { useParams } from "react-router-dom";
import {
  buildPlacFacetOptionsForSelection,
  createEmptyPlacFacetSelection,
  filterListingsByPlacFacets,
  hasActivePlacFacets,
  PLAC_FACET_KEYS,
} from "../../shared/placFacets.js";
import {
  PlacDigFilters,
  PlacDigFiltersToggle,
} from "../components/PlacDigFilters.jsx";
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
  const [facets, setFacets] = useState(createEmptyPlacFacetSelection);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setFacets(createEmptyPlacFacetSelection());
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

  const textFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (listing) =>
        listing.artist?.toLowerCase().includes(q) ||
        listing.title?.toLowerCase().includes(q) ||
        listing.genre?.toLowerCase().includes(q) ||
        listing.country?.toLowerCase().includes(q) ||
        listing.category?.toLowerCase().includes(q) ||
        listing.format?.toLowerCase().includes(q)
    );
  }, [listings, query]);

  const facetOptions = useMemo(
    () => buildPlacFacetOptionsForSelection(textFiltered, facets),
    [textFiltered, facets]
  );

  const filteredListings = useMemo(
    () => filterListingsByPlacFacets(textFiltered, facets),
    [textFiltered, facets]
  );

  const headerSubtitle = useMemo(() => {
    if (loading) return t("common.loading");
    if (error) return error;
    if (!seller) return t("plac.sellerNotFound");
    const parts = [];
    if (seller.name && seller.discogsUsername) parts.push(seller.name);
    parts.push(t("plac.sellerListingCount", { count: listings.length }));
    if (seller.shopDiscountPercent > 0) {
      parts.push(
        seller.shopDiscountLabel?.trim() ||
          t("plac.shopSaleBadge", { percent: seller.shopDiscountPercent })
      );
    }
    return parts.join(" · ");
  }, [loading, error, seller, listings.length, t]);

  const showDig = !loading && listings.length > 0;
  const emptyMessage = error
    ? error
    : query.trim() || hasActivePlacFacets(facets)
      ? t("plac.emptySearch")
      : t("plac.sellerEmpty");

  const activeFacetCount = useMemo(
    () =>
      PLAC_FACET_KEYS.reduce((sum, key) => sum + (facets[key]?.length ?? 0), 0),
    [facets]
  );

  function handleFiltersOpenChange(nextOpen) {
    setFiltersOpen(nextOpen);
    if (!nextOpen) {
      setFacets(createEmptyPlacFacetSelection());
    }
  }

  const pageHeader = (
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
      showGalleryView={showDig && filteredListings.length > 0}
      galleryView={view}
      onGalleryViewChange={setView}
      navMiddle={
        showDig ? (
          <PlacDigFiltersToggle
            open={filtersOpen}
            onOpenChange={handleFiltersOpenChange}
            activeCount={activeFacetCount}
          />
        ) : null
      }
    />
  );

  return (
    <div
      className={`page page-orders page-plac page-plac-user${
        showDig ? " page-plac-user--dig" : ""
      }`}
    >
      {loading ? (
        <>
          {pageHeader}
          <p className="orders-loading">{t("common.loadingItems")}</p>
        </>
      ) : !showDig ? (
        <>
          {pageHeader}
          <div className="orders-empty plac-empty">
            <Store size={40} strokeWidth={1.2} />
            <p>{emptyMessage}</p>
          </div>
        </>
      ) : (
        <div className={`plac-dig${filtersOpen ? " plac-dig--filters-open" : ""}`}>
          <PlacDigFilters
            options={facetOptions}
            selected={facets}
            onChange={setFacets}
            open={filtersOpen}
          />

          <div className="plac-dig-main">
            {pageHeader}

            <div className="plac-dig-toolbar">
              <p className="plac-dig-toolbar-count muted fine">
                {t("plac.facets.showing", {
                  shown: filteredListings.length,
                  total: listings.length,
                })}
              </p>
            </div>

            {filteredListings.length === 0 ? (
              <div className="orders-empty plac-empty plac-dig-empty">
                <Store size={40} strokeWidth={1.2} />
                <p>{t("plac.emptySearch")}</p>
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
                    view={view}
                    iconActions={view === "large" || view === "compact"}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <PlacSellDialog open={sellOpen} onClose={() => setSellOpen(false)} />
    </div>
  );
}
