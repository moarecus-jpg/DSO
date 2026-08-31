import { useCallback, useEffect, useMemo, useState } from "react";
import { OrderDetailPreview } from "../components/OrderDetailPreview.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { OrdersPagination } from "../components/OrdersPagination.jsx";
import { filterSessions } from "../../shared/filterOrders.js";
import { paginate, sortSessions } from "../../shared/orderDashboard.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { useOrderPreview } from "../hooks/useOrderPreview.js";

export function UnplacedOrders() {
  const { t } = useLocale();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("creator");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const loadSessions = useCallback(async () => {
    const d = await api("/api/sessions?status=unplaced");
    setSessions(d.sessions);
  }, []);

  useEffect(() => {
    loadSessions().catch(console.error).finally(() => setLoading(false));
  }, [loadSessions]);

  const filteredSessions = useMemo(
    () => sortSessions(filterSessions(sessions, { query, searchMode }), sort),
    [sessions, query, searchMode, sort]
  );

  const pageData = useMemo(() => paginate(filteredSessions, page), [filteredSessions, page]);

  useEffect(() => {
    setPage(1);
  }, [query, searchMode, sort]);

  const preview = useOrderPreview(pageData.items, {
    onReopened: loadSessions,
  });

  const hasOrders = !loading && filteredSessions.length > 0;
  const showDesktopPreview = preview.isDesktop && hasOrders;

  return (
    <div className="page page-orders">
      <OrdersPageHeader
        title={t("orders.unplacedTitle")}
        subtitle={t("orders.unplacedSubtitle")}
        query={query}
        onQueryChange={setQuery}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        sort={sort}
        onSortChange={setSort}
      />

      <div className={`orders-split${showDesktopPreview ? " orders-split--preview" : ""}`}>
        <div className="orders-split-list">
          <div className="orders-split-scroll">
            <OrderList
              sessions={pageData.items}
              loading={loading}
              emptyMessage={
                query.trim() ? t("common.noSearchResults") : t("orders.emptyUnplaced")
              }
              selectedId={preview.selectedId}
              onSelect={preview.selectSession}
              previewMode={showDesktopPreview}
            />
            {!loading && (
              <OrdersPagination
                page={pageData.page}
                pageCount={pageData.pageCount}
                from={pageData.from}
                to={pageData.to}
                total={pageData.total}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
        {showDesktopPreview && (
          <OrderDetailPreview
            session={preview.selectedSession}
            detail={preview.detail}
            loading={preview.loading}
            error={preview.error}
            canClose={false}
            closing={false}
            canReopen={preview.canReopen}
            reopening={preview.reopening}
            onClose={preview.clearSelection}
            onCloseOrder={preview.closeOrder}
            onReopenOrder={preview.reopenOrder}
          />
        )}
      </div>
    </div>
  );
}
