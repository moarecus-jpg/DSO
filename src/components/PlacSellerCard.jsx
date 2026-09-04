import { Link } from "react-router-dom";
import { UserAvatar } from "./UserAvatar.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { resolveUserAvatarUrl } from "../utils/userAvatarUrl.js";

function sellerLabel(seller) {
  if (seller.discogsUsername) return `@${seller.discogsUsername}`;
  if (seller.username) return `@${seller.username}`;
  return seller.name;
}

export function PlacSellerCard({ seller }) {
  const { t } = useLocale();

  return (
    <Link to={`/plac/u/${seller.id}`} className="plac-seller-card">
      <div className="plac-seller-avatar-wrap">
        <UserAvatar
          name={seller.name}
          avatarUrl={resolveUserAvatarUrl(seller)}
          className="plac-seller-avatar"
          size={88}
        />
      </div>
      <div className="plac-seller-body">
        <p className="plac-seller-name">{sellerLabel(seller)}</p>
        {seller.name && seller.discogsUsername && (
          <p className="plac-seller-sub muted fine">{seller.name}</p>
        )}
        <p className="plac-seller-count muted fine">
          {t("plac.sellerListingCount", { count: seller.listingCount })}
        </p>
        {seller.shopDiscountPercent > 0 && (
          <p className="plac-seller-sale">
            {seller.shopDiscountLabel?.trim() ||
              t("plac.shopSaleBadge", { percent: seller.shopDiscountPercent })}
          </p>
        )}
      </div>
    </Link>
  );
}
