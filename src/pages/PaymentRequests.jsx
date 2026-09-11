import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HandCoins } from "lucide-react";
import { api } from "../api.js";
import { formatPrice } from "../../shared/orderTotals.js";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function PaymentRequests() {
  const { t } = useLocale();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api("/auth/me/payment-requests")
      .then((data) => {
        if (!cancelled) setRequests(data.requests ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? t("common.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((req) => {
      const amount = formatPrice(req.amountValue, req.amountCurrency).toLowerCase();
      return (
        req.fromUserName?.toLowerCase().includes(q) ||
        req.orderTitle?.toLowerCase().includes(q) ||
        req.note?.toLowerCase().includes(q) ||
        amount.includes(q)
      );
    });
  }, [requests, query]);

  const subtitle = loading
    ? t("common.loading")
    : requests.length === 0
      ? t("payments.hint")
      : t("payments.count", { count: filtered.length });

  return (
    <div className="page page-orders">
      <OrdersPageHeader
        title={t("payments.title")}
        subtitle={subtitle}
        query={query}
        onQueryChange={setQuery}
        placeholder={t("payments.searchPlaceholder")}
      />

      {error && (
        <p className="banner banner-warn" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="orders-empty card">
          <HandCoins size={40} strokeWidth={1.2} aria-hidden />
          <p>
            {query.trim() ? t("common.noSearchResults") : t("payments.empty")}
          </p>
          {!query.trim() && (
            <p className="muted fine">{t("payments.emptyHint")}</p>
          )}
        </div>
      )}

      <ul className="payment-request-list">
        {filtered.map((req) => (
          <li key={req.id} className="card payment-request-card">
            <div className="payment-request-card-main">
              <HandCoins size={20} strokeWidth={2.1} aria-hidden />
              <div>
                <strong>
                  {formatPrice(req.amountValue, req.amountCurrency)}
                </strong>
                <p className="muted fine">
                  {t("payments.from", { name: req.fromUserName || "—" })}
                  {req.orderTitle ? ` · ${req.orderTitle}` : ""}
                </p>
                {req.note && <p className="payment-request-note">{req.note}</p>}
              </div>
            </div>
            <div className="payment-request-card-actions">
              <a
                className="btn btn-primary"
                href={req.paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("payments.payPaypal")}
              </a>
              {req.orderId && (
                <Link className="btn btn-ghost" to={`/session/${req.orderId}`}>
                  {t("payments.openOrder")}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
