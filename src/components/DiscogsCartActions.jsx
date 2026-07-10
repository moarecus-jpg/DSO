import { DiscogsAddToCartLink } from "./DiscogsAddToCartLink.jsx";
import { RemoveFromOrderButton } from "./RemoveFromOrderButton.jsx";

export function DiscogsCartActions({
  link,
  onRemove,
  removing = false,
  className = "",
}) {
  return (
    <div className={`discogs-cart-actions ${className}`.trim()}>
      <DiscogsAddToCartLink link={link} />
      <RemoveFromOrderButton onRemove={onRemove} removing={removing} />
    </div>
  );
}
