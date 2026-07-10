import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Archive, Disc3, ExternalLink, Heart, Plus, X } from "lucide-react";
import { AddRecordModal } from "../components/AddRecordModal.jsx";
import { DiscogsAddAllToCartButton } from "../components/DiscogsAddAllToCartButton.jsx";
import { MemberChips } from "../components/MemberChips.jsx";
import { SellerAvatar } from "../components/SellerAvatar.jsx";
import { OrderSummary } from "../components/OrderSummary.jsx";
import { RecordList } from "../components/RecordList.jsx";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { sellerMywantsUrl } from "../../shared/discogsUrls.js";
import { displayOrderTitle } from "../../shared/orderTitle.js";

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
  const [loading, setLoading] = useState(true);

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
      alert(err.message);
    } finally {
      setSavingShipping(false);
    }
  }

  async function handleAddRecord({ urls, onProgress }) {
    setAddingRecord(true);
    const errors = [];
    let added = 0;

    try {
      for (let i = 0; i < urls.length; i++) {
        onProgress?.({ current: i + 1, total: urls.length });
        try {
          await api(`/api/sessions/${id}/links`, {
            method: "POST",
            body: JSON.stringify({ url: urls[i] }),
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

  async function handleRenameMember(userId, displayName) {
    try {
      const { session: next } = await api(`/api/sessions/${id}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ displayName }),
      });
      setSession(next);
    } catch (err) {
      alert(err.message ?? t("session.renameFailed"));
      throw err;
    }
  }

  async function handleRenameLink(linkId, ordererDisplayName) {
    try {
      const { session: next } = await api(`/api/sessions/${id}/links/${linkId}`, {
        method: "PATCH",
        body: JSON.stringify({ ordererDisplayName }),
      });
      setSession(next);
    } catch (err) {
      alert(err.message ?? t("session.renameFailed"));
      throw err;
    }
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

  const orderActions =
    recordCount > 0 || !isClosed ? (
      <div className="order-session-actions">
        {!isClosed && (
          <button
            type="button"
            className="btn btn-cancel-order"
            onClick={handleCancel}
            disabled={cancelling}
            title={t("session.cancelOrder")}
          >
            <X size={18} strokeWidth={2.5} />
            {cancelling ? t("session.cancelling") : t("session.cancelOrder")}
          </button>
        )}
        <div className="order-session-actions-end">
          {recordCount > 0 && (
            <DiscogsAddAllToCartButton links={session.links} disabled={isClosed} />
          )}
          {!isClosed && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClose}
              disabled={closing}
            >
              <Archive size={16} />
              {closing ? t("session.closing") : t("session.closeOrder")}
            </button>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className="page page-detail">
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
      />

      <div className="members card">
        <span className="label">{t("session.participants")}</span>
        <MemberChips
          members={session.members}
          canManage={session.canManageMembers}
          disabled={isClosed}
          onRename={handleRenameMember}
        />
      </div>

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
              orderGrandTotal={session.orderGrandTotal}
              canManageMembers={session.canManageMembers && !isClosed}
              onRenameLink={handleRenameLink}
            />
            <OrderSummary
              memberTotals={session.memberTotals}
              orderGrandTotal={session.orderGrandTotal}
              shippingValue={session.shipping_value}
              shippingCurrency={session.shipping_currency}
              shippingSplitCount={session.shipping_split_count}
              memberCount={session.members?.length ?? 0}
              readOnly={isClosed || !session.canManageShipping}
              onSaveShipping={session.canManageShipping ? handleSaveShipping : undefined}
              savingShipping={savingShipping}
            />
          </>
        )}
        {orderActions}
      </section>
    </div>
  );
}
