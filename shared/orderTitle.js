export function formatOrderTitle(orderNumber, sellerUsername) {
  const num = String(orderNumber ?? 1).padStart(4, "0");
  const seller = sellerUsername?.trim();
  if (seller) {
    return `${seller}#${num}`;
  }
  return `Naročilo#${num}`;
}

/** Same title as the main orders list (seller#0001). */
export function displayOrderTitle(session) {
  if (!session) return "";
  if (session.order_number != null) {
    return formatOrderTitle(session.order_number, session.seller_username);
  }
  return session.title ?? formatOrderTitle(null, session.seller_username);
}
