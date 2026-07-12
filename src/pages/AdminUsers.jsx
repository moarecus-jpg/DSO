import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { KeyRound, Mail, Search, Shield, Users } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

function formatDate(value, localeTag) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AdminUserRow({ user, onUpdated }) {
  const { t, localeTag } = useLocale();
  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState(user.email ?? "");
  const [resetOpen, setResetOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("ok");

  async function saveEmail(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api(`/auth/admin/users/${user.id}/email`, {
        method: "PATCH",
        body: JSON.stringify({ email: email.trim() }),
      });
      setEditingEmail(false);
      setMessageType("ok");
      setMessage(t("admin.emailSaved"));
      await onUpdated();
    } catch (err) {
      setMessageType("warn");
      setMessage(err.message ?? t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api(`/auth/admin/users/${user.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password, passwordConfirm }),
      });
      setResetOpen(false);
      setPassword("");
      setPasswordConfirm("");
      setMessageType("ok");
      setMessage(t("admin.passwordReset"));
    } catch (err) {
      setMessageType("warn");
      setMessage(err.message ?? t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const authLabel =
    user.authType === "google"
      ? t("admin.authGoogle")
      : user.authType === "local"
        ? t("admin.authLocal")
        : t("admin.authUnknown");

  return (
    <article className="admin-user-card">
      <div className="admin-user-card-head">
        <div>
          <h3>{user.name || user.username || t("admin.unnamedUser")}</h3>
          {user.username && (
            <p className="muted admin-user-meta">
              {t("settings.usernameLabel")} <code>{user.username}</code>
            </p>
          )}
          <p className="muted admin-user-meta">
            {t("admin.registered")} {formatDate(user.createdAt, localeTag)}
          </p>
        </div>
        <span className={`admin-auth-badge admin-auth-badge--${user.authType}`}>
          {authLabel}
        </span>
      </div>

      <div className="admin-user-email-row">
        <Mail size={16} aria-hidden />
        <span className={user.hasRealEmail ? "" : "admin-email-synthetic"}>
          {user.email}
        </span>
        {!user.hasRealEmail && (
          <span className="admin-email-tag">{t("admin.syntheticEmail")}</span>
        )}
      </div>

      {user.discogsUsername && (
        <p className="muted admin-user-meta">
          Discogs @{user.discogsUsername}
        </p>
      )}

      {message && (
        <p className={`admin-user-message admin-user-message--${messageType}`}>
          {message}
        </p>
      )}

      <div className="admin-user-actions">
        {!user.hasRealEmail && (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => {
              setResetOpen(false);
              setEditingEmail((open) => !open);
              setMessage(null);
            }}
          >
            <Mail size={15} aria-hidden />
            {editingEmail ? t("common.cancel") : t("admin.setEmail")}
          </button>
        )}

        {user.authType === "local" && (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => {
              setEditingEmail(false);
              setResetOpen((open) => !open);
              setMessage(null);
            }}
          >
            <KeyRound size={15} aria-hidden />
            {resetOpen ? t("common.cancel") : t("admin.resetPassword")}
          </button>
        )}
      </div>

      {editingEmail && (
        <form className="admin-inline-form" onSubmit={saveEmail}>
          <label>
            <span>{t("auth.email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
            {t("admin.saveEmail")}
          </button>
        </form>
      )}

      {resetOpen && (
        <form className="admin-inline-form" onSubmit={savePassword}>
          <label>
            <span>{t("auth.newPassword")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            <span>{t("auth.passwordConfirm")}</span>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
            {t("admin.savePassword")}
          </button>
        </form>
      )}
    </article>
  );
}

export function AdminUsers() {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const [users, setUsers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  async function loadUsers() {
    setFetching(true);
    setError(null);
    try {
      const data = await api("/auth/admin/users");
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err.message ?? t("common.error"));
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (user?.isAdmin) {
      loadUsers();
    }
  }, [user?.isAdmin]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((entry) => {
      const haystack = [
        entry.name,
        entry.username,
        entry.email,
        entry.discogsUsername,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, query]);

  if (loading) {
    return <p className="muted center page">{t("common.loading")}</p>;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page page-admin-users">
      <div className="admin-users-header">
        <div>
          <h1>
            <Shield size={24} aria-hidden /> {t("admin.title")}
          </h1>
          <p className="muted">{t("admin.subtitle")}</p>
        </div>
        <Link to="/settings" className="btn btn-ghost">
          {t("settings.title")}
        </Link>
      </div>

      <div className="card settings-card admin-users-toolbar">
        <label className="admin-search">
          <Search size={18} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.searchPlaceholder")}
          />
        </label>
        <p className="muted admin-users-count">
          <Users size={16} aria-hidden />
          {t("admin.userCount", { count: filteredUsers.length })}
        </p>
      </div>

      {error && <div className="banner banner-warn">{error}</div>}

      {fetching ? (
        <p className="muted">{t("common.loading")}</p>
      ) : filteredUsers.length === 0 ? (
        <p className="muted">{t("admin.noUsers")}</p>
      ) : (
        <div className="admin-user-list">
          {filteredUsers.map((entry) => (
            <AdminUserRow key={entry.id} user={entry} onUpdated={loadUsers} />
          ))}
        </div>
      )}
    </div>
  );
}
