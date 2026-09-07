import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  Plus,
  Users,
} from "lucide-react";
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

export function JoinCommunity() {
  const { code: codeParam } = useParams();
  const { user, refresh } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [code, setCode] = useState(codeParam ?? "");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const hasCommunities = (user?.communities?.length ?? 0) > 0;

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

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <div className="page page-settings page-communities">
      <CommunitiesPageHeader
        title={t("communities.joinTitle")}
        subtitle={t("communities.joinSubtitle")}
        backTo={
          hasCommunities
            ? { to: "/communities", label: t("communities.manage") }
            : null
        }
      />

      <form className="card settings-card communities-card" onSubmit={onSubmit}>
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
            required
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
            </span>
          </div>
        ) : null}

        {error ? <p className="communities-form-error">{error}</p> : null}

        <div className="communities-card-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || !code.trim()}>
            {busy ? t("common.loading") : t("communities.joinCta")}
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
        body: JSON.stringify({ name, slug, city, country }),
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

  const communities = user?.communities ?? [];
  const active = user?.activeCommunity ?? null;

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
    if (!active?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/join/${active.inviteCode}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="page page-settings page-communities">
      <CommunitiesPageHeader
        title={t("communities.manageTitle")}
        subtitle={t("communities.manageSubtitle")}
        backTo={{ to: "/", label: t("communities.backHome") }}
      />

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
            <code className="communities-invite-code">{active.inviteCode}</code>
            <button type="button" className="btn btn-ghost" onClick={copyInvite}>
              {copied ? <Check size={16} strokeWidth={2.2} aria-hidden /> : <Copy size={16} strokeWidth={2.2} aria-hidden />}
              {copied ? t("communities.copied") : t("communities.copyInvite")}
            </button>
          </div>
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
