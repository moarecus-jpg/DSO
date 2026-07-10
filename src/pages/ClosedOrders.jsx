import { useEffect, useMemo, useState } from "react";
import { OrderList } from "../components/OrderList.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { filterSessions } from "../../shared/filterOrders.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function ClosedOrders() {
  const { t } = useLocale();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("creator");

  useEffect(() => {
    api("/api/sessions?status=closed")
      .then((d) => setSessions(d.sessions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = useMemo(
    () => filterSessions(sessions, { query, searchMode }),
    [sessions, query, searchMode]
  );

  return (
    <div className="page page-orders">
      <OrdersPageHeader
        title={t("orders.closedTitle")}
        subtitle={t("orders.closedSubtitle")}
        query={query}
        onQueryChange={setQuery}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
      />

      <OrderList
        sessions={filteredSessions}
        loading={loading}
        emptyMessage={
          query.trim() ? t("common.noSearchResults") : t("orders.emptyClosed")
        }
      />
    </div>
  );
}
