import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OrderDetailPreview } from "../components/OrderDetailPreview.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { filterSessions } from "../../shared/filterOrders.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { useOrderPreview } from "../hooks/useOrderPreview.js";

export function ClosedOrders() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("creator");

  const loadSessions = useCallback(async () => {
    const d = await api("/api/sessions?status=closed");
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

  const hasOrders = !loading && filteredSessions.length > 0;
  const showDesktopPreview = preview.isDesktop && hasOrders;
  const showMobileSheet = !preview.isDesktop && Boolean(preview.selectedSession);

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

      <div className={`orders-split${showDesktopPreview ? " orders-split--preview" : ""}`}>
        <div className="orders-split-list">
          <OrderList
            sessions={filteredSessions}
            loading={loading}
            emptyMessage={
              query.trim() ? t("common.noSearchResults") : t("orders.emptyClosed")
            }
            selectedId={preview.selectedId}
            onSelect={preview.selectSession}
            previewMode={hasOrders}
          />
        </div>
        {showDesktopPreview && (
          <OrderDetailPreview
            session={preview.selectedSession}
            detail={preview.detail}
            loading={preview.loading}
            error={preview.error}
            canClose={false}
            closing={false}
            onClose={preview.clearSelection}
            onCloseOrder={preview.closeOrder}
          />
        )}
      </div>

      {showMobileSheet && (
        <div className="order-preview-sheet-root">
          <button
            type="button"
            className="order-preview-sheet-backdrop"
            aria-label={t("common.close")}
            onClick={preview.clearSelection}
          />
          <OrderDetailPreview
            variant="sheet"
            session={preview.selectedSession}
            detail={preview.detail}
            loading={preview.loading}
            error={preview.error}
            canClose={false}
            closing={false}
            onClose={preview.clearSelection}
            onCloseOrder={preview.closeOrder}
          />
        </div>
      )}
    </div>
  );
}
