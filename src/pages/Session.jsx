import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Archive, Disc3, ExternalLink, Heart, Plus, X } from "lucide-react";
import { AddRecordModal } from "../components/AddRecordModal.jsx";
import { MemberChips } from "../components/MemberChips.jsx";
import { SellerAvatar } from "../components/SellerAvatar.jsx";
import { OrderSummary } from "../components/OrderSummary.jsx";
import { RecordList } from "../components/RecordList.jsx";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { sellerMywantsUrl } from "../../shared/discogsUrls.js";

export function Session() {
  const { id } = useParams();
  const { user } = useAuth();
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
    if (
      !confirm(
        "Preklicati to naročilo? Vsi vnosi bodo izbrisani in naročilo ne bo več na seznamu."
      )
    ) {
      return;
    }
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
    if (!confirm("Zaključiti to naročilo? Premaknjeno bo med Zaprta naročila.")) return;
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
          errors.push({ url: urls[i], error: err.message ?? "Napaka" });
        }
      }

      await loadSession();

      if (errors.length > 0) {
        const detail = errors
          .slice(0, 5)
          .map((e) => `• ${e.url}\n  ${e.error}`)
          .join("\n");
        alert(
          `Dodanih: ${added}, neuspešnih: ${errors.length}.${detail ? `\n\n${detail}` : ""}`
        );
        return { ok: added > 0 };
      }

      return { ok: added > 0 };
    } catch (err) {
      alert(err.message ?? "Napaka pri dodajanju.");
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
      alert(err.message ?? "Imena ni bilo mogoče shraniti.");
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
      alert(err.message ?? "Imena ni bilo mogoče shraniti.");
      throw err;
    }
  }

  if (loading) return <p className="muted center page">Nalagam naročilo…</p>;
  if (!session) return <p className="muted center page">Naročilo ni najdeno</p>;

  const sellerUrl = `https://www.discogs.com/seller/${session.seller_username}/profile`;
  const wantlistUrl = sellerMywantsUrl(
    session.seller_username,
    user?.discogsUsername
  );
  const isClosed = session.status === "closed";
  const recordCount = session.links?.length ?? 0;

  const orderActions =
    !isClosed ? (
      <div className="order-session-actions">
        <button
          type="button"
          className="btn btn-cancel-order"
          onClick={handleCancel}
          disabled={cancelling}
          title="Prekliči naročilo"
        >
          <X size={18} strokeWidth={2.5} />
          {cancelling ? "Preklicujem…" : "Prekliči naročilo"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleClose}
          disabled={closing}
        >
          <Archive size={16} />
          {closing ? "Zaključujem…" : "Zaključi order"}
        </button>
      </div>
    ) : null;

  return (
    <div className="page page-detail">
      <Link to={isClosed ? "/closed" : "/"} className="back-link">
        <ArrowLeft size={16} /> {isClosed ? "Zaključena naročila" : "Odprta naročila"}
      </Link>

      <header className="page-header">
        <div>
          <h1>{session.title}</h1>
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
          {isClosed && <p className="muted fine">To naročilo je zaključeno.</p>}
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
              Odpri Wantlisto
            </a>
          )}
          {!isClosed && (
            <button type="button" className="btn btn-primary" onClick={() => setAddRecordOpen(true)}>
              <Plus size={18} />
              Dodaj Item
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
        <span className="label">Sodelujoči</span>
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
            <h2 className="order-empty-title">Naročilo je prazno</h2>
            <p className="muted">
              Dodaj Item s <strong>povezavo</strong> do Discogs listinga (shop ali sell URL) — eno ali več naenkrat.
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
              readOnly={isClosed}
              onSaveShipping={handleSaveShipping}
              savingShipping={savingShipping}
            />
          </>
        )}
        {orderActions}
      </section>
    </div>
  );
}
