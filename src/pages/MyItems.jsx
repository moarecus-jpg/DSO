import { useEffect, useMemo, useState } from "react";
import { MyItemsList } from "../components/MyItemsList.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { api } from "../api.js";

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

  return (
    <div className="page page-orders">
      <OrdersPageHeader
        title="Naročeni Itemi"
        subtitle={
          loading
            ? "Nalagam…"
            : totalItems === 0
              ? "Tvoji vnosi v skupinskih naročilih"
              : `${totalItems} ${totalItems === 1 ? "item" : "itemov"} v ${filteredGroups.length} naročilih`
        }
        query={query}
        onQueryChange={setQuery}
        placeholder="Išči po itemu, sellerju ali naročilu…"
      />

      <MyItemsList
        groups={filteredGroups}
        loading={loading}
        emptyMessage={
          query.trim()
            ? "Ni zadetkov za iskanje."
            : "Še nisi dodal nobenega itema. Odpri naročilo in uporabi Dodaj Item."
        }
      />
    </div>
  );
}
