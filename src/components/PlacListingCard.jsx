import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { formatCoverGradeLabel, formatMediaGradeLabel } from "../../shared/orderReview.js";
import { placListingTitle } from "../../shared/plac.js";
import { formatPlacListingFormat, normalizePlacYear } from "../../shared/placFormat.js";
import { PlacAddToCartButton } from "./PlacAddToCartButton.jsx";
import { PlacPrice } from "./PlacPrice.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { resolveUserAvatarUrl } from "../utils/userAvatarUrl.js";
import { UserAvatar } from "./UserAvatar.jsx";

export function PlacListingCard({
  listing,
  showSeller = true,
  actions = null,
  showCart = false,
  detailLink = false,
  iconActions = false,
  view = null,
}) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const isVinyl = listing.listingType !== "other";
  const hasLink = Boolean(listing.releaseUrl);
  const titleText = placListingTitle(listing);
  const displayYear = normalizePlacYear(listing.year);
  const displayFormat = formatPlacListingFormat(listing.format);
  const mediaGrade = isVinyl
    ? formatMediaGradeLabel(listing.mediaCondition)
    : listing.mediaCondition;
  const coverGrade = isVinyl ? formatCoverGradeLabel(listing.sleeveCondition) : null;
  const isDiscogs = view === "discogs";

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

  const cover = (
    <div className="plac-card-cover">
      {listing.thumbnailUrl ? (
        <img src={listing.thumbnailUrl} alt="" loading="lazy" />
      ) : (
        <div className="plac-card-cover-fallback" aria-hidden />
      )}
      {listing.category && listing.category !== "vinyl" && (
        <span className="plac-card-category">{t(`plac.category.${listing.category}`)}</span>
      )}
      {listing.discountPercent > 0 && (
        <span className="plac-card-sale">−{listing.discountPercent}%</span>
      )}
    </div>
  );

  if (isDiscogs) {
    const titleWithFormat =
      isVinyl && displayFormat ? `${titleText} (${displayFormat})` : titleText;

    return (
      <article
        className={`plac-card plac-card--discogs${detailLink ? " plac-card--clickable" : ""}`}
        onClick={detailLink ? handleCardClick : undefined}
        onKeyDown={detailLink ? handleCardKeyDown : undefined}
        role={detailLink ? "link" : undefined}
        tabIndex={detailLink ? 0 : undefined}
      >
        {cover}

        <div className="plac-discogs-main">
          {hasLink && !detailLink ? (
            <a
              href={listing.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="plac-card-title plac-discogs-title"
            >
              {titleWithFormat}
              <ExternalLink size={14} aria-hidden />
            </a>
          ) : (
            <p className="plac-card-title plac-card-title--plain plac-discogs-title">
              {titleWithFormat}
            </p>
          )}

          {isVinyl && (
            <div className="plac-card-meta plac-discogs-meta">
              {displayYear != null && <span>{displayYear}</span>}
              {listing.genre && <span>{listing.genre}</span>}
              {listing.country && <span>{listing.country}</span>}
            </div>
          )}

          <div className="plac-discogs-grades">
            {listing.mediaCondition && (
              <p className="plac-discogs-grade">
                <span className="plac-discogs-grade-label">
                  {isVinyl ? t("plac.mediaCondition") : t("plac.itemCondition")}:
                </span>{" "}
                <span className="plac-discogs-grade-value">{listing.mediaCondition}</span>
              </p>
            )}
            {isVinyl && listing.sleeveCondition && (
              <p className="plac-discogs-grade">
                <span className="plac-discogs-grade-label">{t("plac.sleeveCondition")}:</span>{" "}
                <span className="plac-discogs-grade-value">{listing.sleeveCondition}</span>
              </p>
            )}
          </div>

          {listing.note && <p className="plac-card-note plac-discogs-note muted fine">{listing.note}</p>}
        </div>

        <div className="plac-discogs-price-col">
          <PlacPrice listing={listing} className="plac-card-price plac-discogs-price" />
          {showSeller && listing.seller && (
            <div className="plac-card-seller">
              <UserAvatar
                name={listing.seller.name}
                avatarUrl={resolveUserAvatarUrl(listing.seller)}
                size={22}
              />
              <span className="plac-card-seller-name">
                {listing.seller.discogsUsername
                  ? `@${listing.seller.discogsUsername}`
                  : listing.seller.name}
              </span>
            </div>
          )}
        </div>

        <div className="plac-discogs-aside" onClick={(e) => e.stopPropagation()}>
          {(actions || showCart) && (
            <div className="plac-card-actions plac-discogs-actions">
              {showCart && listing.status !== "sold" && listing.status !== "removed" && (
                <PlacAddToCartButton listing={listing} />
              )}
              {actions}
            </div>
          )}
          {detailLink && (
            <span className="plac-discogs-details-link">{t("plac.viewDetails")}</span>
          )}
        </div>
      </article>
    );
  }

  return (
    <article
      className={`plac-card${detailLink ? " plac-card--clickable" : ""}${iconActions ? " plac-card--icon-actions" : ""}`}
      onClick={detailLink ? handleCardClick : undefined}
      onKeyDown={detailLink ? handleCardKeyDown : undefined}
      role={detailLink ? "link" : undefined}
      tabIndex={detailLink ? 0 : undefined}
    >
      {cover}

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
              {displayYear != null && <span>{displayYear}</span>}
              {listing.genre && <span>{listing.genre}</span>}
              {listing.country && <span>{listing.country}</span>}
            </div>

            {displayFormat && (
              <p className="plac-card-format muted fine">{displayFormat}</p>
            )}

            <div className="plac-card-conditions">
              {mediaGrade && <span className="plac-card-condition">{mediaGrade}</span>}
              {coverGrade && (
                <span className="plac-card-condition muted">{coverGrade}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="plac-card-release-info">
            <div className="plac-card-conditions">
              {mediaGrade && <span className="plac-card-condition">{mediaGrade}</span>}
            </div>
          </div>
        )}

        {listing.note && <p className="plac-card-note muted fine">{listing.note}</p>}

        <div className="plac-card-bottom">
          <div className="plac-card-footer">
            <PlacPrice listing={listing} className="plac-card-price" />

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
                <PlacAddToCartButton listing={listing} iconOnly={iconActions} />
              )}
              {actions}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
