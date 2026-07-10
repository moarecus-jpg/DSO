import { useEffect, useMemo, useState } from "react";
import { OrderList } from "../components/OrderList.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { formatOrderTitle } from "../../shared/orderTitle.js";
import { api } from "../api.js";

export function ClosedOrders() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api("/api/sessions?status=closed")
      .then((d) => setSessions(d.sessions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const title =
        s.order_number != null ? formatOrderTitle(s.order_number) : s.title ?? "";
      return (
        title.toLowerCase().includes(q) ||
        s.seller_username?.toLowerCase().includes(q)
      );
    });
  }, [sessions, query]);

  return (
    <div className="page page-orders">
      <OrdersPageHeader
        title="Zaključena naročila"
        subtitle="Pretekla skupinska naročila, ki niso več odprta"
        query={query}
        onQueryChange={setQuery}
      />

      <OrderList
        sessions={filteredSessions}
        loading={loading}
        emptyMessage={
          query.trim() ? "Ni zadetkov za iskanje." : "Ni zaključenih naročil."
        }
      />
    </div>
  );
}
