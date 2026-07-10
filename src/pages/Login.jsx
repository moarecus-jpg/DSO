import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AtSign,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Shield,
  User,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";
import { BrandMark } from "../components/BrandMark.jsx";

const REMEMBER_USERNAME_KEY = "dso_remember_username";
const LEGACY_REMEMBER_USERNAME_KEY = "dsp_remember_username";

function AuthField({
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
  );
}

function AuthPasswordField({
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  minLength,
}) {
  const [visible, setVisible] = useState(false);

  return (
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
        aria-label={visible ? "Skrij geslo" : "Prikaži geslo"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </label>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState("register");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [rememberMe, setRememberMe] = useState(true);
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(REMEMBER_USERNAME_KEY) ??
        localStorage.getItem(LEGACY_REMEMBER_USERNAME_KEY) ??
        localStorage.getItem("iglarnica_remember_username");
      if (saved) {
        setLoginForm((f) => ({ ...f, username: saved }));
        setRememberMe(true);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ ...loginForm, rememberMe });
      try {
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
      setError(err.message ?? "Prijava ni uspela");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(registerForm);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message ?? "Registracija ni uspela");
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = mode === "register";

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

        <div className="login-heading">
          <h2>{isRegister ? "Ustvari račun" : "Prijava"}</h2>
          <p>
            {isRegister
              ? "Ustvari svoj račun in začni naročati."
              : "Prijavi se v svoj DSO račun."}
          </p>
        </div>

        {error && <p className="login-error">{error}</p>}

        {isRegister ? (
          <form className="login-form login-form-v2" onSubmit={handleRegister}>
            <AuthField
              icon={User}
              value={registerForm.firstName}
              onChange={(e) =>
                setRegisterForm((f) => ({ ...f, firstName: e.target.value }))
              }
              placeholder="Ime"
              required
              autoComplete="given-name"
              autoFocus
            />
            <AuthField
              icon={User}
              value={registerForm.lastName}
              onChange={(e) =>
                setRegisterForm((f) => ({ ...f, lastName: e.target.value }))
              }
              placeholder="Priimek"
              required
              autoComplete="family-name"
            />
            <AuthField
              icon={AtSign}
              value={registerForm.username}
              onChange={(e) =>
                setRegisterForm((f) => ({
                  ...f,
                  username: e.target.value.toLowerCase(),
                }))
              }
              placeholder="marko.novak"
              required
              minLength={3}
              maxLength={32}
              autoComplete="username"
              pattern="[a-z0-9._-]+"
            />
            <AuthPasswordField
              value={registerForm.password}
              onChange={(e) =>
                setRegisterForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="Geslo"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <AuthPasswordField
              value={registerForm.passwordConfirm}
              onChange={(e) =>
                setRegisterForm((f) => ({ ...f, passwordConfirm: e.target.value }))
              }
              placeholder="Ponovi geslo"
              required
              minLength={6}
              autoComplete="new-password"
            />

            <p className="login-hint">
              <Shield size={16} aria-hidden />
              Uporabniško ime se uporablja samo za prijavo.
            </p>

            <button type="submit" className="login-btn-primary" disabled={submitting}>
              <UserPlus size={20} />
              {submitting ? "Ustvarjam…" : "Ustvari račun"}
            </button>

            <button
              type="button"
              className="login-btn-secondary"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              Že imaš račun? <span className="login-link-accent">Prijavi se</span>
            </button>
          </form>
        ) : (
          <form className="login-form login-form-v2" onSubmit={handleLogin}>
            <AuthField
              icon={AtSign}
              value={loginForm.username}
              onChange={(e) =>
                setLoginForm((f) => ({
                  ...f,
                  username: e.target.value.toLowerCase(),
                }))
              }
              placeholder="marko.novak"
              required
              autoComplete="username"
              autoFocus
            />
            <AuthPasswordField
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, password: e.target.value }))
              }
              placeholder="Geslo"
              required
              autoComplete="current-password"
            />

            <label className="login-remember login-remember-v2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Zapomni si me
            </label>

            <button type="submit" className="login-btn-primary" disabled={submitting}>
              <LogIn size={20} />
              {submitting ? "Prijavljam…" : "Prijava"}
            </button>

            <button
              type="button"
              className="login-btn-secondary"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              Nimaš računa? <span className="login-link-accent">Ustvari račun</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
