import { Check, ShoppingCart } from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";
import { usePlacCart } from "../hooks/usePlacCart.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function PlacAddToCartButton({ listing, className = "", large = false }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const { addItem, removeItem, isInCart } = usePlacCart();
  const inCart = isInCart(listing.id);
  const isOwn = user?.id === (listing.userId ?? listing.seller?.id);

  if (isOwn) return null;

  function handleClick() {
    if (inCart) {
      removeItem(listing.id);
      return;
    }
    addItem(listing);
  }

  const baseClass = large
    ? "btn btn-primary plac-add-to-cart plac-add-to-cart--detail"
    : "btn btn-ghost btn-sm plac-add-to-cart";

  return (
    <button
      type="button"
      className={`${baseClass} ${inCart ? "plac-add-to-cart--active" : ""} ${className}`.trim()}
      onClick={handleClick}
      title={inCart ? t("plac.removeFromCart") : t("plac.addToCart")}
    >
      {inCart ? <Check size={15} aria-hidden /> : <ShoppingCart size={15} aria-hidden />}
      {inCart ? t("plac.inCart") : t("plac.addToCart")}
    </button>
  );
}
