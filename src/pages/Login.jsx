import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { BrandMark } from "../components/BrandMark.jsx";
import { useAuth } from "../hooks/useAuth.jsx";

const REMEMBER_USERNAME_KEY = "dso_remember_username";
const LEGACY_REMEMBER_USERNAME_KEY = "dsp_remember_username";

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

        {mode === "register" ? (

          <form className="login-form" onSubmit={handleRegister}>

            <h2 className="login-form-title">Ustvari račun</h2>

            <label>

              Ime

              <input

                value={registerForm.firstName}

                onChange={(e) =>

                  setRegisterForm((f) => ({ ...f, firstName: e.target.value }))

                }

                required

                autoComplete="given-name"

                autoFocus

              />

            </label>

            <label>

              Priimek

              <input

                value={registerForm.lastName}

                onChange={(e) =>

                  setRegisterForm((f) => ({ ...f, lastName: e.target.value }))

                }

                required

                autoComplete="family-name"

              />

            </label>

            <label>

              Uporabniško ime (za prijavo)

              <input

                value={registerForm.username}

                onChange={(e) =>

                  setRegisterForm((f) => ({

                    ...f,

                    username: e.target.value.toLowerCase(),

                  }))

                }

                required

                minLength={3}

                maxLength={32}

                autoComplete="username"

                pattern="[a-z0-9._-]+"

                placeholder="npr. marko.novak"

              />

            </label>

            <label>

              Geslo

              <input

                type="password"

                value={registerForm.password}

                onChange={(e) =>

                  setRegisterForm((f) => ({ ...f, password: e.target.value }))

                }

                required

                minLength={6}

                autoComplete="new-password"

              />

            </label>

            <label>

              Ponovi geslo

              <input

                type="password"

                value={registerForm.passwordConfirm}

                onChange={(e) =>

                  setRegisterForm((f) => ({ ...f, passwordConfirm: e.target.value }))

                }

                required

                minLength={6}

                autoComplete="new-password"

              />

            </label>

            <p className="fine-print muted">

              Uporabniško ime uporabiš samo pri prijavi v aplikacijo.

            </p>

            <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>

              {submitting ? "Ustvarjam…" : "Ustvari račun"}

            </button>

            <button

              type="button"

              className="btn btn-ghost login-switch"

              onClick={() => {

                setMode("login");

                setError(null);

              }}

            >

              Že imaš račun? Prijavi se

            </button>

          </form>

        ) : (

          <form className="login-form" onSubmit={handleLogin}>

            <h2 className="login-form-title">Prijava</h2>

            <label>

              Uporabniško ime

              <input

                value={loginForm.username}

                onChange={(e) =>

                  setLoginForm((f) => ({

                    ...f,

                    username: e.target.value.toLowerCase(),

                  }))

                }

                required

                autoComplete="username"

                autoFocus

                placeholder="tvoje uporabniško ime"

              />

            </label>

            <label>

              Geslo

              <input

                type="password"

                value={loginForm.password}

                onChange={(e) =>

                  setLoginForm((f) => ({ ...f, password: e.target.value }))

                }

                required

                autoComplete="current-password"

              />

            </label>

            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Zapomni si me
            </label>

            <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>

              {submitting ? "Prijavljam…" : "Prijava"}

            </button>

            <button

              type="button"

              className="btn btn-ghost login-switch"

              onClick={() => {

                setMode("register");

                setError(null);

              }}

            >

              Ustvari račun

            </button>

          </form>

        )}



        {error && (

          <p className="login-error">

            {error}

          </p>

        )}



        <p className="fine-print muted login-footnote">

          Po prijavi lahko v <span className="login-footnote-muted">nastavitvah</span> povežeš Discogs profil.

        </p>

      </div>

    </div>

  );

}

