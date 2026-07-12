import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AtSign,
  Eye,
  EyeOff,
  Info,
  Lock,
  LogIn,
  Mail,
  Shield,
  User,
  UserPlus,
} from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { BrandMark } from "../components/BrandMark.jsx";
import { LanguageToggle } from "../components/LanguageToggle.jsx";

const REMEMBER_USERNAME_KEY = "dso_remember_username";
const REMEMBER_ME_KEY = "dso_remember_me";
const LEGACY_REMEMBER_USERNAME_KEY = "dsp_remember_username";

function AuthField({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  autoFocus,
  minLength,
  maxLength,
  pattern,
}) {
  return (
    <div className="auth-field-group">
      <span className="auth-field-label">{label}</span>
      <label className="auth-field">
        <span className="auth-field-icon" aria-hidden>
          <Icon size={18} />
        </span>
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          minLength={minLength}
          maxLength={maxLength}
          pattern={pattern}
        />
      </label>
    </div>
  );
}

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

export function Login() {
  const navigate = useNavigate();
  const { user, loading, login, register } = useAuth();
  const { t } = useLocale();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    try {
      const savedRemember =
        localStorage.getItem(REMEMBER_ME_KEY) ??
        localStorage.getItem("dso_remember_me");
      if (savedRemember === "false") {
        setRememberMe(false);
      }
      const saved =
        localStorage.getItem(REMEMBER_USERNAME_KEY) ??
        localStorage.getItem(LEGACY_REMEMBER_USERNAME_KEY) ??
        localStorage.getItem("iglarnica_remember_username");
      if (saved) {
        setLoginForm((f) => ({ ...f, username: saved }));
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

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

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ ...loginForm, rememberMe });
      try {
        localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? "true" : "false");
        if (rememberMe) {
          localStorage.setItem(REMEMBER_USERNAME_KEY, loginForm.username.trim());
        } else {
          localStorage.removeItem(REMEMBER_USERNAME_KEY);
        }
      } catch {
        /* ignore */
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message ?? t("auth.loginFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ ...registerForm, rememberMe: true });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message ?? t("auth.registerFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      setForgotSent(true);
    } catch (err) {
      setError(err.message ?? t("auth.forgotFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";

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
          <h2>
            {isForgot
              ? t("auth.forgotTitle")
              : isRegister
                ? t("auth.register")
                : t("auth.login")}
          </h2>
          <p>
            {isForgot
              ? forgotSent
                ? t("auth.forgotSent")
                : t("auth.forgotSubtitle")
              : isRegister
                ? t("auth.registerSubtitle")
                : t("auth.loginSubtitle")}
          </p>
        </div>

        {error && <p className="login-error">{error}</p>}

        {isForgot ? (
          forgotSent ? (
            <button
              type="button"
              className="login-btn-secondary"
              onClick={() => {
                setMode("login");
                setForgotSent(false);
                setError(null);
              }}
            >
              {t("auth.backToLogin")}
            </button>
          ) : (
            <form className="login-form login-form-v2" onSubmit={handleForgot}>
              <AuthField
                label={t("auth.email")}
                icon={Mail}
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                required
                autoComplete="email"
                autoFocus
              />

              <button type="submit" className="login-btn-primary" disabled={submitting}>
                <Mail size={20} />
                {submitting ? t("auth.forgotSending") : t("auth.forgotSubmit")}
              </button>

              <button
                type="button"
                className="login-btn-secondary"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                {t("auth.backToLogin")}
              </button>
            </form>
          )
        ) : isRegister ? (
          <form className="login-form login-form-v2" onSubmit={handleRegister}>
            <AuthField
              label={t("auth.firstName")}
              icon={User}
              value={registerForm.firstName}
              onChange={(e) =>
                setRegisterForm((f) => ({ ...f, firstName: e.target.value }))
              }
              placeholder={t("auth.firstNamePlaceholder")}
              required
              autoComplete="given-name"
              autoFocus
            />
            <AuthField
              label={t("auth.lastName")}
              icon={User}
              value={registerForm.lastName}
              onChange={(e) =>
                setRegisterForm((f) => ({ ...f, lastName: e.target.value }))
              }
              placeholder={t("auth.lastNamePlaceholder")}
              required
              autoComplete="family-name"
            />
            <AuthField
              label={t("auth.usernameForLogin")}
              icon={AtSign}
              value={registerForm.username}
              onChange={(e) =>
                setRegisterForm((f) => ({
                  ...f,
                  username: e.target.value.toLowerCase(),
                }))
              }
              placeholder={t("auth.usernamePlaceholder")}
              required
              minLength={3}
              maxLength={32}
              autoComplete="username"
              pattern="[a-z0-9._-]+"
            />
            <AuthField
              label={t("auth.email")}
              icon={Mail}
              type="email"
              value={registerForm.email}
              onChange={(e) =>
                setRegisterForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder={t("auth.emailPlaceholder")}
              required
              autoComplete="email"
            />
            <AuthPasswordField
              label={t("auth.password")}
              value={registerForm.password}
              onChange={(e) =>
                setRegisterForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder={t("auth.passwordCreatePlaceholder")}
              required
              minLength={6}
              autoComplete="new-password"
              showLabel={t("common.showPassword")}
              hideLabel={t("common.hidePassword")}
            />
            <AuthPasswordField
              label={t("auth.passwordConfirm")}
              value={registerForm.passwordConfirm}
              onChange={(e) =>
                setRegisterForm((f) => ({ ...f, passwordConfirm: e.target.value }))
              }
              placeholder={t("auth.passwordConfirmPlaceholder")}
              required
              minLength={6}
              autoComplete="new-password"
              showLabel={t("common.showPassword")}
              hideLabel={t("common.hidePassword")}
            />

            <p className="login-hint">
              <Info size={16} aria-hidden />
              {t("auth.usernameHint")}
            </p>

            <button type="submit" className="login-btn-primary" disabled={submitting}>
              <UserPlus size={20} />
              {submitting ? t("auth.registering") : t("auth.registerSubmit")}
            </button>

            <button
              type="button"
              className="login-btn-secondary"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              {t("auth.hasAccount")}{" "}
              <span className="login-link-accent">{t("auth.signIn")}</span>
            </button>

            <p className="login-footer-hint">
              <Shield size={16} aria-hidden />
              {t("auth.afterLoginHint")}
            </p>
          </form>
        ) : (
          <form className="login-form login-form-v2" onSubmit={handleLogin}>
            <AuthField
              label={t("auth.username")}
              icon={AtSign}
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm((f) => ({
                  ...f,
                  username: e.target.value.toLowerCase(),
                }))
              }
              placeholder={t("auth.usernamePlaceholder")}
              required
              autoComplete="username"
              autoFocus
            />
            <AuthPasswordField
              label={t("auth.password")}
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder={t("auth.passwordPlaceholder")}
              required
              autoComplete="current-password"
              showLabel={t("common.showPassword")}
              hideLabel={t("common.hidePassword")}
            />

            <label className="login-remember login-remember-v2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              {t("auth.rememberMe")}
            </label>

            <button
              type="button"
              className="login-forgot-link"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setForgotSent(false);
              }}
            >
              {t("auth.forgotPassword")}
            </button>

            <button type="submit" className="login-btn-primary" disabled={submitting}>
              <LogIn size={20} />
              {submitting ? t("auth.loggingIn") : t("auth.loginSubmit")}
            </button>

            <button
              type="button"
              className="login-btn-secondary"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              {t("auth.noAccount")}{" "}
              <span className="login-link-accent">{t("auth.createAccount")}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
