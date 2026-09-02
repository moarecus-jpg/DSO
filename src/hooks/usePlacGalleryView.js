import { useCallback, useEffect, useState } from "react";

export const PLAC_GALLERY_VIEWS = ["compact", "default", "large", "list"];

const STORAGE_KEY = "dso_plac_gallery_view";

function readStoredView() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return PLAC_GALLERY_VIEWS.includes(value) ? value : "default";
  } catch {
    return "default";
  }
}

export function usePlacGalleryView() {
  const [view, setViewState] = useState(readStoredView);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  const setView = useCallback((next) => {
    if (PLAC_GALLERY_VIEWS.includes(next)) {
      setViewState(next);
    }
  }, []);

  return { view, setView };
}
