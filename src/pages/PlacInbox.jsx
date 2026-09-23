import { useEffect, useMemo, useRef, useState } from "react";
import { HandCoins, Inbox, Loader2, MessageCircle, Send, Store } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PlacPageHeader } from "../components/PlacPageHeader.jsx";
import { PlacSellDialog } from "../components/PlacSellDialog.jsx";
import { UserAvatar } from "../components/UserAvatar.jsx";
import { api } from "../api.js";
import { formatPrice } from "../../shared/orderTotals.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { resolveUserAvatarUrl } from "../utils/userAvatarUrl.js";

function otherLabel(user) {
  if (user?.discogsUsername) return `@${user.discogsUsername}`;
  if (user?.username) return `@${user.username}`;
  return user?.name ?? "—";
}

function listingLabel(thread) {
  return [thread.listingArtist, thread.listingTitle].filter(Boolean).join(" — ") || "—";
}

function formatWhen(value, locale) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "sl" ? "sl-SI" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlacInbox() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [threads, setThreads] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sellOpen, setSellOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const messagesEndRef = useRef(null);
  const canCancelPayments = Boolean(user?.isAdmin);

  useEffect(() => {
    setLoading(true);
    api("/api/plac/inbox")
      .then((data) => {
        setThreads(data.threads ?? []);
        setPaymentRequests(data.paymentRequests ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!threadId) {
      setActiveThread(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    setThreadLoading(true);
    api(`/api/plac/inbox/${threadId}`)
      .then((data) => {
        if (cancelled) return;
        setActiveThread(data.thread ?? null);
        setMessages(data.messages ?? []);
        setThreads((prev) =>
          prev.map((row) =>
            row.id === threadId ? { ...row, unreadCount: 0, ...(data.thread ?? {}) } : row
          )
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setActiveThread(null);
          setMessages([]);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setThreadLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, threadId]);

  const subtitle = useMemo(() => {
    if (loading) return t("common.loading");
    const unread = threads.reduce((sum, row) => sum + (row.unreadCount || 0), 0);
    const payments = paymentRequests.length;
    if (threads.length === 0 && payments === 0) return t("plac.inboxEmpty");
    const parts = [];
    if (unread > 0) parts.push(t("plac.inboxUnread", { count: unread }));
    else if (threads.length > 0) {
      parts.push(t("plac.inboxThreadCount", { count: threads.length }));
    }
    if (payments > 0) parts.push(t("plac.inboxPaymentsCount", { count: payments }));
    return parts.join(" · ");
  }, [loading, threads, paymentRequests, t]);

  async function handleSend(e) {
    e.preventDefault();
    if (!threadId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const data = await api(`/api/plac/inbox/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      });
      setMessages((prev) => [...prev, data.message]);
      setDraft("");
      setThreads((prev) =>
        prev.map((row) =>
          row.id === threadId
            ? {
                ...row,
                lastMessage: data.message,
                updatedAt: data.message?.createdAt ?? row.updatedAt,
              }
            : row
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleCancelPayment(requestId) {
    if (!canCancelPayments || cancellingId) return;
    if (!window.confirm(t("payments.cancelConfirm"))) return;
    setCancellingId(requestId);
    setError(null);
    try {
      await api(`/auth/me/payment-requests/${requestId}`, { method: "DELETE" });
      setPaymentRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  const isEmpty = !loading && threads.length === 0 && paymentRequests.length === 0;

  return (
    <div className="page page-orders page-plac page-plac-inbox">
      <PlacPageHeader
        backTo={{ to: "/plac", label: t("plac.backToMarketplace") }}
        title={t("plac.inboxTitle")}
        subtitle={subtitle}
        showSearch={false}
        onSell={() => setSellOpen(true)}
      />

      {loading ? (
        <p className="orders-loading">{t("common.loadingItems")}</p>
      ) : isEmpty ? (
        <div className="orders-empty plac-empty">
          <Inbox size={40} strokeWidth={1.2} />
          <p>{t("plac.inboxEmpty")}</p>
          <p className="muted fine">{t("plac.inboxEmptyHint")}</p>
        </div>
      ) : (
        <div className={`plac-inbox${threadId ? " plac-inbox--thread-open" : ""}`}>
          <aside className="plac-inbox-list card">
            {paymentRequests.length > 0 && (
              <div className="plac-inbox-payments">
                <p className="plac-inbox-payments-label muted fine">
                  {t("plac.inboxPayments")}
                </p>
                {paymentRequests.map((req) => (
                  <div key={req.id} className="plac-inbox-payment">
                    <div className="plac-inbox-payment-main">
                      <HandCoins size={18} strokeWidth={2.1} aria-hidden />
                      <div>
                        <strong>
                          {formatPrice(req.amountValue, req.amountCurrency)}
                        </strong>
                        <p className="muted fine">
                          {t("payments.from", { name: req.fromUserName || "—" })}
                          {req.orderTitle ? ` · ${req.orderTitle}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="plac-inbox-payment-actions">
                      <a
                        className="btn btn-primary btn-sm"
                        href={req.paypalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("payments.payPaypal")}
                      </a>
                      {req.orderId && (
                        <Link
                          className="btn btn-ghost btn-sm"
                          to={`/session/${req.orderId}`}
                        >
                          {t("payments.openOrder")}
                        </Link>
                      )}
                      {canCancelPayments && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={cancellingId === req.id}
                          onClick={() => handleCancelPayment(req.id)}
                        >
                          {cancellingId === req.id
                            ? t("payments.cancelling")
                            : t("payments.cancelRequest")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {threads.map((thread) => {
              const active = thread.id === threadId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  className={`plac-inbox-thread${active ? " is-active" : ""}${
                    thread.unreadCount > 0 ? " has-unread" : ""
                  }`}
                  onClick={() => navigate(`/plac/inbox/${thread.id}`)}
                >
                  {thread.listingThumbnailUrl ? (
                    <img src={thread.listingThumbnailUrl} alt="" className="plac-inbox-thumb" />
                  ) : (
                    <span className="plac-inbox-thumb plac-inbox-thumb--empty" aria-hidden>
                      <Store size={16} />
                    </span>
                  )}
                  <span className="plac-inbox-thread-body">
                    <span className="plac-inbox-thread-top">
                      <span className="plac-inbox-thread-name">{otherLabel(thread.otherUser)}</span>
                      <span className="plac-inbox-thread-time muted fine">
                        {formatWhen(thread.lastMessage?.createdAt || thread.updatedAt, locale)}
                      </span>
                    </span>
                    <span className="plac-inbox-thread-listing muted fine">{listingLabel(thread)}</span>
                    <span className="plac-inbox-thread-preview">
                      {thread.lastMessage?.body || t("plac.inboxNoMessages")}
                    </span>
                  </span>
                  {thread.unreadCount > 0 && (
                    <span className="plac-inbox-unread">{thread.unreadCount}</span>
                  )}
                </button>
              );
            })}
            {threads.length === 0 && paymentRequests.length > 0 && (
              <p className="plac-inbox-no-threads muted fine">
                {t("plac.inboxNoThreadsYet")}
              </p>
            )}
          </aside>

          <section className="plac-inbox-pane card">
            {!threadId ? (
              <div className="plac-inbox-empty-pane">
                <MessageCircle size={36} strokeWidth={1.2} />
                <p>
                  {paymentRequests.length > 0
                    ? t("plac.inboxSelectOrPay")
                    : t("plac.inboxSelect")}
                </p>
                {paymentRequests.length > 0 && (
                  <Link to="/payments" className="btn btn-ghost btn-sm">
                    {t("nav.paymentRequests")}
                  </Link>
                )}
              </div>
            ) : threadLoading ? (
              <p className="orders-loading">{t("common.loading")}</p>
            ) : !activeThread ? (
              <div className="plac-inbox-empty-pane">
                <p>{error ?? t("plac.inboxThreadNotFound")}</p>
              </div>
            ) : (
              <>
                <header className="plac-inbox-pane-head">
                  <div className="plac-inbox-pane-user">
                    <UserAvatar
                      name={activeThread.otherUser?.name}
                      avatarUrl={resolveUserAvatarUrl(activeThread.otherUser)}
                      size={36}
                    />
                    <div>
                      <p className="plac-inbox-pane-name">{otherLabel(activeThread.otherUser)}</p>
                      <Link
                        to={`/plac/item/${activeThread.listingId}`}
                        className="plac-inbox-pane-listing muted fine"
                      >
                        {listingLabel(activeThread)}
                      </Link>
                    </div>
                  </div>
                </header>

                <div className="plac-inbox-messages">
                  {messages.map((message) => {
                    const mine = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`plac-inbox-bubble${mine ? " plac-inbox-bubble--mine" : ""}`}
                      >
                        <p>{message.body}</p>
                        <span className="muted fine">
                          {formatWhen(message.createdAt, locale)}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form className="plac-inbox-compose" onSubmit={handleSend}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t("plac.inboxComposePlaceholder")}
                    rows={2}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={sending || !draft.trim()}
                    aria-label={t("plac.sendMessage")}
                  >
                    {sending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      <PlacSellDialog open={sellOpen} onClose={() => setSellOpen(false)} />
    </div>
  );
}
