import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
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

function readLocalChecked(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeSeller).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeLocalChecked(userId, sellers) {
  localStorage.setItem(storageKey(userId), JSON.stringify([...new Set(sellers)]));
}

function mergeSellers(...lists) {
  return [...new Set(lists.flat().map(normalizeSeller).filter(Boolean))];
}

export function useSellerChecklist() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [checked, setChecked] = useState(() => readLocalChecked(userId));

  useEffect(() => {
    if (!userId) {
      setChecked(readLocalChecked(null));
      return undefined;
    }

    let cancelled = false;
    const local = readLocalChecked(userId);

    (async () => {
      try {
        const data = await api("/auth/me/seller-checks");
        if (cancelled) return;
        const server = Array.isArray(data.sellers) ? data.sellers : [];
        const merged = mergeSellers(local, server);
        setChecked(merged);
        writeLocalChecked(userId, merged);

        const serverSet = new Set(server.map(normalizeSeller));
        const needsUpload = merged.some((s) => !serverSet.has(s));
        if (needsUpload) {
          const saved = await api("/auth/me/seller-checks", {
            method: "PUT",
            body: JSON.stringify({ sellers: merged }),
          });
          if (!cancelled && Array.isArray(saved.sellers)) {
            setChecked(saved.sellers);
            writeLocalChecked(userId, saved.sellers);
          }
        }
      } catch {
        if (!cancelled) setChecked(local);
      }
    })();

    return () => {
      cancelled = true;
    };
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
      const nextChecked = !checked.includes(key);
      setChecked((prev) => {
        const next = nextChecked
          ? [...prev, key]
          : prev.filter((s) => s !== key);
        writeLocalChecked(userId, next);
        return next;
      });

      if (userId) {
        api("/auth/me/seller-checks", {
          method: "PATCH",
          body: JSON.stringify({ sellerUsername: key, checked: nextChecked }),
        })
          .then((data) => {
            if (Array.isArray(data.sellers)) {
              setChecked(data.sellers);
              writeLocalChecked(userId, data.sellers);
            }
          })
          .catch(() => {
            /* keep optimistic local state */
          });
      }

      return nextChecked;
    },
    [checked, userId]
  );

  return { isChecked, toggleChecked };
}
