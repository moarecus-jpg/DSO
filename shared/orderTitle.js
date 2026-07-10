export function formatOrderTitle(orderNumber, sellerUsername) {
  const num = String(orderNumber ?? 1).padStart(4, "0");
  const seller = sellerUsername?.trim();
  if (seller) {
    return `${seller}#${num}`;
  }
  return `Naročilo#${num}`;
}
