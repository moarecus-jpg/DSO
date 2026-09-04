import { formatPrice } from "../../shared/orderTotals.js";

export function PlacPrice({ listing, className = "" }) {
  const discounted =
    listing?.discountPercent > 0 &&
    listing?.originalPriceValue != null &&
    listing.originalPriceValue !== listing.priceValue;

  return (
    <span className={`plac-price${className ? ` ${className}` : ""}`}>
      {discounted && (
        <span className="plac-price-original">{formatPrice(listing.originalPriceValue)}</span>
      )}
      <span className={`plac-price-current${discounted ? " plac-price-current--sale" : ""}`}>
        {formatPrice(listing.priceValue)}
      </span>
      {discounted && listing.discountPercent > 0 && (
        <span className="plac-price-badge">−{listing.discountPercent}%</span>
      )}
    </span>
  );
}
