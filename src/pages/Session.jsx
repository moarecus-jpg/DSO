import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Archive, Disc3, ExternalLink, Heart, Plus, RefreshCw, RotateCcw, X } from "lucide-react";
import { AddRecordModal } from "../components/AddRecordModal.jsx";
import { AppSelect } from "../components/AppSelect.jsx";
import { CloseOrderDialog } from "../components/CloseOrderDialog.jsx";
import { DiscogsAddAllToCartButton } from "../components/DiscogsAddAllToCartButton.jsx";
import { MemberChips } from "../components/MemberChips.jsx";
import { OrderStoreAvatar } from "../components/OrderStoreAvatar.jsx";
import { OrderStickyFooter } from "../components/OrderStickyFooter.jsx";
import { OrderTargetDate } from "../components/OrderTargetDate.jsx";
import { OrderNotes } from "../components/OrderNotes.jsx";
import { RecordList } from "../components/RecordList.jsx";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { sellerMywantsUrl } from "../../shared/discogsUrls.js";
import { displayOrderTitle } from "../../shared/orderTitle.js";
import { orderPageTitle } from "../../shared/orderShare.js";
import { getStoreConfig, isShopStore } from "../../shared/stores.js";
import {
  isArchivedSession,
  isOpenSession,
  isReopenableSession,
  SESSION_STATUSES,
  sessionListNavKey,
  sessionListPath,
  sessionStatusAppearance,
  sessionStatusNoteKey,
} from "../../shared/orderStatus.js";

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
  const [addRecordSkippable, setAddRecordSkippable] = useState(false);
  const [addingRecord, setAddingRecord] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingTargetDate, setSavingTargetDate] = useState(false);
  const [removingLinkId, setRemovingLinkId] = useState(null);
  const [postingNote, setPostingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [footerExpanded, setFooterExpanded] = useState(false);
  const [shippingError, setShippingError] = useState(null);
  const [settlingUserId, setSettlingUserId] = useState(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [statusId, setStatusId] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [refreshingAvailability, setRefreshingAvailability] = useState(false);
  const [becameUnavailable, setBecameUnavailable] = useState([]);

  function loadSession() {
    return api(`/api/sessions/${id}`).then((d) => {
      setSession(d.session);
      return d.session;
    });
  }

  useEffect(() => {
    setAddRecordOpen(false);
    setBecameUnavailable([]);
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
      setAddRecordSkippable(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setOwnerId(session?.created_by ?? "");
  }, [session?.created_by]);

  useEffect(() => {
    setStatusId(session?.status ?? "open");
  }, [session?.status]);

  function openAddRecord() {
    setAddRecordSkippable(false);
    setAddRecordOpen(true);
  }

  function closeAddRecord() {
    setAddRecordOpen(false);
    setAddRecordSkippable(false);
  }

  async function handleCancel() {
    if (!confirm(t("session.confirmCancel"))) return;
    setCancelling(true);
    try {
      const { session: updated } = await api(`/api/sessions/${id}/cancel`, {
        method: "POST",
      });
      navigate(sessionListPath(updated?.status ?? "canceled"));
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
  }

  function handleClose() {
    setCloseDialogOpen(true);
  }

  async function handleCloseOutcome(outcome) {
    setClosing(true);
    try {
      const { session: updated } = await api(`/api/sessions/${id}/close`, {
        method: "POST",
        body: JSON.stringify({ outcome }),
      });
      setCloseDialogOpen(false);
      navigate(sessionListPath(updated?.status));
    } catch (err) {
      alert(err.message);
    } finally {
      setClosing(false);
    }
  }

  async function handleReopen() {
    setReopening(true);
    try {
      const { session: updated } = await api(`/api/sessions/${id}/reopen`, {
        method: "POST",
      });
      setSession(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setReopening(false);
    }
  }

  async function handleTransferOwner() {
    if (!ownerId || ownerId === session?.created_by) return;
    setTransferring(true);
    try {
      const { session: updated } = await api(`/api/sessions/${id}/owner`, {
        method: "PATCH",
        body: JSON.stringify({ userId: ownerId }),
      });
      setSession(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setTransferring(false);
    }
  }

  async function handleSaveStatus() {
    if (!statusId || statusId === session?.status) return;
    setSavingStatus(true);
    try {
      const { session: updated } = await api(`/api/sessions/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusId }),
      });
      setSession(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSaveShipping({
    shippingValue,
    shippingCurrency,
    shippingSplitCount,
    shippingMode,
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
          shippingMode,
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

  async function handleToggleSettle(userId, settled) {
    if (!userId) return;
    setSettlingUserId(userId);
    setShippingError(null);
    try {
      const { session: updated } = await api(
        `/api/sessions/${id}/members/${userId}/settle`,
        {
          method: "PATCH",
          body: JSON.stringify({ settled }),
        }
      );
      setSession(updated);
    } catch (err) {
      setShippingError(err.message ?? t("errors.settleFailed"));
      setFooterExpanded(true);
    } finally {
      setSettlingUserId(null);
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

  async function handleRefreshAvailability() {
    setRefreshingAvailability(true);
    try {
      const data = await api(`/api/sessions/${id}/availability/refresh`, {
        method: "POST",
      });
      setSession(data.session);
      setBecameUnavailable(data.becameUnavailable ?? []);
    } catch (err) {
      alert(err.message);
    } finally {
      setRefreshingAvailability(false);
    }
  }

  function canRemoveLink(link) {
    if (!isOpenSession(session?.status)) return false;
    if (session?.canManageOrder) return true;
    return link.user_id === user?.id;
  }

  if (loading) {
    return (
      <div className="muted center page">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> {t("nav.back")}
        </Link>
        <p>{t("common.loadingOrder")}</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="muted center page">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> {t("nav.back")}
        </Link>
        <p>{t("session.notFound")}</p>
      </div>
    );
  }

  const storeConfig = getStoreConfig(session.store);
  const isShop = isShopStore(session.store);
  const sellerUrl = isShop
    ? storeConfig.shopUrl
    : `https://www.discogs.com/seller/${session.seller_username}/profile`;
  const wantlistUrl = isShop
    ? null
    : sellerMywantsUrl(session.seller_username, user?.discogsUsername);
  const isOpen = isOpenSession(session.status);
  const isArchived = isArchivedSession(session.status);
  const recordCount = session.links?.length ?? 0;
  const canManageOrder = session.canManageOrder;
  const showOrderFooter = true;
  const backTo = sessionListPath(session.status);
  const backLabel = t(sessionListNavKey(session.status));
  const statusNoteKey = sessionStatusNoteKey(session.status);
  const ownerOptions = (session.members ?? []).map((member) => {
    const handle = member.discogs_username ? `@${member.discogs_username}` : null;
    const name = member.name ?? handle ?? member.id;
    return {
      value: member.id,
      label:
        handle && member.name && member.name !== handle
          ? `${member.name} (${handle})`
          : name,
    };
  });
  if (
    session.created_by &&
    !ownerOptions.some((option) => option.value === session.created_by)
  ) {
    ownerOptions.unshift({
      value: session.created_by,
      label:
        session.creator_name ??
        (session.creator_username
          ? `@${session.creator_username}`
          : session.created_by),
    });
  }

  const footerLeadingActions =
    canManageOrder && isOpen ? (
      <button
        type="button"
        className="order-sticky-footer-action-btn order-sticky-footer-action-btn--destructive"
        onClick={handleCancel}
        disabled={cancelling}
        title={t("session.cancelOrder")}
        aria-label={t("session.cancelOrder")}
      >
        <X size={18} strokeWidth={2.5} aria-hidden />
        <span className="order-sticky-footer-action-label">
          {cancelling ? t("session.cancelling") : t("session.cancelOrder")}
        </span>
      </button>
    ) : null;

  const footerCartAction =
    session.canAddAllToCart && recordCount > 0 && !isShop ? (
      <DiscogsAddAllToCartButton
        links={session.links}
        disabled={isArchived}
        variant="outline"
        className="order-sticky-footer-action-btn order-sticky-footer-action-btn--secondary"
      />
    ) : null;

  const footerActions =
    canManageOrder && isOpen ? (
      <button
        type="button"
        className="order-sticky-footer-action-btn order-sticky-footer-action-btn--primary"
        onClick={handleClose}
        disabled={closing}
        title={t("session.closeOrder")}
        aria-label={closing ? t("session.closing") : t("session.closeOrder")}
      >
        <Archive size={18} aria-hidden />
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
    ) : session.canReopen && isReopenableSession(session.status) ? (
      <button
        type="button"
        className="order-sticky-footer-action-btn order-sticky-footer-action-btn--primary"
        onClick={handleReopen}
        disabled={reopening}
        title={t("session.reopenOrder")}
        aria-label={reopening ? t("session.reopening") : t("session.reopenOrder")}
      >
        <RotateCcw size={18} aria-hidden />
        <span className="order-sticky-footer-action-label">
          {reopening ? t("session.reopening") : t("session.reopenOrder")}
        </span>
      </button>
    ) : null;

  return (
    <div
      className={`page page-detail page-session-with-footer${
        footerExpanded ? " page-session-with-footer--expanded" : ""
      }`}
    >
      <Link to={backTo} className="back-link">
        <ArrowLeft size={16} /> {backLabel}
      </Link>

      <header className="page-header">
        <div>
          <h1>{displayOrderTitle(session)}</h1>
          <div className="session-seller-row">
            <OrderStoreAvatar
              store={session.store}
              username={session.seller_username}
              avatarUrl={session.seller_avatar_url}
              className="session-seller-avatar"
              size={40}
            />
            <a href={sellerUrl} target="_blank" rel="noreferrer" className="seller-link">
              {isShop ? storeConfig.label : `@${session.seller_username}`}
              <ExternalLink size={14} />
            </a>
          </div>
          {statusNoteKey && <p className="muted fine">{t(statusNoteKey)}</p>}
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
          {isOpen && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleRefreshAvailability}
              disabled={refreshingAvailability || recordCount === 0}
              title={t("session.refreshAvailabilityHint")}
            >
              <RefreshCw
                size={18}
                className={refreshingAvailability ? "spin" : undefined}
              />
              {refreshingAvailability
                ? t("session.refreshingAvailability")
                : t("session.refreshAvailability")}
            </button>
          )}
          {isOpen && (
            <button type="button" className="btn btn-primary" onClick={openAddRecord}>
              <Plus size={18} />
              {t("session.addItem")}
            </button>
          )}
        </div>
      </header>

      <AddRecordModal
        open={addRecordOpen}
        onClose={closeAddRecord}
        onSubmit={handleAddRecord}
        submitting={addingRecord}
        store={session.store}
        sellerUsername={session.seller_username}
        currentUserId={user?.id}
        canAddForOthers={Boolean(canManageOrder)}
        skippable={addRecordSkippable}
      />

      <div className="members card">
        <span className="label">{t("session.participants")}</span>
        <MemberChips members={session.members} />
      </div>

      {canManageOrder && isOpen && ownerOptions.length > 0 && (
        <div className="members card session-owner-card">
          <span className="label">{t("session.ownerLabel")}</span>
          <p className="muted fine">{t("session.ownerHint")}</p>
          <div className="session-owner-row">
            <AppSelect
              value={ownerId || session.created_by}
              onChange={setOwnerId}
              options={ownerOptions}
              ariaLabel={t("session.ownerLabel")}
              disabled={transferring}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleTransferOwner}
              disabled={
                transferring || !ownerId || ownerId === session.created_by
              }
            >
              {transferring ? t("session.transferring") : t("session.transferOwner")}
            </button>
          </div>
        </div>
      )}

      {(session.canChangeStatus || user?.isAdmin) && (
        <div className="members card session-owner-card">
          <span className="label">{t("session.statusLabel")}</span>
          <p className="muted fine">{t("session.statusHint")}</p>
          <div className="session-owner-row">
            <AppSelect
              value={statusId || session.status || "open"}
              onChange={setStatusId}
              options={SESSION_STATUSES.map((status) => ({
                value: status,
                label: t(sessionStatusAppearance(status).labelKey),
              }))}
              ariaLabel={t("session.statusLabel")}
              disabled={savingStatus}
              searchable={false}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleSaveStatus}
              disabled={
                savingStatus || !statusId || statusId === session.status
              }
            >
              {savingStatus ? t("session.savingStatus") : t("session.saveStatus")}
            </button>
          </div>
        </div>
      )}

      <OrderTargetDate
        targetDate={session.target_date}
        readOnly={isArchived || !canManageOrder}
        saving={savingTargetDate}
        onSave={canManageOrder ? handleSaveTargetDate : undefined}
      />

      <section>
        {recordCount === 0 ? (
          <div className="empty card order-empty">
            <Disc3 size={40} strokeWidth={1.2} />
            <h2 className="order-empty-title">{t("session.emptyTitle")}</h2>
            <p className="muted">
              {t("session.emptyBodyBefore")}
              <strong>{t("session.emptyBodyLink")}</strong>
              {isShop
                ? t("session.emptyBodyAfterShop", {
                    domain: storeConfig.urlHint,
                  })
                : t("session.emptyBodyAfter")}
            </p>
          </div>
        ) : (
          <>
            <RecordList
              links={session.links}
              store={session.store}
              onRemoveLink={handleRemoveLink}
              removingLinkId={removingLinkId}
              canRemoveLink={canRemoveLink}
            />
            {becameUnavailable.length > 0 && (
              <p className="muted fine order-unavailable-note">
                {t("items.unavailableAfterRefresh", {
                  count: becameUnavailable.length,
                })}
              </p>
            )}
            <RecordList
              links={session.links}
              store={session.store}
              onRemoveLink={handleRemoveLink}
              removingLinkId={removingLinkId}
              canRemoveLink={canRemoveLink}
              unavailableOnly
            />
          </>
        )}
        <OrderNotes
          notes={session.notes}
          readOnly={isArchived}
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
          shippingMode={session.shipping_mode ?? "equal"}
          memberCount={session.members?.length ?? 0}
          readOnly={
            session.status !== "open" ||
            !(session.canManageShipping || session.canManageOrder)
          }
          onSaveShipping={
            session.canManageShipping || session.canManageOrder
              ? handleSaveShipping
              : undefined
          }
          savingShipping={savingShipping}
          footerActions={footerActions}
          footerCartAction={footerCartAction}
          footerLeadingActions={footerLeadingActions}
          backTo={backTo}
          backLabel={t("nav.back")}
          onExpandedChange={setFooterExpanded}
          shippingError={shippingError}
          canManageSettle={Boolean(
            session.canManageShipping || session.canManageOrder
          )}
          onToggleSettle={
            session.canManageShipping || session.canManageOrder
              ? handleToggleSettle
              : undefined
          }
          settlingUserId={settlingUserId}
        />
      )}

      <CloseOrderDialog
        open={closeDialogOpen}
        closing={closing}
        onClose={() => setCloseDialogOpen(false)}
        onChoose={handleCloseOutcome}
      />
    </div>
  );
}
