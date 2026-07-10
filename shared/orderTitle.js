export function formatOrderTitle(orderNumber) {
  const num = String(orderNumber).padStart(4, "0");
  return `Naročilo#${num}`;
}
