import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OrderDetailPreview } from "../components/OrderDetailPreview.jsx";
import { OrderList } from "../components/OrderList.jsx";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { DashboardStats } from "../components/DashboardStats.jsx";
import { OrderChips } from "../components/OrderChips.jsx";
import { OrdersFilterButton } from "../components/OrdersFilterButton.jsx";
import { OrdersPagination } from "../components/OrdersPagination.jsx";
import { filterSessions } from "../../shared/filterOrders.js";
import {
  computeDashboardStats,
  filterSessionsByChip,
  getRecentlyActiveSessions,
  paginate,
  sortSessions,
} from "../../shared/orderDashboard.js";
import { sessionListPath } from "../../shared/orderStatus.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { useOrderPreview } from "../hooks/useOrderPreview.js";

export function Home() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState("creator");
  const [chip, setChip] = useState("all");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const loadSessions = useCallback(async () => {
    const d = await api("/api/sessions");
    setSessions(d.sessions);
  }, []);

  useEffect(() => {
    loadSessions().catch(console.error).finally(() => setLoading(false));
  }, [loadSessions]);

  const searchedSessions = useMemo(
    () => filterSessions(sessions, { query, searchMode }),
    [sessions, query, searchMode]
  );
  const stats = useMemo(() => computeDashboardStats(sessions), [sessions]);
  const recentSessions = useMemo(
    () => getRecentlyActiveSessions(sessions, 4),
    [sessions]
  );
  const chipCounts = useMemo(
    () => ({
      all: searchedSessions.length,
      open: filterSessionsByChip(searchedSessions, "open").length,
      waiting: filterSessionsByChip(searchedSessions, "waiting").length,
      recent: filterSessionsByChip(searchedSessions, "recent").length,
      attention: filterSessionsByChip(searchedSessions, "attention").length,
    }),
    [searchedSessions]
  );
  const filteredSessions = useMemo(
    () => sortSessions(filterSessionsByChip(searchedSessions, chip), sort),
    [searchedSessions, chip, sort]
  );
  const pageData = useMemo(() => paginate(filteredSessions, page), [filteredSessions, page]);
  const pagedSessions = pageData.items;

  useEffect(() => {
    setPage(1);
  }, [query, searchMode, chip, sort]);

  const preview = useOrderPreview(filteredSessions, {
    onClosed: async (session) => {
      await loadSessions();
      navigate(sessionListPath(session?.status));
    },
  });

  const showDesktopPreview = preview.isDesktop && !loading && sessions.length > 0;
  const filtersDirty = query.trim() !== "" || searchMode !== "creator" || chip !== "all";

  return (
    <div className="page page-orders">
      <OrdersPageHeader
        title={t("orders.openTitle")}
        subtitle={t("orders.openSubtitle")}
        query={query}
        onQueryChange={setQuery}
        placeholder={t("orders.searchOrders")}
        searchMode={searchMode}
        sort={sort}
        onSortChange={setSort}
      />

      <div className={`orders-split${showDesktopPreview ? " orders-split--preview" : ""}`}>
        <div className="orders-split-main">
          {!loading && (
            <DashboardStats
              stats={stats}
              recentSessions={recentSessions}
              compact={showDesktopPreview}
              onOpen={() => setChip("all")}
              onAttention={() => setChip("attention")}
              onRecent={() => setChip("recent")}
              onSelectOrder={preview.selectSession}
            />
          )}

          <OrderChips
            value={chip}
            onChange={setChip}
            counts={chipCounts}
            trailing={
              <OrdersFilterButton
                searchMode={searchMode}
                onSearchModeChange={setSearchMode}
                dirty={filtersDirty}
                onReset={() => {
                  setQuery("");
                  setSearchMode("creator");
                  setChip("all");
                }}
              />
            }
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

          <div className="orders-split-panel">
            <div className="orders-split-scroll">
              <OrderList
                sessions={pagedSessions}
                loading={loading}
                emptyMessage={
                  query.trim() || chip !== "all"
                    ? t("common.noSearchResults")
                    : t("orders.emptyOpen")
                }
                selectedId={preview.selectedId}
                onSelect={preview.selectSession}
                previewMode={showDesktopPreview}
              />
            </div>
          </div>
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
