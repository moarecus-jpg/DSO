import { ExternalLink } from "lucide-react";
import { formatPrice } from "../../shared/orderTotals.js";
import { placListingTitle } from "../../shared/plac.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { UserAvatar } from "./UserAvatar.jsx";

export function PlacListingCard({ listing, showSeller = true, actions = null }) {
  const { t } = useLocale();
  const isVinyl = listing.listingType !== "other";
  const hasLink = Boolean(listing.releaseUrl);
  const titleText = placListingTitle(listing);

  return (
    <article className="plac-card">
      <div className="plac-card-cover">
        {listing.thumbnailUrl ? (
          <img src={listing.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <div className="plac-card-cover-fallback" aria-hidden />
        )}
        {listing.category && listing.category !== "vinyl" && (
          <span className="plac-card-category">{t(`plac.category.${listing.category}`)}</span>
        )}
      </div>

      <div className="plac-card-body">
        {hasLink ? (
          <a
            href={listing.releaseUrl}
            target="_blank"
            rel="noreferrer"
            className="plac-card-title"
          >
            {titleText}
            <ExternalLink size={14} aria-hidden />
          </a>
        ) : (
          <p className="plac-card-title plac-card-title--plain">{titleText}</p>
        )}

        {isVinyl ? (
          <>
            <div className="plac-card-meta">
              {listing.year != null && <span>{listing.year}</span>}
              {listing.genre && <span>{listing.genre}</span>}
              {listing.country && <span>{listing.country}</span>}
            </div>

            {listing.format && (
              <p className="plac-card-format muted fine">{listing.format}</p>
            )}

            <div className="plac-card-conditions">
              <span className="plac-card-condition">{listing.mediaCondition}</span>
              {listing.sleeveCondition && (
                <span className="plac-card-condition muted">{listing.sleeveCondition}</span>
              )}
            </div>
          </>
        ) : (
          <div className="plac-card-conditions">
            <span className="plac-card-condition">{listing.mediaCondition}</span>
          </div>
        )}

        {listing.note && <p className="plac-card-note muted fine">{listing.note}</p>}

        <div className="plac-card-footer">
          <span className="plac-card-price">{formatPrice(listing.priceValue)}</span>

          {showSeller && listing.seller && (
            <div className="plac-card-seller">
              <UserAvatar
                name={listing.seller.name}
                avatarUrl={listing.seller.picture}
                size={28}
              />
              <span className="plac-card-seller-name">
                {listing.seller.discogsUsername
                  ? `@${listing.seller.discogsUsername}`
                  : listing.seller.name}
              </span>
            </div>
          )}
        </div>

        {actions && <div className="plac-card-actions">{actions}</div>}
      </div>
    </article>
  );
}
