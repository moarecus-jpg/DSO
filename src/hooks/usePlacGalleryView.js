import { useCallback, useEffect, useState } from "react";

export const PLAC_GALLERY_VIEWS = ["compact", "large", "list"];

const STORAGE_KEY = "dso_plac_gallery_view";
const DEFAULT_VIEW = "large";

function readStoredView() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "default") return DEFAULT_VIEW;
    return PLAC_GALLERY_VIEWS.includes(value) ? value : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
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
