import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Store } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { formatPrice } from "../../shared/orderTotals.js";
import { placListingTitle } from "../../shared/plac.js";
import { formatPlacListingFormat, normalizePlacYear } from "../../shared/placFormat.js";
import { PlacAddToCartButton } from "../components/PlacAddToCartButton.jsx";
import { PlacPageHeader } from "../components/PlacPageHeader.jsx";
import { PlacSellDialog } from "../components/PlacSellDialog.jsx";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

function sellerLabel(seller) {
  if (seller?.discogsUsername) return `@${seller.discogsUsername}`;
  if (seller?.username) return `@${seller.username}`;
  return seller?.name ?? "—";
}

function joinList(values) {
  return (values ?? []).filter(Boolean).join(", ");
}

function formatLabels(labels) {
  if (!labels?.length) return null;
  return labels
    .map((label) => (label.catno ? `${label.name} — ${label.catno}` : label.name))
    .filter(Boolean)
    .join(", ");
}

export function PlacListingDetail() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [error, setError] = useState(null);
  const [releaseError, setReleaseError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setRelease(null);
    setReleaseError(null);
    api(`/api/plac/${listingId}`)
      .then((data) => setListing(data.listing ?? null))
      .catch((err) => {
        setListing(null);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [listingId]);

  useEffect(() => {
    if (!listing?.releaseId) {
      setRelease(null);
      setReleaseLoading(false);
      return;
    }

    let cancelled = false;
    setReleaseLoading(true);
    setReleaseError(null);
    api(`/api/plac/${listing.id}/release`)
      .then((data) => {
        if (!cancelled) setRelease(data.release ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setRelease(null);
          setReleaseError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setReleaseLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listing?.id, listing?.releaseId]);

  const isOwner = user?.id === listing?.userId;
  const isVinyl = listing?.listingType !== "other";
  const titleText = listing ? placListingTitle(listing) : "";
  const backTo = listing?.seller?.id ? `/plac/u/${listing.seller.id}` : "/plac";

  const coverUrl =
    release?.images?.find((image) => image.type === "primary")?.uri ||
    release?.images?.[0]?.uri ||
    listing?.thumbnailUrl ||
    null;

  const displayArtist = release?.artist || listing?.artist || null;
  const displayTitle = release?.title || listing?.title || titleText;
  const displayYear = normalizePlacYear(release?.year ?? listing?.year);
  const displayFormat =
    formatPlacListingFormat(release?.format) ||
    formatPlacListingFormat(listing?.format) ||
    null;
  const displayCountry = release?.country || listing?.country || null;
  const displayGenres = joinList(release?.genres) || listing?.genre || null;
  const displayStyles = joinList(release?.styles);
  const displayLabels = formatLabels(release?.labels);
  const discogsUrl = release?.uri || listing?.releaseUrl || null;

  const infoRows = useMemo(
    () =>
      [
        displayLabels ? { label: t("plac.releaseLabel"), value: displayLabels } : null,
        displayFormat ? { label: t("plac.releaseFormat"), value: displayFormat } : null,
        displayCountry ? { label: t("plac.releaseCountry"), value: displayCountry } : null,
        displayYear != null ? { label: t("plac.releaseYear"), value: String(displayYear) } : null,
        displayGenres ? { label: t("plac.releaseGenre"), value: displayGenres } : null,
        displayStyles ? { label: t("plac.releaseStyle"), value: displayStyles } : null,
      ].filter(Boolean),
    [
      displayCountry,
      displayFormat,
      displayGenres,
      displayLabels,
      displayStyles,
      displayYear,
      t,
    ]
  );

  const tracklist = release?.tracklist ?? [];

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
        <div className="plac-release">
          <section className="plac-release-hero card">
            <div className="plac-release-cover">
              {coverUrl ? (
                <img src={coverUrl} alt="" />
              ) : (
                <div className="plac-card-cover-fallback" aria-hidden />
              )}
              {listing.category && listing.category !== "vinyl" && (
                <span className="plac-card-category">{t(`plac.category.${listing.category}`)}</span>
              )}
            </div>

            <div className="plac-release-summary">
              {listing.status !== "active" && (
                <span className={`plac-status plac-status--${listing.status}`}>
                  {t(`plac.${listing.status}`)}
                </span>
              )}

              {displayArtist && <p className="plac-release-artist">{displayArtist}</p>}
              <h1 className="plac-release-title">{displayTitle}</h1>

              {(displayYear != null || displayCountry || displayGenres) && (
                <p className="plac-release-eyebrow">
                  {[displayYear, displayGenres, displayCountry].filter(Boolean).join(" · ")}
                </p>
              )}

              {(release?.community?.have != null || release?.community?.want != null) && (
                <div className="plac-release-community" aria-label={t("plac.communityStats")}>
                  {release.community.have != null && (
                    <span className="plac-release-stat">
                      <strong>{release.community.have.toLocaleString()}</strong>
                      {t("plac.have")}
                    </span>
                  )}
                  {release.community.want != null && (
                    <span className="plac-release-stat">
                      <strong>{release.community.want.toLocaleString()}</strong>
                      {t("plac.want")}
                    </span>
                  )}
                  {release.community.ratingAverage != null && (
                    <span className="plac-release-stat plac-release-stat--rating">
                      <strong>{release.community.ratingAverage.toFixed(2)}</strong>
                      {t("plac.rating")}
                      {release.community.ratingCount != null && (
                        <span className="plac-release-stat-count">
                          ({release.community.ratingCount.toLocaleString()})
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )}

              {infoRows.length > 0 && (
                <dl className="plac-release-facts">
                  {infoRows.map((row) => (
                    <div key={row.label} className="plac-release-fact">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {discogsUrl && (
                <a
                  href={discogsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost btn-sm plac-release-discogs-link"
                >
                  <ExternalLink size={16} aria-hidden />
                  {t("plac.openExternal")}
                </a>
              )}
            </div>
          </section>

          <section className="plac-release-offer card">
            <h2 className="plac-release-section-title">{t("plac.listingOffer")}</h2>

            <div className="plac-release-offer-grid">
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

              <div className="plac-detail-purchase">
                <p className="plac-detail-price">{formatPrice(listing.priceValue)}</p>
                <div className="plac-detail-actions">
                  {!isOwner && listing.status === "active" && (
                    <PlacAddToCartButton listing={listing} large />
                  )}

                  {isOwner && listing.status === "active" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={handleMarkSold}
                      >
                        {t("plac.markSold")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-danger-text"
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
          </section>

          {isVinyl && (
            <section className="plac-release-tracklist card">
              <h2 className="plac-release-section-title">{t("plac.tracklist")}</h2>

              {releaseLoading ? (
                <p className="muted fine">{t("common.loading")}</p>
              ) : releaseError ? (
                <p className="muted fine">{releaseError}</p>
              ) : tracklist.length === 0 ? (
                <p className="muted fine">{t("plac.tracklistEmpty")}</p>
              ) : (
                <ol className="plac-tracklist">
                  {tracklist.map((track, index) => {
                    const isHeading = track.type === "heading";
                    return (
                      <li
                        key={`${track.position ?? "t"}-${track.title ?? index}-${index}`}
                        className={`plac-track${isHeading ? " plac-track--heading" : ""}`}
                      >
                        {!isHeading && (
                          <span className="plac-track-pos">{track.position || "—"}</span>
                        )}
                        <div className="plac-track-main">
                          <span className="plac-track-title">
                            {track.artists ? `${track.artists} — ${track.title}` : track.title}
                          </span>
                        </div>
                        {!isHeading && track.duration && (
                          <span className="plac-track-duration">{track.duration}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              {release?.notes && (
                <div className="plac-release-notes">
                  <h3 className="plac-detail-label">{t("plac.releaseNotes")}</h3>
                  <p>{release.notes}</p>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <PlacSellDialog open={sellOpen} onClose={() => setSellOpen(false)} />
    </div>
  );
}
