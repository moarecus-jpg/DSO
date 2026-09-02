import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "dso_plac_cart";

const PlacCartContext = createContext(null);

function readStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function snapshotListing(listing) {
  return {
    id: listing.id,
    userId: listing.userId,
    artist: listing.artist,
    title: listing.title,
    thumbnailUrl: listing.thumbnailUrl,
    priceValue: listing.priceValue,
    priceCurrency: listing.priceCurrency ?? "EUR",
    mediaCondition: listing.mediaCondition,
    listingType: listing.listingType,
    seller: listing.seller
      ? {
          id: listing.seller.id,
          name: listing.seller.name,
          username: listing.seller.username,
          picture: listing.seller.picture,
          discogsUsername: listing.seller.discogsUsername,
          discogsAvatarUrl: listing.seller.discogsAvatarUrl ?? null,
        }
      : { id: listing.userId },
  };
}

export function PlacCartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const addItem = useCallback((listing) => {
    const snap = snapshotListing(listing);
    setItems((prev) => {
      if (prev.some((row) => row.id === snap.id)) return prev;
      return [...prev, snap];
    });
  }, []);

  const removeItem = useCallback((listingId) => {
    setItems((prev) => prev.filter((row) => row.id !== listingId));
  }, []);

  const removeItems = useCallback((listingIds) => {
    const ids = new Set(listingIds);
    setItems((prev) => prev.filter((row) => !ids.has(row.id)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback((listingId) => items.some((row) => row.id === listingId), [items]);

  const groupedBySeller = useMemo(() => {
    const groups = new Map();
    for (const item of items) {
      const sellerId = item.seller?.id ?? item.userId;
      if (!groups.has(sellerId)) {
        groups.set(sellerId, { seller: item.seller, items: [] });
      }
      groups.get(sellerId).items.push(item);
    }
    return [...groups.values()];
  }, [items]);

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + (item.priceValue ?? 0), 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      totalValue,
      groupedBySeller,
      addItem,
      removeItem,
      removeItems,
      clearCart,
      isInCart,
    }),
    [
      items,
      totalValue,
      groupedBySeller,
      addItem,
      removeItem,
      removeItems,
      clearCart,
      isInCart,
    ]
  );

  return <PlacCartContext.Provider value={value}>{children}</PlacCartContext.Provider>;
}

export function usePlacCart() {
  const ctx = useContext(PlacCartContext);
  if (!ctx) {
    throw new Error("usePlacCart must be used within PlacCartProvider");
  }
  return ctx;
}
