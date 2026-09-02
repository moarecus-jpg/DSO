import { useEffect, useState } from "react";
import { api } from "../api.js";

export function usePlacCounts() {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    api("/api/plac/counts")
      .then(setCounts)
      .catch(() => setCounts({ mine: 0, isSeller: false }));
  }, []);

  return {
    activeListings: counts?.mine ?? 0,
    isSeller: counts?.isSeller ?? false,
    loading: counts === null,
  };
}
