import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Disc3, ExternalLink, Unplug } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";
import { useTheme } from "../hooks/useTheme.jsx";
import { LanguageToggle } from "../components/LanguageToggle.jsx";

function discogsCallbackFallback() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/discogs/callback`;
  }
  return "http://localhost:5173/auth/discogs/callback";
}

export function Settings() {
  const { user, refresh } = useAuth();
  const { t } = useLocale();
  const { darkMode, setDarkMode } = useTheme();
  const [params] = useSearchParams();
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("ok");
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    const discogs = params.get("discogs");
    const callback = health?.discogsCallbackUrl ?? discogsCallbackFallback();

    if (discogs === "connected") {
      setMessageType("ok");
      setMessage(
        params.get("mock") === "1"
          ? t("settings.connectedMock")
          : t("settings.connected")
      );
      refresh();
    } else if (discogs === "error") {
      setMessageType("warn");
      const reason = params.get("reason");

      if (reason === "session") {
        setMessage(t("settings.sessionError"));
      } else if (reason === "start") {
        setMessage(
          <>
            {t("settings.startError")} <code>{callback}</code>
          </>
        );
      } else if (reason === "callback") {
        setMessage(
          <>
            {t("settings.callbackError")} <code>{callback}</code>
          </>
        );
      } else {
        setMessage(
          <>
            {t("settings.genericError")} <code>{callback}</code>.{" "}
            {t("settings.genericErrorRetry")}
          </>
        );
      }
    } else if (discogs === "nokeys") {
      setMessageType("warn");
      setMessage(t("settings.noKeys"));
    }
  }, [params, refresh, health, t]);

  async function disconnect() {
    await api("/auth/discogs/disconnect", { method: "POST" });
    await refresh();
    setMessageType("ok");
    setMessage(t("settings.disconnected"));
  }

  const discogsReady = health?.discogsConfigured === true;

  return (
    <div className="page page-settings">
      <h1>{t("settings.title")}</h1>

      {message && (
        <div className={`banner ${messageType === "warn" ? "banner-warn" : "banner-ok"}`}>
          {message}
        </div>
      )}

      <div className="card settings-card">
        <h2>{t("language.label")}</h2>
        <LanguageToggle />
      </div>

      <div className="card settings-card">
        <h2>{t("nav.darkMode")}</h2>
        <label className="settings-theme-toggle">
          <span>{t("nav.darkMode")}</span>
          <input
            type="checkbox"
            className="sidebar-theme-toggle-input"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
          />
          <span className="sidebar-theme-toggle-track" aria-hidden />
        </label>
      </div>

      <div className="card settings-card">
        <h2>{t("settings.privacyTitle")}</h2>
        <p className="muted settings-privacy-hint">{t("settings.privacyHint")}</p>
        <label className="settings-theme-toggle">
          <span>{t("settings.hideMyRecords")}</span>
          <input
            type="checkbox"
            className="sidebar-theme-toggle-input"
            checked={Boolean(user?.hideMyRecords)}
            onChange={async (e) => {
              const hideMyRecords = e.target.checked;
              try {
                await api("/auth/me/privacy", {
                  method: "PATCH",
                  body: JSON.stringify({ hideMyRecords }),
                });
                await refresh();
                setMessageType("ok");
                setMessage(
                  hideMyRecords
                    ? t("settings.hideMyRecordsEnabled")
                    : t("settings.hideMyRecordsDisabled")
                );
              } catch (err) {
                setMessageType("warn");
                setMessage(err.message ?? t("common.error"));
              }
            }}
          />
          <span className="sidebar-theme-toggle-track" aria-hidden />
        </label>
      </div>

      <div className="card settings-card">
        <h2>{t("settings.account")}</h2>
        <p>
          <strong>{user?.name}</strong>
        </p>
        {user?.username && (
          <p className="muted">
            {t("settings.usernameLabel")} <code>{user.username}</code>
          </p>
        )}
      </div>

      <div className="card settings-card">
        <h2>
          <Disc3 size={20} /> {t("settings.discogsAccount")}
        </h2>
        {user?.discogsConnected ? (
          <>
            <p>
              {t("settings.connectedAs")} <strong>@{user.discogsUsername}</strong>
            </p>
            <p className="muted">{t("settings.connectedHint")}</p>
            <button type="button" className="btn btn-ghost" onClick={disconnect}>
              <Unplug size={16} /> {t("settings.disconnect")}
            </button>
          </>
        ) : (
          <>
            <p className="muted">{t("settings.connectHint")}</p>
            {discogsReady ? (
              <>
                <a href="/auth/discogs" className="btn btn-primary">
                  {t("settings.connect")}
                </a>
                <p className="fine-print muted">{t("settings.connectFine")}</p>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-primary" disabled>
                  {t("settings.connect")}
                </button>
                <p className="fine-print muted">
                  {t("settings.keysHint")}{" "}
                  <code>{health?.discogsCallbackUrl ?? discogsCallbackFallback()}</code>
                </p>
                {health?.mockAuth && (
                  <p className="fine-print muted">
                    {t("settings.demoHint")}{" "}
                    <a href="/auth/discogs" className="discogs-inline-link">
                      {t("settings.demoLink")}
                    </a>{" "}
                    {t("settings.demoData")}
                  </p>
                )}
              </>
            )}
            <p className="fine-print muted">
              <a
                href="https://www.discogs.com/settings/developers"
                target="_blank"
                rel="noreferrer"
                className="discogs-inline-link"
              >
                Discogs Developer
                <ExternalLink size={12} style={{ marginLeft: 4 }} />
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
