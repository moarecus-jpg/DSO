import { useEffect, useState } from "react";
import { ExternalLink, Heart, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../shared/orderTotals.js";
import { sellerMywantsUrl } from "../../shared/discogsUrls.js";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { DiscogsAddToCartLink } from "./DiscogsAddToCartLink.jsx";

function matchTitle(match) {
  if (match.artist && match.title) return `${match.artist} — ${match.title}`;
  return match.title ?? match.artist ?? `#${match.releaseId}`;
}

function matchCondition(listing) {
  const media = listing?.condition;
  const sleeve = listing?.sleeve_condition;
  if (media && sleeve) return `${media} / ${sleeve}`;
  return media || sleeve || null;
}

export function WantlistPicks({
  sessionId,
  sellerUsername,
  isClosed = false,
  onAddListing,
  addingListingId = null,
}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const [state, setState] = useState({
    loading: true,
    connected: false,
    matches: [],
    discogsMywantsUrl: null,
    scanNote: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    setState((prev) => ({ ...prev, loading: true, error: null }));

    api(`/api/sessions/${sessionId}/my-matches`, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          connected: Boolean(data.connected),
          matches: data.matches ?? [],
          discogsMywantsUrl: data.discogsMywantsUrl ?? null,
          scanNote: data.scanNote ?? null,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const aborted = err?.name === "AbortError" || controller.signal.aborted;
        setState({
          loading: false,
          connected: false,
          matches: [],
          discogsMywantsUrl: sellerMywantsUrl(
            sellerUsername,
            user?.discogsUsername
          ),
          scanNote: null,
          error: aborted
            ? t("session.wantlistTimeout")
            : err.message ?? t("common.error"),
        });
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [sessionId, sellerUsername, user?.discogsUsername, t]);

  const wantlistUrl =
    state.discogsMywantsUrl ??
    sellerMywantsUrl(sellerUsername, user?.discogsUsername);

  return (
    <section className="wantlist-picks-block card wantlist-in-app-section">
      <h2 className="wantlist-picks-heading">
        <Heart size={18} aria-hidden />
        {t("session.wantlistTitle")}
      </h2>

      {state.loading && (
        <p className="wantlist-picks-status muted">{t("session.wantlistLoading")}</p>
      )}

      {!state.loading && state.error && (
        <p className="wantlist-picks-status warn">{state.error}</p>
      )}

      {!state.loading && !state.error && !state.connected && (
        <p className="wantlist-picks-status warn">
          {t("session.wantlistConnect")}{" "}
          <Link to="/settings">{t("settings.title")}</Link>
        </p>
      )}

      {!state.loading && !state.error && state.connected && state.scanNote && (
        <p className="wantlist-scan-note muted fine">{state.scanNote}</p>
      )}

      {!state.loading && !state.error && state.connected && state.matches.length === 0 && (
        <p className="wantlist-picks-status muted">{t("session.wantlistEmpty")}</p>
      )}

      {!state.loading && !state.error && state.matches.length > 0 && (
        <>
          <p className="muted fine">
            {t("session.wantlistCount", { count: state.matches.length })}
          </p>
          <ul className="modal-wantlist-picks wantlist-picks-list">
            {state.matches.map((match) => {
              const listing = match.listing ?? {};
              const listingUrl = listing.uri ?? `https://www.discogs.com/sell/item/${listing.id}`;
              const price = formatPrice(listing.price?.value, listing.price?.currency);
              const condition = matchCondition(listing);
              const adding = addingListingId === listing.id;

              return (
                <li key={`${match.releaseId}-${listing.id}`} className="modal-wantlist-pick">
                  {match.thumbnail ? (
                    <img
                      src={match.thumbnail}
                      alt=""
                      className="modal-wantlist-thumb"
                      loading="lazy"
                    />
                  ) : (
                    <div className="modal-wantlist-thumb modal-wantlist-thumb-placeholder" aria-hidden>
                      <Heart size={16} />
                    </div>
                  )}

                  <div className="modal-wantlist-pick-main">
                    <strong>{matchTitle(match)}</strong>
                    {match.year != null && (
                      <span className="muted fine">{match.year}</span>
                    )}
                    {condition && <span className="muted fine">{condition}</span>}
                    <span className="wantlist-pick-price">{price}</span>
                  </div>

                  <div className="wantlist-pick-actions">
                    <a
                      href={listingUrl}
                      target="_blank"
                      rel="noreferrer"
                        className="btn btn-ghost btn-small wantlist-pick-link"
                    >
                      <ExternalLink size={14} aria-hidden />
                      {t("session.openListing")}
                    </a>
                    <DiscogsAddToCartLink
                      link={{ listing_id: listing.id, url: listingUrl }}
                      className="btn btn-ghost btn-small"
                    />
                    {!isClosed && onAddListing && (
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        disabled={adding}
                        onClick={() => onAddListing(listingUrl, listing.id)}
                      >
                        <Plus size={14} aria-hidden />
                        {adding ? t("session.wantlistAdding") : t("session.wantlistAdd")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {wantlistUrl && (
        <a
          href={wantlistUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost wantlist-discogs-open"
        >
          <ExternalLink size={16} aria-hidden />
          {t("session.openWantlist")}
        </a>
      )}
    </section>
  );
}
