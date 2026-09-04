import { useEffect, useMemo, useState } from "react";
import { Plus, Store, BadgeCheck, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";
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
import { PlacEditDialog } from "../components/PlacEditDialog.jsx";
import { PlacListingCard } from "../components/PlacListingCard.jsx";
import { PlacPageHeader } from "../components/PlacPageHeader.jsx";
import { PlacSellerCard } from "../components/PlacSellerCard.jsx";
import { PlacSellDialog } from "../components/PlacSellDialog.jsx";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { usePlacGalleryView } from "../hooks/usePlacGalleryView.js";

const NARROW_DIG_MQ = "(max-width: 1500px)";

export function Plac() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const { view, setView } = usePlacGalleryView();
  const mine = pathname === "/plac/mine";
  const [listings, setListings] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const [editListing, setEditListing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [facets, setFacets] = useState(createEmptyPlacFacetSelection);
  const isNarrowDig = useMediaQuery(NARROW_DIG_MQ);
  const [filtersOpen, setFiltersOpen] = useState(() =>
    typeof window === "undefined"
      ? true
      : !window.matchMedia(NARROW_DIG_MQ).matches
  );

  useEffect(() => {
    setFiltersOpen(!isNarrowDig);
  }, [isNarrowDig]);

  useEffect(() => {
    if (!mine) return undefined;
    setLoading(true);
    setFacets(createEmptyPlacFacetSelection());
    api("/api/plac/mine")
      .then((d) => setListings(d.listings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
    return undefined;
  }, [mine]);

  useEffect(() => {
    if (mine) return undefined;
    setLoading(true);
    const url = query.trim()
      ? `/api/plac/sellers?q=${encodeURIComponent(query.trim())}`
      : "/api/plac/sellers";
    api(url)
      .then((d) => setSellers(d.sellers ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
    return undefined;
  }, [mine, query]);

  const textFiltered = useMemo(() => {
    if (!mine) return listings;
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
  }, [listings, query, mine]);

  const facetOptions = useMemo(
    () => (mine ? buildPlacFacetOptionsForSelection(textFiltered, facets) : {}),
    [mine, textFiltered, facets]
  );

  const filteredListings = useMemo(
    () => (mine ? filterListingsByPlacFacets(textFiltered, facets) : textFiltered),
    [mine, textFiltered, facets]
  );

  const showDig = mine && !loading && listings.length > 0;

  const activeFacetCount = useMemo(
    () =>
      PLAC_FACET_KEYS.reduce((sum, key) => sum + (facets[key]?.length ?? 0), 0),
    [facets]
  );

  function handleFiltersOpenChange(nextOpen) {
    setFiltersOpen(nextOpen);
  }

  const subtitle = useMemo(() => {
    if (loading) return t("common.loading");
    if (mine) {
      const active = listings.filter((l) => l.status === "active").length;
      return active === 0
        ? t("plac.emptyMine")
        : t("plac.myListingCount", { count: active });
    }
    return sellers.length === 0
      ? t("plac.subtitle")
      : t("plac.sellerCount", { count: sellers.length });
  }, [loading, listings, sellers, mine, t]);

  async function handleMarkSold(id) {
    setBusyId(id);
    try {
      const { listing } = await api(`/api/plac/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "sold" }),
      });
      setListings((prev) => prev.map((row) => (row.id === id ? listing : row)));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(id) {
    if (!confirm(t("plac.confirmRemove"))) return;
    setBusyId(id);
    try {
      await api(`/api/plac/${id}`, { method: "DELETE" });
      setListings((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function handleCreated(newListings) {
    const rows = Array.isArray(newListings) ? newListings : [newListings];
    setListings((prev) => [...rows, ...prev]);
  }

  const listingCards = filteredListings.map((listing) => (
    <PlacListingCard
      key={listing.id}
      listing={listing}
      showSeller={false}
      detailLink
      iconActions={view === "large" || view === "compact"}
      actions={
        <>
          {listing.status !== "active" && (
            <span className={`plac-status plac-status--${listing.status}`}>
              {t(`plac.${listing.status}`)}
            </span>
          )}
          {listing.status === "active" && (
            <>
              <button
                type="button"
                className={`btn btn-ghost btn-sm${
                  view === "list" ? "" : " plac-card-icon-btn"
                }`}
                disabled={busyId === listing.id}
                onClick={() => setEditListing(listing)}
                title={t("plac.edit")}
                aria-label={t("plac.edit")}
              >
                <Pencil size={16} aria-hidden />
                {view === "list" && t("plac.edit")}
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-sm${
                  view === "list" ? "" : " plac-card-icon-btn"
                }`}
                disabled={busyId === listing.id}
                onClick={() => handleMarkSold(listing.id)}
                title={t("plac.markSold")}
                aria-label={t("plac.markSold")}
              >
                <BadgeCheck size={16} aria-hidden />
                {view === "list" && t("plac.markSold")}
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-sm btn-danger-text${
                  view === "list" ? "" : " plac-card-icon-btn"
                }`}
                disabled={busyId === listing.id}
                onClick={() => handleRemove(listing.id)}
                title={t("plac.remove")}
                aria-label={t("plac.remove")}
              >
                <Trash2 size={16} aria-hidden />
                {view === "list" && t("plac.remove")}
              </button>
            </>
          )}
        </>
      }
    />
  ));

  const mineHeader = (
    <PlacPageHeader
      title={t("plac.title")}
      subtitle={subtitle}
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

  const mineEmptyMessage =
    query.trim() || hasActivePlacFacets(facets)
      ? t("plac.emptySearch")
      : t("plac.emptyMine");

  return (
    <div
      className={`page page-orders page-plac${
        showDig ? " page-plac-user page-plac-user--dig" : ""
      }`}
    >
      {loading ? (
        <>
          {mine ? (
            mineHeader
          ) : (
            <PlacPageHeader
              title={t("plac.title")}
              subtitle={subtitle}
              query={query}
              onQueryChange={setQuery}
              placeholder={t("plac.searchSellersPlaceholder")}
              onSell={() => setSellOpen(true)}
              showGalleryView={false}
            />
          )}
          <p className="orders-loading">{t("common.loadingItems")}</p>
        </>
      ) : mine ? (
        !showDig ? (
          <>
            {mineHeader}
            <div className="orders-empty plac-empty">
              <Store size={40} strokeWidth={1.2} />
              <p>{mineEmptyMessage}</p>
              <button type="button" className="btn btn-primary" onClick={() => setSellOpen(true)}>
                <Plus size={18} aria-hidden />
                {t("plac.sell")}
              </button>
            </div>
          </>
        ) : (
          <div className={`plac-dig${filtersOpen ? " plac-dig--filters-open" : ""}`}>
            <PlacDigFilters
              options={facetOptions}
              selected={facets}
              onChange={setFacets}
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
            />

            <div className="plac-dig-main">
              {mineHeader}

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
                  {listingCards}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <>
          <PlacPageHeader
            title={t("plac.title")}
            subtitle={subtitle}
            query={query}
            onQueryChange={setQuery}
            placeholder={t("plac.searchSellersPlaceholder")}
            onSell={() => setSellOpen(true)}
            showGalleryView={false}
          />
          {sellers.length === 0 ? (
            <div className="orders-empty plac-empty">
              <Store size={40} strokeWidth={1.2} />
              <p>{t("plac.empty")}</p>
              <button type="button" className="btn btn-primary" onClick={() => setSellOpen(true)}>
                <Plus size={18} aria-hidden />
                {t("plac.sell")}
              </button>
            </div>
          ) : (
            <div className="plac-seller-grid">
              {sellers.map((seller) => (
                <PlacSellerCard key={seller.id} seller={seller} />
              ))}
            </div>
          )}
        </>
      )}

      <PlacSellDialog
        open={sellOpen}
        onClose={() => setSellOpen(false)}
        onCreated={handleCreated}
      />
      <PlacEditDialog
        open={Boolean(editListing)}
        listing={editListing}
        onClose={() => setEditListing(null)}
        onSaved={(updated) => {
          setListings((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
          setEditListing(updated);
        }}
      />
    </div>
  );
}
