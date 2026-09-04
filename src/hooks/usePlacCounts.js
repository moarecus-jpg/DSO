import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api.js";

export function usePlacCounts() {
  const { pathname } = useLocation();
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    api("/api/plac/counts")
      .then(setCounts)
      .catch(() => setCounts({ mine: 0, isSeller: false, inboxUnread: 0 }));
  }, [pathname]);

  return {
    activeListings: counts?.mine ?? 0,
    isSeller: counts?.isSeller ?? false,
    inboxUnread: counts?.inboxUnread ?? 0,
    loading: counts === null,
  };
}
