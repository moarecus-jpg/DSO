import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

const DISMISS_KEY = "dso_persistence_banner_dismissed";

export function PersistenceBanner() {
  const { t } = useLocale();
  const [info, setInfo] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setInfo(data.database ?? null))
      .catch(() => setInfo(null));
  }, []);

  if (dismissed || !info || info.persistent) {
    return null;
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="persistence-banner" role="status">
      <AlertTriangle size={18} aria-hidden />
      <div className="persistence-banner-text">
        <strong>{t("settings.persistenceTitle")}</strong>
        <p>{t("settings.persistenceBody", { path: info.recommendedVolumeMount })}</p>
      </div>
      <button
        type="button"
        className="persistence-banner-dismiss"
        onClick={dismiss}
        aria-label={t("common.close")}
      >
        <X size={16} />
      </button>
    </div>
  );
}
