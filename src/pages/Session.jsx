import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Archive, Disc3, ExternalLink, Heart, Plus, X } from "lucide-react";
import { AddRecordModal } from "../components/AddRecordModal.jsx";
import { DiscogsAddAllToCartButton } from "../components/DiscogsAddAllToCartButton.jsx";
import { MemberChips } from "../components/MemberChips.jsx";
import { SellerAvatar } from "../components/SellerAvatar.jsx";
import { OrderStickyFooter } from "../components/OrderStickyFooter.jsx";
import { OrderTargetDate } from "../components/OrderTargetDate.jsx";
import { OrderNotes } from "../components/OrderNotes.jsx";
import { RecordList } from "../components/RecordList.jsx";
import { WantlistPicks } from "../components/WantlistPicks.jsx";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { sellerMywantsUrl } from "../../shared/discogsUrls.js";
import { displayOrderTitle } from "../../shared/orderTitle.js";
import { orderPageTitle } from "../../shared/orderShare.js";

export function Session() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [closing, setClosing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [addingRecord, setAddingRecord] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingTargetDate, setSavingTargetDate] = useState(false);
  const [removingLinkId, setRemovingLinkId] = useState(null);
  const [postingNote, setPostingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [footerExpanded, setFooterExpanded] = useState(false);
  const [shippingError, setShippingError] = useState(null);
  const [addingWantlistListingId, setAddingWantlistListingId] = useState(null);

  function loadSession() {
    return api(`/api/sessions/${id}`).then((d) => {
      setSession(d.session);
      return d.session;
    });
  }

  useEffect(() => {
    setAddRecordOpen(false);
    loadSession().catch(console.error).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!session) return undefined;
    document.title = orderPageTitle(session);
    return () => {
      document.title = "DSO — Discogs Slovenia Orders";
    };
  }, [session]);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAddRecordOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function handleCancel() {
    if (!confirm(t("session.confirmCancel"))) return;
    setCancelling(true);
    try {
      await api(`/api/sessions/${id}/cancel`, { method: "POST" });
      navigate("/");
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
  }

  async function handleClose() {
    if (!confirm(t("session.confirmClose"))) return;
    setClosing(true);
    try {
      await api(`/api/sessions/${id}/close`, { method: "POST" });
      navigate("/closed");
    } catch (err) {
      alert(err.message);
    } finally {
      setClosing(false);
    }
  }

  async function handleSaveShipping({
    shippingValue,
    shippingCurrency,
    shippingSplitCount,
  }) {
    setSavingShipping(true);
    setShippingError(null);
    try {
      const { session: updated } = await api(`/api/sessions/${id}/shipping`, {
        method: "PATCH",
        body: JSON.stringify({
          shippingValue,
          shippingCurrency,
          shippingSplitCount,
        }),
      });
      setSession(updated);
    } catch (err) {
      setShippingError(err.message ?? t("errors.saveShippingFailed"));
      setFooterExpanded(true);
    } finally {
      setSavingShipping(false);
    }
  }

  async function handleSaveTargetDate(targetDate) {
    setSavingTargetDate(true);
    try {
      const { session: updated } = await api(`/api/sessions/${id}/target-date`, {
        method: "PATCH",
        body: JSON.stringify({ targetDate }),
      });
      setSession(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingTargetDate(false);
    }
  }

  async function handleAddWantlistListing(url, listingId) {
    setAddingWantlistListingId(listingId);
    try {
      await handleAddRecord({
        urls: [url],
        forUserId: user?.id,
      });
    } finally {
      setAddingWantlistListingId(null);
    }
  }

  async function handleAddRecord({ urls, forUserId, onProgress }) {
    setAddingRecord(true);
    const errors = [];
    let added = 0;
    const targetUserId = forUserId ?? user?.id;

    try {
      for (let i = 0; i < urls.length; i++) {
        onProgress?.({ current: i + 1, total: urls.length });
        try {
          await api(`/api/sessions/${id}/links`, {
            method: "POST",
            body: JSON.stringify({ url: urls[i], forUserId: targetUserId }),
          });
          added += 1;
        } catch (err) {
          errors.push({ url: urls[i], error: err.message ?? t("common.error") });
        }
      }

      await loadSession();

      if (errors.length > 0) {
        const detail = errors
          .slice(0, 5)
          .map((e) => `• ${e.url}\n  ${e.error}`)
          .join("\n");
        alert(
          t("session.addPartial", {
            added,
            failed: errors.length,
            detail: detail ? `\n\n${detail}` : "",
          })
        );
        return { ok: added > 0 };
      }

      return { ok: added > 0 };
    } catch (err) {
      alert(err.message ?? t("session.addFailed"));
      return { ok: false };
    } finally {
      setAddingRecord(false);
    }
  }

  async function handleRemoveLink(link) {
    if (!confirm(t("session.confirmRemoveItem"))) return;
    setRemovingLinkId(link.id);
    try {
      const { session: updated } = await api(`/api/sessions/${id}/links/${link.id}`, {
        method: "DELETE",
      });
      setSession(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setRemovingLinkId(null);
    }
  }

  async function handlePostNote(body) {
    setPostingNote(true);
    try {
      const { session: updated } = await api(`/api/sessions/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setSession(updated);
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    } finally {
      setPostingNote(false);
    }
  }

  function canRemoveLink(link) {
    if (session?.status === "closed") return false;
    return (
      link.user_id === user?.id || session?.created_by === user?.id
    );
  }

  if (loading) return <p className="muted center page">{t("common.loadingOrder")}</p>;
  if (!session) return <p className="muted center page">{t("session.notFound")}</p>;

  const sellerUrl = `https://www.discogs.com/seller/${session.seller_username}/profile`;
  const wantlistUrl = sellerMywantsUrl(
    session.seller_username,
    user?.discogsUsername
  );
  const isClosed = session.status === "closed";
  const recordCount = session.links?.length ?? 0;
  const canManageOrder = session.canManageOrder;
  const showOrderFooter = recordCount > 0 || (canManageOrder && !isClosed);

  const footerLeadingActions =
    canManageOrder && !isClosed ? (
      <button
        type="button"
        className="order-sticky-footer-action-btn order-sticky-footer-action-btn--destructive"
        onClick={handleCancel}
        disabled={cancelling}
        title={t("session.cancelOrder")}
        aria-label={t("session.cancelOrder")}
      >
        <X size={14} strokeWidth={2.5} aria-hidden />
        <span className="order-sticky-footer-action-label">
          {cancelling ? t("session.cancelling") : t("session.cancelOrder")}
        </span>
      </button>
    ) : null;

  const footerActions =
    canManageOrder && (recordCount > 0 || !isClosed) ? (
      <>
        {recordCount > 0 && (
          <DiscogsAddAllToCartButton
            links={session.links}
            disabled={isClosed}
            variant="outline"
            className="order-sticky-footer-action-btn order-sticky-footer-action-btn--secondary"
          />
        )}
        {!isClosed && (
          <button
            type="button"
            className="order-sticky-footer-action-btn order-sticky-footer-action-btn--primary"
            onClick={handleClose}
            disabled={closing}
            title={t("session.closeOrder")}
            aria-label={closing ? t("session.closing") : t("session.closeOrder")}
          >
            <Archive size={16} aria-hidden />
            <span className="order-sticky-footer-action-label order-sticky-footer-action-label--long">
              {closing ? t("session.closing") : t("session.closeOrder")}
            </span>
            <span
              className="order-sticky-footer-action-label order-sticky-footer-action-label--short"
              aria-hidden
            >
              {closing ? t("session.closing") : t("session.closeOrderShort")}
            </span>
          </button>
        )}
      </>
    ) : null;

  return (
    <div
      className={`page page-detail page-session-with-footer${
        footerExpanded ? " page-session-with-footer--expanded" : ""
      }`}
    >
      <Link to={isClosed ? "/closed" : "/"} className="back-link">
        <ArrowLeft size={16} />{" "}
        {isClosed ? t("nav.closedOrders") : t("nav.openOrders")}
      </Link>

      <header className="page-header">
        <div>
          <h1>{displayOrderTitle(session)}</h1>
          <div className="session-seller-row">
            <SellerAvatar
              username={session.seller_username}
              avatarUrl={session.seller_avatar_url}
              className="session-seller-avatar"
              size={40}
            />
            <a href={sellerUrl} target="_blank" rel="noreferrer" className="seller-link">
              @{session.seller_username}
              <ExternalLink size={14} />
            </a>
          </div>
          {isClosed && <p className="muted fine">{t("session.closedNote")}</p>}
        </div>
        <div className="page-header-actions">
          {wantlistUrl && (
            <a
              href={wantlistUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              <Heart size={18} />
              {t("session.openWantlist")}
            </a>
          )}
          {!isClosed && (
            <button type="button" className="btn btn-primary" onClick={() => setAddRecordOpen(true)}>
              <Plus size={18} />
              {t("session.addItem")}
            </button>
          )}
        </div>
      </header>

      <AddRecordModal
        open={addRecordOpen}
        onClose={() => setAddRecordOpen(false)}
        onSubmit={handleAddRecord}
        submitting={addingRecord}
        sellerUsername={session.seller_username}
        currentUserId={user?.id}
      />

      <div className="members card">
        <span className="label">{t("session.participants")}</span>
        <MemberChips members={session.members} />
      </div>

      <OrderTargetDate
        targetDate={session.target_date}
        readOnly={isClosed || !canManageOrder}
        saving={savingTargetDate}
        onSave={canManageOrder ? handleSaveTargetDate : undefined}
      />

      <WantlistPicks
        sessionId={session.id}
        sellerUsername={session.seller_username}
        isClosed={isClosed}
        onAddListing={!isClosed ? handleAddWantlistListing : undefined}
        addingListingId={addingWantlistListingId}
      />

      <section>
        {recordCount === 0 ? (
          <div className="empty card order-empty">
            <Disc3 size={40} strokeWidth={1.2} />
            <h2 className="order-empty-title">{t("session.emptyTitle")}</h2>
            <p className="muted">
              {t("session.emptyBodyBefore")}
              <strong>{t("session.emptyBodyLink")}</strong>
              {t("session.emptyBodyAfter")}
            </p>
          </div>
        ) : (
          <>
            <RecordList
              links={session.links}
              onRemoveLink={handleRemoveLink}
              removingLinkId={removingLinkId}
              canRemoveLink={canRemoveLink}
            />
          </>
        )}
        <OrderNotes
          notes={session.notes}
          readOnly={isClosed}
          posting={postingNote}
          onPostNote={handlePostNote}
        />
      </section>

      {showOrderFooter && (
        <OrderStickyFooter
          memberTotals={session.memberTotals ?? []}
          orderGrandTotal={session.orderGrandTotal}
          shippingValue={session.shipping_value}
          shippingCurrency={session.shipping_currency}
          shippingSplitCount={session.shipping_split_count}
          memberCount={session.members?.length ?? 0}
          readOnly={!(session.canManageShipping || session.canManageOrder)}
          onSaveShipping={
            session.canManageShipping || session.canManageOrder
              ? handleSaveShipping
              : undefined
          }
          savingShipping={savingShipping}
          footerActions={footerActions}
          footerLeadingActions={footerLeadingActions}
          onExpandedChange={setFooterExpanded}
          shippingError={shippingError}
        />
      )}
    </div>
  );
}
