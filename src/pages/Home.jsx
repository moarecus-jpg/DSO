import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { NewOrderForm } from "../components/NewOrderForm.jsx";
import { OrderDetailPreview } from "../components/OrderDetailPreview.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { filterSessions } from "../../shared/filterOrders.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { useOrderPreview } from "../hooks/useOrderPreview.js";

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

  const loadSessions = useCallback(async () => {
    const d = await api("/api/sessions");
    setSessions(d.sessions);
  }, []);

  useEffect(() => {
    loadSessions().catch(console.error).finally(() => setLoading(false));
  }, [loadSessions]);

  const filteredSessions = useMemo(
    () => filterSessions(sessions, { query, searchMode }),
    [sessions, query, searchMode]
  );

  const preview = useOrderPreview(filteredSessions, {
    onClosed: async () => {
      await loadSessions();
      navigate("/closed");
    },
  });

  async function handleCreate({ store, sellerUsername }) {
    setCreateError(null);
    setCreating(true);
    try {
      const body =
        store && store !== "discogs"
          ? { store }
          : { store: "discogs", sellerUsername };
      const { session } = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify(body),
      });
      navigate(`/session/${session.id}?add=1`, { replace: true });
    } catch (err) {
      setCreateError(err.message ?? t("orders.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  const hasOrders = !loading && filteredSessions.length > 0;
  const showDesktopPreview = preview.isDesktop && hasOrders;

  return (
    <div className={`page page-orders${showForm ? " page-orders--new" : ""}`}>
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

      <div className={`orders-split${showDesktopPreview ? " orders-split--preview" : ""}`}>
        <div className="orders-split-list">
          <OrderList
            sessions={filteredSessions}
            loading={loading}
            emptyMessage={
              query.trim() ? t("common.noSearchResults") : t("orders.emptyOpen")
            }
            selectedId={preview.selectedId}
            onSelect={preview.selectSession}
            previewMode={showDesktopPreview}
          />
        </div>
        {showDesktopPreview && (
          <OrderDetailPreview
            session={preview.selectedSession}
            detail={preview.detail}
            loading={preview.loading}
            error={preview.error}
            canClose={preview.canClose}
            closing={preview.closing}
            onClose={preview.clearSelection}
            onCloseOrder={preview.closeOrder}
          />
        )}
      </div>
    </div>
  );
}
