import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { NewOrderForm } from "../components/NewOrderForm.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { filterSessions } from "../../shared/filterOrders.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLocale();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("creator");

  const showForm = searchParams.get("new") === "1";

  async function loadSessions() {
    const d = await api("/api/sessions");
    setSessions(d.sessions);
  }

  useEffect(() => {
    loadSessions().catch(console.error).finally(() => setLoading(false));
  }, []);

  const filteredSessions = useMemo(
    () => filterSessions(sessions, { query, searchMode }),
    [sessions, query, searchMode]
  );

  async function handleCreate(sellerInput) {
    setCreateError(null);
    setCreating(true);
    try {
      const { session } = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ sellerUsername: sellerInput }),
      });
      navigate(`/session/${session.id}?add=1`, { replace: true });
    } catch (err) {
      setCreateError(err.message ?? t("orders.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page page-orders">
      {showForm && (
        <NewOrderForm
          onSubmit={handleCreate}
          creating={creating}
          error={createError}
        />
      )}

      <OrdersPageHeader
        title={t("orders.openTitle")}
        subtitle={t("orders.openSubtitle")}
        query={query}
        onQueryChange={setQuery}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
      />

      <OrderList
        sessions={filteredSessions}
        loading={loading}
        emptyMessage={
          query.trim() ? t("common.noSearchResults") : t("orders.emptyOpen")
        }
      />
    </div>
  );
}
