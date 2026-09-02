import { useMemo } from "react";
import { paginate } from "../../shared/orderDashboard.js";
import { useMediaQuery } from "./useMediaQuery.js";

const DESKTOP_MQ = "(min-width: 960px)";

export function useOrdersPageData(items, page) {
  const isDesktop = useMediaQuery(DESKTOP_MQ);

  const pageData = useMemo(() => {
    if (isDesktop) {
      const total = items.length;
      return {
        items,
        page: 1,
        pageCount: 1,
        total,
        from: total === 0 ? 0 : 1,
        to: total,
      };
    }
    return paginate(items, page);
  }, [items, page, isDesktop]);

  return { pageData, showPagination: !isDesktop };
}
