import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ClipboardCheck, HandCoins } from "lucide-react";
import { api } from "../api.js";
import { formatPrice } from "../../shared/orderTotals.js";
import { OrdersPageHeader } from "../components/OrdersPageHeader.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function PaymentRequests() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const canCancel = Boolean(user?.isAdmin);

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
      const status = String(req.status ?? "").toLowerCase();
      return (
        req.fromUserName?.toLowerCase().includes(q) ||
        req.orderTitle?.toLowerCase().includes(q) ||
        req.note?.toLowerCase().includes(q) ||
        status.includes(q) ||
        amount.includes(q)
      );
    });
  }, [requests, query]);

  const pendingCount = useMemo(
    () => requests.filter((req) => req.status === "pending").length,
    [requests]
  );

  async function handleCancel(requestId) {
    if (!canCancel || cancellingId) return;
    if (!window.confirm(t("payments.cancelConfirm"))) return;
    setCancellingId(requestId);
    setError(null);
    try {
      await api(`/auth/me/payment-requests/${requestId}`, { method: "DELETE" });
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: "cancelled" } : req
        )
      );
    } catch (err) {
      setError(err.message ?? t("common.error"));
    } finally {
      setCancellingId(null);
    }
  }

  const subtitle = loading
    ? t("common.loading")
    : requests.length === 0
      ? t("payments.hint")
      : pendingCount > 0
        ? t("payments.count", { count: pendingCount })
        : t("payments.countSettled", { count: filtered.length });

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
        {filtered.map((req) => {
          const isPaid = req.status === "paid";
          const isCancelled = req.status === "cancelled";
          const isPending = req.status === "pending" || (!isPaid && !isCancelled);

          return (
            <li
              key={req.id}
              className={`card payment-request-card${
                isPaid ? " payment-request-card--paid" : ""
              }${isCancelled ? " payment-request-card--cancelled" : ""}`}
            >
              <div className="payment-request-card-main">
                {isPaid ? (
                  <span className="payment-request-status-icon" aria-hidden>
                    <ClipboardCheck size={20} strokeWidth={2.1} />
                    <Check size={12} strokeWidth={3} className="payment-request-status-check" />
                  </span>
                ) : (
                  <HandCoins size={20} strokeWidth={2.1} aria-hidden />
                )}
                <div>
                  <strong>
                    {formatPrice(req.amountValue, req.amountCurrency)}
                  </strong>
                  {isPaid && (
                    <span className="payment-request-badge payment-request-badge--paid">
                      {t("payments.statusPaid")}
                    </span>
                  )}
                  {isCancelled && (
                    <span className="payment-request-badge payment-request-badge--cancelled">
                      {t("payments.statusCancelled")}
                    </span>
                  )}
                  <p className="muted fine">
                    {t("payments.from", { name: req.fromUserName || "—" })}
                    {req.orderTitle ? ` · ${req.orderTitle}` : ""}
                  </p>
                  {req.note && <p className="payment-request-note">{req.note}</p>}
                </div>
              </div>
              <div className="payment-request-card-actions">
                {isPending && (
                  <a
                    className="btn btn-primary"
                    href={req.paypalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("payments.payPaypal")}
                  </a>
                )}
                {req.orderId && (
                  <Link className="btn btn-ghost" to={`/session/${req.orderId}`}>
                    {t("payments.openOrder")}
                  </Link>
                )}
                {canCancel && isPending && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={cancellingId === req.id}
                    onClick={() => handleCancel(req.id)}
                  >
                    {cancellingId === req.id
                      ? t("payments.cancelling")
                      : t("payments.cancelRequest")}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
