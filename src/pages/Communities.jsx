import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import QRCode from "qrcode";
import { api } from "../api.js";
import { HeaderAccount } from "../components/HeaderAccount.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

function CommunitiesPageHeader({ title, subtitle, backTo }) {
  return (
    <header className="orders-page-header orders-page-header--no-search">
      <div>
        {backTo ? (
          <Link to={backTo.to} className="communities-back">
            <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
            {backTo.label}
          </Link>
        ) : null}
        <h1 className="orders-page-title">{title}</h1>
        {subtitle ? <p className="orders-page-subtitle">{subtitle}</p> : null}
      </div>
      <div className="orders-page-header-account">
        <HeaderAccount />
      </div>
    </header>
  );
}

function communityLocation(community) {
  return [community.city, community.country].filter(Boolean).join(", ");
}

export function JoinCommunity() {
  const { code: codeParam } = useParams();
  const { user, refresh } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [directory, setDirectory] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [code, setCode] = useState(codeParam ?? "");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [requestBusyId, setRequestBusyId] = useState(null);
  const autoJoinAttempted = useRef(false);
  const hasCommunities = (user?.communities?.length ?? 0) > 0;

  const loadDirectory = useCallback(async () => {
    setLoadingDirectory(true);
    try {
      const data = await api("/api/communities/directory");
      setDirectory(data.communities ?? []);
    } catch {
      setDirectory([]);
    } finally {
      setLoadingDirectory(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  useEffect(() => {
    if (codeParam) setCode(codeParam);
  }, [codeParam]);

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    api(`/api/communities/preview/${encodeURIComponent(trimmed)}`)
      .then((data) => {
        if (!cancelled) {
          setPreview(data.community);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPreview(null);
          setError(err.message ?? t("communities.invalidInvite"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, t]);

  useEffect(() => {
    const trimmed = codeParam?.trim();
    if (!trimmed || autoJoinAttempted.current) return;
    autoJoinAttempted.current = true;
    setInviteBusy(true);
    setError("");
    api("/api/communities/join", {
      method: "POST",
      body: JSON.stringify({ code: trimmed }),
    })
      .then(async () => {
        await refresh();
        navigate("/", { replace: true });
      })
      .catch((err) => {
        setError(err.message ?? t("communities.joinError"));
        setInviteBusy(false);
      });
  }, [codeParam, navigate, refresh, t]);

  async function onInviteSubmit(e) {
    e.preventDefault();
    setInviteBusy(true);
    setError("");
    try {
      await api("/api/communities/join", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message ?? t("communities.joinError"));
      setInviteBusy(false);
    }
  }

  async function requestJoin(communityId) {
    setRequestBusyId(communityId);
    setError("");
    try {
      await api(`/api/communities/${communityId}/request`, { method: "POST" });
      await loadDirectory();
    } catch (err) {
      setError(err.message ?? t("communities.requestError"));
    } finally {
      setRequestBusyId(null);
    }
  }

  return (
    <div className="page page-settings page-communities page-communities--onboarding">
      <CommunitiesPageHeader
        title={
          hasCommunities ? t("communities.joinTitle") : t("communities.onboardingTitle")
        }
        subtitle={
          hasCommunities
            ? t("communities.joinSubtitle")
            : t("communities.onboardingSubtitle")
        }
        backTo={
          hasCommunities
            ? { to: "/communities", label: t("communities.manage") }
            : null
        }
      />

      <div className="card settings-card communities-card">
        <div className="communities-card-head">
          <span className="communities-card-icon" aria-hidden>
            <Users size={20} strokeWidth={2.1} />
          </span>
          <div>
            <h2>{t("communities.directoryTitle")}</h2>
            <p className="muted settings-privacy-hint">
              {t("communities.directoryHint")}
            </p>
          </div>
        </div>

        {loadingDirectory ? (
          <p className="muted">{t("common.loading")}</p>
        ) : directory.length === 0 ? (
          <p className="muted">{t("communities.directoryEmpty")}</p>
        ) : (
          <ul className="communities-directory-list">
            {directory.map((community) => {
              const location = communityLocation(community);
              const membership = community.membership ?? "none";
              return (
                <li key={community.id} className="communities-directory-item">
                  <div className="communities-list-meta">
                    <strong>{community.name}</strong>
                    <span className="muted fine">
                      {t("communities.memberCount", {
                        count: community.memberCount ?? 0,
                      })}
                      {location ? ` · ${location}` : null}
                    </span>
                  </div>
                  {membership === "member" ? (
                    <span className="communities-active-pill">
                      {t("communities.alreadyMember")}
                    </span>
                  ) : membership === "pending" ? (
                    <span className="communities-pending-pill">
                      {t("communities.requestPending")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={requestBusyId === community.id}
                      onClick={() => requestJoin(community.id)}
                    >
                      <UserPlus size={15} strokeWidth={2.2} aria-hidden />
                      {requestBusyId === community.id
                        ? t("common.loading")
                        : t("communities.requestJoin")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form className="card settings-card communities-card" onSubmit={onInviteSubmit}>
        <div className="communities-card-head">
          <span className="communities-card-icon" aria-hidden>
            <Link2 size={20} strokeWidth={2.1} />
          </span>
          <div>
            <h2>{t("communities.inviteCode")}</h2>
            <p className="muted settings-privacy-hint">{t("communities.joinHint")}</p>
          </div>
        </div>

        <label className="settings-email-field">
          <span>{t("communities.inviteCode")}</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            placeholder={t("communities.invitePlaceholder")}
          />
        </label>

        {preview ? (
          <div className="communities-preview-pill">
            <Users size={15} strokeWidth={2.1} aria-hidden />
            <span>
              {t("communities.preview", {
                name: preview.name,
                count: preview.memberCount ?? 0,
              })}
              {preview.openOrderCount != null || preview.recentOrderCount != null
                ? ` · ${t("communities.previewOrders", {
                    open: preview.openOrderCount ?? 0,
                    recent: preview.recentOrderCount ?? 0,
                  })}`
                : null}
            </span>
          </div>
        ) : null}

        {error ? <p className="communities-form-error">{error}</p> : null}

        <div className="communities-card-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={inviteBusy || !code.trim()}
          >
            {inviteBusy ? t("common.loading") : t("communities.joinWithCode")}
          </button>
          <Link to="/communities/create" className="btn btn-ghost">
            {t("communities.orCreate")}
          </Link>
        </div>
      </form>
    </div>
  );
}

export function CreateCommunity() {
  const { user, refresh } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [listed, setListed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const hasCommunities = (user?.communities?.length ?? 0) > 0;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/communities", {
        method: "POST",
        body: JSON.stringify({ name, slug, city, country, listed }),
      });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message ?? t("communities.createError"));
      setBusy(false);
    }
  }

  return (
    <div className="page page-settings page-communities">
      <CommunitiesPageHeader
        title={t("communities.createTitle")}
        subtitle={t("communities.createSubtitle")}
        backTo={
          hasCommunities
            ? { to: "/communities", label: t("communities.manage") }
            : { to: "/join", label: t("communities.orJoin") }
        }
      />

      <form className="card settings-card communities-card" onSubmit={onSubmit}>
        <div className="communities-card-head">
          <span className="communities-card-icon" aria-hidden>
            <Plus size={20} strokeWidth={2.1} />
          </span>
          <div>
            <h2>{t("communities.createCta")}</h2>
            <p className="muted settings-privacy-hint">{t("communities.createHint")}</p>
          </div>
        </div>

        <div className="communities-form-grid">
          <label className="settings-email-field">
            <span>{t("communities.name")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder={t("communities.namePlaceholder")}
            />
          </label>
          <label className="settings-email-field">
            <span>{t("communities.slug")}</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("communities.slugPlaceholder")}
            />
          </label>
          <label className="settings-email-field">
            <span>{t("communities.city")}</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className="settings-email-field">
            <span>{t("communities.country")}</span>
            <input value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>
        </div>

        <label className="communities-listed-toggle">
          <input
            type="checkbox"
            checked={listed}
            onChange={(e) => setListed(e.target.checked)}
          />
          <span>
            <strong>{t("communities.listInDirectory")}</strong>
            <span className="muted fine">{t("communities.listInDirectoryHint")}</span>
          </span>
        </label>

        {error ? <p className="communities-form-error">{error}</p> : null}

        <div className="communities-card-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || name.trim().length < 2}
          >
            {busy ? t("common.loading") : t("communities.createCta")}
          </button>
          <Link to="/join" className="btn btn-ghost">
            {t("communities.orJoin")}
          </Link>
        </div>
      </form>
    </div>
  );
}

export function CommunitiesSetup() {
  const { user, refresh } = useAuth();
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [resolveBusyId, setResolveBusyId] = useState(null);
  const [listingBusy, setListingBusy] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const communities = user?.communities ?? [];
  const active = user?.activeCommunity ?? null;
  const canReview = communities.some((c) => c.role === "owner" || c.role === "admin");
  const canManageActive =
    active && (active.role === "owner" || active.role === "admin");
  const inviteUrl = active?.inviteCode
    ? `${window.location.origin}/invite/${active.inviteCode}`
    : "";

  useEffect(() => {
    if (!inviteUrl) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(inviteUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#111113", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [inviteUrl]);

  const loadRequests = useCallback(async () => {
    if (!canReview) {
      setRequests([]);
      return;
    }
    try {
      const data = await api("/api/communities/join-requests");
      setRequests(data.requests ?? []);
    } catch {
      setRequests([]);
    }
  }, [canReview]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  if (!communities.length) {
    return <Navigate to="/join" replace />;
  }

  async function switchTo(id) {
    if (!id || id === active?.id || busyId) return;
    setBusyId(id);
    try {
      await api(`/api/communities/${id}/active`, { method: "POST" });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function resolveRequest(requestId, decision) {
    setResolveBusyId(requestId);
    try {
      await api(`/api/communities/join-requests/${requestId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      });
      await loadRequests();
    } finally {
      setResolveBusyId(null);
    }
  }

  async function toggleListed(nextListed) {
    if (!active?.id || listingBusy) return;
    setListingBusy(true);
    try {
      await api(`/api/communities/${active.id}/listed`, {
        method: "POST",
        body: JSON.stringify({ listed: nextListed }),
      });
      await refresh();
    } finally {
      setListingBusy(false);
    }
  }

  return (
    <div className="page page-settings page-communities">
      <CommunitiesPageHeader
        title={t("communities.manageTitle")}
        subtitle={t("communities.manageSubtitle")}
        backTo={{ to: "/", label: t("communities.backHome") }}
      />

      {requests.length > 0 ? (
        <div className="card settings-card communities-card">
          <div className="communities-card-head">
            <span className="communities-card-icon" aria-hidden>
              <UserPlus size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h2>{t("communities.requestsTitle")}</h2>
              <p className="muted settings-privacy-hint">
                {t("communities.requestsHint")}
              </p>
            </div>
          </div>
          <ul className="communities-list">
            {requests.map((request) => (
              <li key={request.id} className="communities-list-item">
                <div className="communities-list-meta">
                  <strong>
                    {request.user_name ||
                      (request.user_username
                        ? `@${request.user_username}`
                        : t("common.unknown"))}
                  </strong>
                  <span className="muted fine">
                    {t("communities.requestFor", { name: request.community_name })}
                  </span>
                </div>
                <div className="communities-request-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={resolveBusyId === request.id}
                    onClick={() => resolveRequest(request.id, "approved")}
                  >
                    {t("communities.approve")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={resolveBusyId === request.id}
                    onClick={() => resolveRequest(request.id, "rejected")}
                  >
                    {t("communities.reject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card settings-card communities-card">
        <div className="communities-card-head">
          <span className="communities-card-icon" aria-hidden>
            <Users size={20} strokeWidth={2.1} />
          </span>
          <div>
            <h2>{t("communities.yourCommunities")}</h2>
            <p className="muted settings-privacy-hint">{t("communities.switchHint")}</p>
          </div>
        </div>

        <ul className="communities-list">
          {communities.map((community) => {
            const isActive = community.id === active?.id;
            return (
              <li
                key={community.id}
                className={`communities-list-item${isActive ? " is-active" : ""}`}
              >
                <div className="communities-list-meta">
                  <strong>{community.name}</strong>
                  <span className="muted fine">
                    {community.memberCount != null
                      ? t("communities.memberCount", { count: community.memberCount })
                      : null}
                    {community.city || community.country
                      ? ` · ${[community.city, community.country].filter(Boolean).join(", ")}`
                      : null}
                  </span>
                </div>
                {isActive ? (
                  <span className="communities-active-pill">{t("communities.active")}</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={Boolean(busyId)}
                    onClick={() => switchTo(community.id)}
                  >
                    {busyId === community.id ? t("common.loading") : t("communities.switch")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {active?.inviteCode ? (
        <div className="card settings-card communities-card">
          <div className="communities-card-head">
            <span className="communities-card-icon" aria-hidden>
              <Link2 size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h2>{t("communities.inviteTitle")}</h2>
              <p className="muted settings-privacy-hint">
                {t("communities.inviteFor", { name: active.name })}
              </p>
            </div>
          </div>

          <div className="communities-invite-row">
            <code className="communities-invite-code">{inviteUrl || active.inviteCode}</code>
            <button type="button" className="btn btn-ghost" onClick={copyInvite}>
              {copied ? (
                <Check size={16} strokeWidth={2.2} aria-hidden />
              ) : (
                <Copy size={16} strokeWidth={2.2} aria-hidden />
              )}
              {copied ? t("communities.copied") : t("communities.copyInvite")}
            </button>
          </div>

          {qrDataUrl ? (
            <div className="communities-invite-qr">
              <img
                src={qrDataUrl}
                alt={t("communities.inviteQrAlt", { name: active.name })}
                width={220}
                height={220}
              />
              <p className="muted fine">{t("communities.inviteQrHint")}</p>
            </div>
          ) : null}

          {canManageActive ? (
            <label className="communities-listed-toggle communities-listed-toggle--manage">
              <input
                type="checkbox"
                checked={Boolean(active.listed)}
                disabled={listingBusy}
                onChange={(e) => toggleListed(e.target.checked)}
              />
              <span>
                <strong>{t("communities.listInDirectory")}</strong>
                <span className="muted fine">{t("communities.listInDirectoryHint")}</span>
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="communities-footer-actions">
        <Link to="/communities/create" className="btn btn-primary">
          <Plus size={16} strokeWidth={2.3} aria-hidden />
          {t("communities.createCta")}
        </Link>
        <Link to="/join" className="btn btn-ghost">
          {t("communities.joinCta")}
        </Link>
      </div>
    </div>
  );
}
