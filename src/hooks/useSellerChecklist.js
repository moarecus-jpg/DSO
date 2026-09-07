import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth.jsx";

function storageKey(userId) {
  return `dso_checked_sellers_${userId || "anon"}`;
}

function normalizeSeller(username) {
  return String(username ?? "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function readChecked(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeSeller).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeChecked(userId, sellers) {
  localStorage.setItem(storageKey(userId), JSON.stringify([...new Set(sellers)]));
}

export function useSellerChecklist() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [checked, setChecked] = useState(() => readChecked(userId));

  useEffect(() => {
    setChecked(readChecked(userId));
  }, [userId]);

  const isChecked = useCallback(
    (sellerUsername) => {
      const key = normalizeSeller(sellerUsername);
      return Boolean(key) && checked.includes(key);
    },
    [checked]
  );

  const toggleChecked = useCallback(
    (sellerUsername) => {
      const key = normalizeSeller(sellerUsername);
      if (!key) return false;
      setChecked((prev) => {
        const next = prev.includes(key)
          ? prev.filter((s) => s !== key)
          : [...prev, key];
        writeChecked(userId, next);
        return next;
      });
      return !checked.includes(key);
    },
    [checked, userId]
  );

  return { isChecked, toggleChecked };
}
