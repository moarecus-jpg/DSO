import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { BrandMark } from "../components/BrandMark.jsx";
import { LanguageToggle } from "../components/LanguageToggle.jsx";

function AuthPasswordField({
  label,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  minLength,
  showLabel,
  hideLabel,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field-group">
      <span className="auth-field-label">{label}</span>
      <label className="auth-field">
        <span className="auth-field-icon" aria-hidden>
          <Lock size={18} />
        </span>
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
        />
        <button
          type="button"
          className="auth-field-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </label>
    </div>
  );
}

export function ResetPassword() {
  const { user, loading } = useAuth();
  const { t } = useLocale();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="login-page login-page-v2">
        <p className="muted center page">{t("common.loading")}</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password, passwordConfirm }),
      });
      setDone(true);
    } catch (err) {
      setError(err.message ?? t("auth.resetFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page login-page-v2">
      <div className="layout-glow" aria-hidden>
        <div className="layout-glow-orb layout-glow-orb--violet" />
        <div className="layout-glow-orb layout-glow-orb--indigo" />
      </div>

      <div className="login-card login-card-v2">
        <div className="login-brand">
          <BrandMark variant="login" />
        </div>

        <div className="login-lang-wrap">
          <LanguageToggle className="login-lang-toggle" />
        </div>

        <div className="login-heading">
          <h2>{t("auth.resetTitle")}</h2>
          <p>{done ? t("auth.resetSuccess") : t("auth.resetSubtitle")}</p>
        </div>

        {error && <p className="login-error">{error}</p>}

        {done ? (
          <Link to="/login" className="login-btn-primary login-btn-link">
            <LogIn size={20} />
            {t("auth.signIn")}
          </Link>
        ) : (
          <form className="login-form login-form-v2" onSubmit={handleSubmit}>
            <AuthPasswordField
              label={t("auth.newPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordCreatePlaceholder")}
              required
              minLength={6}
              autoComplete="new-password"
              showLabel={t("common.showPassword")}
              hideLabel={t("common.hidePassword")}
            />
            <AuthPasswordField
              label={t("auth.passwordConfirm")}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder={t("auth.passwordConfirmPlaceholder")}
              required
              minLength={6}
              autoComplete="new-password"
              showLabel={t("common.showPassword")}
              hideLabel={t("common.hidePassword")}
            />

            <button type="submit" className="login-btn-primary" disabled={submitting}>
              {submitting ? t("auth.resetting") : t("auth.resetSubmit")}
            </button>

            <Link to="/login" className="login-btn-secondary login-btn-link">
              {t("auth.backToLogin")}
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
