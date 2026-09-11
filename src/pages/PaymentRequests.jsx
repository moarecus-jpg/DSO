import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HandCoins } from "lucide-react";
import { api } from "../api.js";
import { formatPrice } from "../../shared/orderTotals.js";
import { useLocale } from "../hooks/useLocale.jsx";

export function PaymentRequests() {
  const { t } = useLocale();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="page">
      <h1>{t("payments.title")}</h1>
      <p className="muted">{t("payments.hint")}</p>

      {loading && <p className="muted">{t("common.loading")}</p>}
      {error && (
        <p className="banner banner-warn" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && requests.length === 0 && (
        <div className="card">
          <p>{t("payments.empty")}</p>
          <p className="muted fine">{t("payments.emptyHint")}</p>
        </div>
      )}

      <ul className="payment-request-list">
        {requests.map((req) => (
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
