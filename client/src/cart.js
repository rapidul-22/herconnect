// A bag may contain many shops; the existing API creates one order per shop.
export function groupCart(cart) {
  return Object.values(Object.groupBy(cart, (item) => item.seller._id)).map(
    (items) => ({ seller: items[0].seller, items }),
  );
}

// Use the server's purchased quantities. Keep other shops and any extra units.
export function removeOrderedItems(cart, orderedItems) {
  const purchased = new Map(
    orderedItems.map((item) => [String(item.product), item.quantity]),
  );
  return cart
    .map((item) => ({
      ...item,
      quantity: item.quantity - (purchased.get(item._id) || 0),
    }))
    .filter((item) => item.quantity > 0);
}
