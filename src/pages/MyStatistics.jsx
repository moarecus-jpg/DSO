import { useEffect, useMemo, useState } from "react";
import { BarChart3, Package, Truck } from "lucide-react";
import { formatPrice } from "../../shared/orderTotals.js";
import { api } from "../api.js";
import { useLocale } from "../hooks/useLocale.jsx";

const STATUS_FILTERS = ["all", "open", "closed"];

function formatPeriodLabel(period, locale, kind) {
  if (!period) return "—";
  if (kind === "year") return period;
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString(locale === "sl" ? "sl-SI" : "en-GB", {
    month: "long",
    year: "numeric",
  });
}

function SummaryCard({ label, value, hint, icon: Icon, accent }) {
  return (
    <article className={`stats-summary-card stats-summary-card--${accent}`}>
      <div className="stats-summary-card-icon" aria-hidden>
        <Icon size={18} />
      </div>
      <div className="stats-summary-card-body">
        <p className="stats-summary-card-label">{label}</p>
        <p className="stats-summary-card-value">{value}</p>
        {hint && <p className="stats-summary-card-hint muted">{hint}</p>}
      </div>
    </article>
  );
}

function PeriodTable({ title, rows, locale, t, maxTotal, kind = "month" }) {
  if (!rows.length) {
    return (
      <section className="stats-panel card">
        <h2 className="stats-panel-title">{title}</h2>
        <p className="muted stats-empty">{t("statistics.emptyPeriods")}</p>
      </section>
    );
  }

  return (
    <section className="stats-panel card">
      <h2 className="stats-panel-title">{title}</h2>
      <div className="stats-table-wrap">
        <table className="stats-table">
          <thead>
            <tr>
              <th>{t("statistics.period")}</th>
              <th>{t("statistics.items")}</th>
              <th>{t("statistics.shipping")}</th>
              <th>{t("common.total")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const barWidth =
                maxTotal > 0 ? Math.max(6, Math.round((row.grandTotal / maxTotal) * 100)) : 0;
              return (
                <tr key={row.period}>
                  <td>
                    <div className="stats-period-cell">
                      <span>{formatPeriodLabel(row.period, locale, kind)}</span>
                      <span
                        className="stats-period-bar"
                        style={{ width: `${barWidth}%` }}
                        aria-hidden
                      />
                    </div>
                  </td>
                  <td>{formatPrice(row.itemsTotal)}</td>
                  <td>{formatPrice(row.shippingTotal)}</td>
                  <td className="stats-table-total">{formatPrice(row.grandTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function MyStatistics() {
  const { t, locale } = useLocale();
  const [status, setStatus] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const query = status === "all" ? "" : `?status=${status}`;
    api(`/api/sessions/my-statistics${query}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status]);

  const maxMonthTotal = useMemo(
    () => Math.max(0, ...(data?.byMonth ?? []).map((row) => row.grandTotal)),
    [data]
  );
  const maxYearTotal = useMemo(
    () => Math.max(0, ...(data?.byYear ?? []).map((row) => row.grandTotal)),
    [data]
  );

  const summary = data?.summary;
  const subtitle = loading
    ? t("common.loading")
    : summary?.itemCount
      ? t("statistics.subtitle", {
          items: summary.itemCount,
          orders: summary.orderCount,
        })
      : t("statistics.subtitleEmpty");

  return (
    <div className="page page-orders page-statistics">
      <header className="orders-page-header">
        <div className="orders-page-header-main">
          <h1 className="orders-page-title">{t("statistics.title")}</h1>
          <p className="orders-page-subtitle">{subtitle}</p>
        </div>
      </header>

      <div className="stats-filter" role="tablist" aria-label={t("statistics.filterLabel")}>
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            className={`stats-filter-btn${status === value ? " active" : ""}`}
            onClick={() => setStatus(value)}
          >
            {t(`statistics.filter.${value}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted orders-loading">{t("statistics.loading")}</p>
      ) : !summary?.itemCount ? (
        <div className="orders-empty card stats-empty-state">
          <BarChart3 size={40} strokeWidth={1.2} aria-hidden />
          <p>{t("statistics.empty")}</p>
        </div>
      ) : (
        <>
          <div className="stats-summary-grid">
            <SummaryCard
              label={t("statistics.itemsTotal")}
              value={formatPrice(summary.itemsTotal)}
              hint={t("statistics.itemsHint", { count: summary.itemCount })}
              icon={Package}
              accent="items"
            />
            <SummaryCard
              label={t("statistics.shippingTotal")}
              value={formatPrice(summary.shippingTotal)}
              hint={t("statistics.shippingHint", { count: summary.orderCount })}
              icon={Truck}
              accent="shipping"
            />
            <SummaryCard
              label={t("statistics.grandTotal")}
              value={formatPrice(summary.grandTotal)}
              hint={
                summary.hasUnknownPrice ? t("common.someWithoutPrice").trim() : undefined
              }
              icon={BarChart3}
              accent="total"
            />
          </div>

          <div className="stats-highlight-grid">
            <article className="stats-highlight card">
              <p className="stats-highlight-label">{t("statistics.thisMonth")}</p>
              <p className="stats-highlight-value">
                {formatPrice(data.currentMonth.grandTotal)}
              </p>
              <p className="stats-highlight-meta muted">
                {t("statistics.splitLine", {
                  items: formatPrice(data.currentMonth.itemsTotal),
                  shipping: formatPrice(data.currentMonth.shippingTotal),
                })}
              </p>
            </article>
            <article className="stats-highlight card">
              <p className="stats-highlight-label">{t("statistics.thisYear")}</p>
              <p className="stats-highlight-value">
                {formatPrice(data.currentYear.grandTotal)}
              </p>
              <p className="stats-highlight-meta muted">
                {t("statistics.splitLine", {
                  items: formatPrice(data.currentYear.itemsTotal),
                  shipping: formatPrice(data.currentYear.shippingTotal),
                })}
              </p>
            </article>
          </div>

          <PeriodTable
            title={t("statistics.monthly")}
            rows={data.byMonth}
            locale={locale}
            t={t}
            maxTotal={maxMonthTotal}
            kind="month"
          />

          <PeriodTable
            title={t("statistics.yearly")}
            rows={data.byYear}
            locale={locale}
            t={t}
            maxTotal={maxYearTotal}
            kind="year"
          />
        </>
      )}
    </div>
  );
}
