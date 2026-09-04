import { useLayoutEffect, useState } from "react";

/** Tracks an element's content width via ResizeObserver. */
export function useElementWidth(ref, { enabled = true, defaultWidth = 0 } = {}) {
  const [width, setWidth] = useState(defaultWidth);

  useLayoutEffect(() => {
    if (!enabled) {
      setWidth(defaultWidth);
      return undefined;
    }

    const node = ref.current;
    if (!node) return undefined;

    const update = () => setWidth(node.getBoundingClientRect().width);

    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setWidth(entry.contentRect.width);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [ref, enabled, defaultWidth]);

  return width;
}
