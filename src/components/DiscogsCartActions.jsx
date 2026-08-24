import { ExternalLink } from "lucide-react";
import { DiscogsAddToCartLink } from "./DiscogsAddToCartLink.jsx";
import { RemoveFromOrderButton } from "./RemoveFromOrderButton.jsx";
import { isLinkUnavailable } from "../../shared/orderTotals.js";
import { getStoreConfig, isShopStore } from "../../shared/stores.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function DiscogsCartActions({
  link,
  store = "discogs",
  onRemove,
  removing = false,
  className = "",
}) {
  const { t } = useLocale();
  const isShop = isShopStore(store);
  const storeConfig = getStoreConfig(store);
  const unavailable = isLinkUnavailable(link);

  return (
    <div className={`discogs-cart-actions ${className}`.trim()}>
      {unavailable ? null : isShop ? (
        link?.url ? (
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="discogs-add-to-cart"
            title={t("items.openOnShopHint", { store: storeConfig.label })}
          >
            <ExternalLink size={14} aria-hidden />
            {t("items.openOnShop", { store: storeConfig.label })}
          </a>
        ) : null
      ) : (
        <DiscogsAddToCartLink link={link} />
      )}
      <RemoveFromOrderButton onRemove={onRemove} removing={removing} />
    </div>
  );
}
