import { useEffect, useMemo, useState } from "react";
import { Plus, Store } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { PlacListingCard } from "../components/PlacListingCard.jsx";
import { PlacSellDialog } from "../components/PlacSellDialog.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function Plac() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const mine = pathname === "/plac/mine";
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    setLoading(true);
    const path = mine ? "/api/plac/mine" : "/api/plac";
    const url = !mine && query.trim() ? `${path}?q=${encodeURIComponent(query.trim())}` : path;
    api(url)
      .then((d) => setListings(d.listings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mine, query]);

  const displayedListings = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (listing) =>
        listing.artist?.toLowerCase().includes(q) ||
        listing.title?.toLowerCase().includes(q) ||
        listing.genre?.toLowerCase().includes(q) ||
        listing.country?.toLowerCase().includes(q) ||
        listing.seller?.name?.toLowerCase().includes(q)
    );
  }, [listings, query]);

  const subtitle = useMemo(() => {
    if (loading) return t("common.loading");
    if (mine) {
      const active = listings.filter((l) => l.status === "active").length;
      return active === 0
        ? t("plac.emptyMine")
        : t("plac.myListingCount", { count: active });
    }
    return displayedListings.length === 0
      ? t("plac.subtitle")
      : t("plac.listingCount", { count: displayedListings.length });
  }, [loading, listings, displayedListings, mine, t]);

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

  function handleCreated(listing) {
    setListings((prev) => [listing, ...prev]);
  }

  return (
    <div className="page page-orders page-plac">
      <OrdersPageHeader
        title={t("plac.title")}
        subtitle={subtitle}
        query={query}
        onQueryChange={setQuery}
        placeholder={t("plac.searchPlaceholder")}
      />

      <div className="plac-toolbar">
        <div className="plac-tabs" role="tablist" aria-label={t("plac.title")}>
          <Link
            to="/plac"
            className={`plac-tab${!mine ? " active" : ""}`}
            role="tab"
            aria-selected={!mine}
          >
            <Store size={16} aria-hidden />
            {t("plac.browse")}
          </Link>
          <Link
            to="/plac/mine"
            className={`plac-tab${mine ? " active" : ""}`}
            role="tab"
            aria-selected={mine}
          >
            {t("plac.mine")}
          </Link>
        </div>

        <button type="button" className="btn btn-primary plac-sell-btn" onClick={() => setSellOpen(true)}>
          <Plus size={18} aria-hidden />
          {t("plac.sell")}
        </button>
      </div>

      {loading ? (
        <p className="orders-loading">{t("common.loadingItems")}</p>
      ) : displayedListings.length === 0 ? (
        <div className="orders-empty plac-empty">
          <Store size={40} strokeWidth={1.2} />
          <p>{mine ? t("plac.emptyMine") : t("plac.empty")}</p>
          <button type="button" className="btn btn-primary" onClick={() => setSellOpen(true)}>
            <Plus size={18} aria-hidden />
            {t("plac.sell")}
          </button>
        </div>
      ) : (
        <div className="plac-grid">
          {displayedListings.map((listing) => (
            <PlacListingCard
              key={listing.id}
              listing={listing}
              showSeller={!mine}
              actions={
                mine ? (
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
                ) : null
              }
            />
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
