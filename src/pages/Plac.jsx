import { useEffect, useMemo, useState } from "react";
import { Plus, Store } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { PlacListingCard } from "../components/PlacListingCard.jsx";
import { PlacPageHeader } from "../components/PlacPageHeader.jsx";
import { PlacSellerCard } from "../components/PlacSellerCard.jsx";
import { PlacSellDialog } from "../components/PlacSellDialog.jsx";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { usePlacCart } from "../hooks/usePlacCart.jsx";
import { usePlacGalleryView } from "../hooks/usePlacGalleryView.js";

export function Plac() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const { count: cartCount } = usePlacCart();
  const { view, setView } = usePlacGalleryView();
  const mine = pathname === "/plac/mine";
  const [listings, setListings] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    setLoading(true);
    if (mine) {
      api("/api/plac/mine")
        .then((d) => setListings(d.listings ?? []))
        .catch(console.error)
        .finally(() => setLoading(false));
      return;
    }

    const url = query.trim()
      ? `/api/plac/sellers?q=${encodeURIComponent(query.trim())}`
      : "/api/plac/sellers";
    api(url)
      .then((d) => setSellers(d.sellers ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mine, query]);

  const displayedListings = useMemo(() => {
    if (!mine) return listings;
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
  }, [listings, query, mine]);

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

  return (
    <div className="page page-orders page-plac">
      <PlacPageHeader
        title={t("plac.title")}
        subtitle={subtitle}
        query={query}
        onQueryChange={setQuery}
        placeholder={mine ? t("plac.searchPlaceholder") : t("plac.searchSellersPlaceholder")}
        cartCount={cartCount}
        onSell={() => setSellOpen(true)}
        showGalleryView={mine && !loading && displayedListings.length > 0}
        galleryView={view}
        onGalleryViewChange={setView}
      />

      {loading ? (
        <p className="orders-loading">{t("common.loadingItems")}</p>
      ) : mine ? (
        displayedListings.length === 0 ? (
          <div className="orders-empty plac-empty">
            <Store size={40} strokeWidth={1.2} />
            <p>{t("plac.emptyMine")}</p>
            <button type="button" className="btn btn-primary" onClick={() => setSellOpen(true)}>
              <Plus size={18} aria-hidden />
              {t("plac.sell")}
            </button>
          </div>
        ) : (
          <div className={`plac-grid plac-grid--${view}`}>
              {displayedListings.map((listing) => (
              <PlacListingCard
                key={listing.id}
                listing={listing}
                showSeller={false}
                detailLink
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
                          className="btn btn-ghost btn-sm"
                          disabled={busyId === listing.id}
                          onClick={() => handleMarkSold(listing.id)}
                        >
                          {t("plac.markSold")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-danger-text"
                          disabled={busyId === listing.id}
                          onClick={() => handleRemove(listing.id)}
                        >
                          {t("plac.remove")}
                        </button>
                      </>
                    )}
                  </>
                }
              />
            ))}
            </div>
        )
      ) : sellers.length === 0 ? (
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

      <PlacSellDialog
        open={sellOpen}
        onClose={() => setSellOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
