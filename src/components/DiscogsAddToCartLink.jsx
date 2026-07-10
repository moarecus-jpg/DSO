import { ShoppingCart } from "lucide-react";
import { discogsAddToCartUrl } from "../../shared/discogsUrls.js";
import { listingIdFor } from "../../shared/orderTotals.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function DiscogsAddToCartLink({ link, className = "" }) {
  const { t } = useLocale();
  const cartUrl = discogsAddToCartUrl(listingIdFor(link));

  if (!cartUrl) return null;

  return (
    <a
      href={cartUrl}
      target="_blank"
      rel="noreferrer"
      className={`discogs-add-to-cart ${className}`.trim()}
      title={t("items.addToCartHint")}
    >
      <ShoppingCart size={14} aria-hidden />
      {t("items.addToCart")}
    </a>
  );
}
