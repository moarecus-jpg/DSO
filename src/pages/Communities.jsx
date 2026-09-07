import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { BrandMark } from "../components/BrandMark.jsx";

export function JoinCommunity() {
  const { code: codeParam } = useParams();
  const { user, refresh } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [code, setCode] = useState(codeParam ?? "");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    <div className="auth-page community-setup-page">
      <div className="auth-card">
        <BrandMark variant="auth" />
        <h1>{t("communities.joinTitle")}</h1>
        <p className="muted">{t("communities.joinSubtitle")}</p>
        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field-group">
            <span className="auth-field-label">{t("communities.inviteCode")}</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              required
              placeholder={t("communities.invitePlaceholder")}
            />
          </label>
          {preview ? (
            <p className="community-preview">
              {t("communities.preview", {
                name: preview.name,
                count: preview.memberCount ?? 0,
              })}
            </p>
          ) : null}
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={busy || !code.trim()}>
            {busy ? t("common.loading") : t("communities.joinCta")}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/communities/create">{t("communities.orCreate")}</Link>
          {user?.communities?.length ? (
            <>
              {" · "}
              <Link to="/">{t("communities.backHome")}</Link>
            </>
          ) : null}
        </p>
      </div>
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
    <div className="auth-page community-setup-page">
      <div className="auth-card">
        <BrandMark variant="auth" />
        <h1>{t("communities.createTitle")}</h1>
        <p className="muted">{t("communities.createSubtitle")}</p>
        <form onSubmit={onSubmit} className="auth-form">
          <label className="auth-field-group">
            <span className="auth-field-label">{t("communities.name")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder={t("communities.namePlaceholder")}
            />
          </label>
          <label className="auth-field-group">
            <span className="auth-field-label">{t("communities.slug")}</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("communities.slugPlaceholder")}
            />
          </label>
          <label className="auth-field-group">
            <span className="auth-field-label">{t("communities.city")}</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className="auth-field-group">
            <span className="auth-field-label">{t("communities.country")}</span>
            <input value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary" disabled={busy || name.trim().length < 2}>
            {busy ? t("common.loading") : t("communities.createCta")}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/join">{t("communities.orJoin")}</Link>
          {user?.communities?.length ? (
            <>
              {" · "}
              <Link to="/">{t("communities.backHome")}</Link>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function CommunitiesSetup() {
  const { user, refresh } = useAuth();
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const communities = user?.communities ?? [];
  const active = user?.activeCommunity ?? null;

  if (!communities.length) {
    return <Navigate to="/join" replace />;
  }

  async function switchTo(id) {
    await api(`/api/communities/${id}/active`, { method: "POST" });
    await refresh();
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
    <div className="auth-page community-setup-page">
      <div className="auth-card auth-card--wide">
        <BrandMark variant="auth" />
        <h1>{t("communities.manageTitle")}</h1>
        <p className="muted">{t("communities.manageSubtitle")}</p>

        <ul className="community-list">
          {communities.map((community) => (
            <li key={community.id}>
              <div>
                <strong>{community.name}</strong>
                <span className="muted">
                  {community.memberCount != null
                    ? t("communities.memberCount", { count: community.memberCount })
                    : null}
                </span>
              </div>
              {community.id === active?.id ? (
                <span className="community-badge">{t("communities.active")}</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => switchTo(community.id)}
                >
                  {t("communities.switch")}
                </button>
              )}
            </li>
          ))}
        </ul>

        {active?.inviteCode ? (
          <div className="community-invite-box">
            <p className="auth-field-label">{t("communities.inviteFor", { name: active.name })}</p>
            <code>{active.inviteCode}</code>
            <button type="button" className="btn btn-secondary" onClick={copyInvite}>
              {copied ? t("communities.copied") : t("communities.copyInvite")}
            </button>
          </div>
        ) : null}

        <div className="community-setup-actions">
          <Link to="/communities/create" className="btn btn-primary">
            {t("communities.createCta")}
          </Link>
          <Link to="/join" className="btn btn-ghost">
            {t("communities.joinCta")}
          </Link>
          <Link to="/" className="btn btn-ghost">
            {t("communities.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
