import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { formatPrice } from "../../shared/orderTotals.js";
import { placListingTitle } from "../../shared/plac.js";
import { PlacAddToCartButton } from "./PlacAddToCartButton.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { resolveUserAvatarUrl } from "../utils/userAvatarUrl.js";
import { UserAvatar } from "./UserAvatar.jsx";

export function PlacListingCard({
  listing,
  showSeller = true,
  actions = null,
  showCart = false,
  detailLink = false,
}) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const isVinyl = listing.listingType !== "other";
  const hasLink = Boolean(listing.releaseUrl);
  const titleText = placListingTitle(listing);

  function handleCardClick(event) {
    if (!detailLink) return;
    if (event.target.closest("a, button")) return;
    navigate(`/plac/item/${listing.id}`);
  }

  function handleCardKeyDown(event) {
    if (!detailLink) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("a, button")) return;
    event.preventDefault();
    navigate(`/plac/item/${listing.id}`);
  }

  return (
    <article
      className={`plac-card${detailLink ? " plac-card--clickable" : ""}`}
      onClick={detailLink ? handleCardClick : undefined}
      onKeyDown={detailLink ? handleCardKeyDown : undefined}
      role={detailLink ? "link" : undefined}
      tabIndex={detailLink ? 0 : undefined}
    >
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
        {hasLink && !detailLink ? (
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
          <div className="plac-card-release-info">
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
          </div>
        ) : (
          <div className="plac-card-release-info">
            <div className="plac-card-conditions">
              <span className="plac-card-condition">{listing.mediaCondition}</span>
            </div>
          </div>
        )}

        {listing.note && <p className="plac-card-note muted fine">{listing.note}</p>}

        <div className="plac-card-bottom">
          <div className="plac-card-footer">
            <span className="plac-card-price">{formatPrice(listing.priceValue)}</span>

            {showSeller && listing.seller && (
              <div className="plac-card-seller">
                <UserAvatar
                  name={listing.seller.name}
                  avatarUrl={resolveUserAvatarUrl(listing.seller)}
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

          {(actions || showCart) && (
            <div className="plac-card-actions" onClick={(e) => e.stopPropagation()}>
              {showCart && listing.status !== "sold" && listing.status !== "removed" && (
                <PlacAddToCartButton listing={listing} />
              )}
              {actions}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
