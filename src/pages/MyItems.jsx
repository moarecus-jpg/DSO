import { useEffect, useMemo, useState } from "react";
import { MyItemsList } from "../components/MyItemsList.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";

function groupItemsBySession(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.sessionId)) {
      map.set(item.sessionId, {
        sessionId: item.sessionId,
        orderTitle: item.orderTitle,
        sellerUsername: item.sellerUsername,
        sessionStatus: item.sessionStatus,
        sellerAvatarUrl: null,
        items: [],
      });
    }
    map.get(item.sessionId).items.push(item);
  }
  return [...map.values()];
}

export function MyItems() {
  const { t } = useLocale();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api("/api/sessions/my-items")
      .then((d) => setItems(d.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = groupItemsBySession(items);
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.itemTitle?.toLowerCase().includes(q) ||
            group.sellerUsername?.toLowerCase().includes(q) ||
            group.orderTitle?.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [items, query]);

  const totalItems = filteredGroups.reduce((n, g) => n + g.items.length, 0);

  const subtitle = loading
    ? t("common.loading")
    : totalItems === 0
      ? t("orders.myItemsSubtitle")
      : t("orders.myItemsCount", {
          count: totalItems,
          items: totalItems === 1 ? t("orders.itemOne") : t("orders.itemMany"),
          orders: filteredGroups.length,
        });

  return (
    <div className="page page-orders">
      <OrdersPageHeader
        title={t("orders.myItemsTitle")}
        subtitle={subtitle}
        query={query}
        onQueryChange={setQuery}
        placeholder={t("orders.searchItems")}
      />

      <MyItemsList
        groups={filteredGroups}
        loading={loading}
        emptyMessage={
          query.trim() ? t("common.noSearchResults") : t("orders.emptyMyItems")
        }
      />
    </div>
  );
}
