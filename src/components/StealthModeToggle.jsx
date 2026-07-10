import { useState } from "react";
import { EyeOff } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function StealthModeToggle({ className = "" }) {
  const { user, refresh } = useAuth();
  const { t } = useLocale();
  const [saving, setSaving] = useState(false);

  async function handleChange(hideMyRecords) {
    setSaving(true);
    try {
      await api("/auth/me/privacy", {
        method: "PATCH",
        body: JSON.stringify({ hideMyRecords }),
      });
      await refresh();
    } catch (err) {
      alert(err.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <label
      className={`sidebar-theme-toggle${className ? ` ${className}` : ""}`}
      title={t("settings.privacyHint")}
    >
      <span className="sidebar-theme-toggle-label">
        <EyeOff size={16} aria-hidden />
        {t("nav.stealthMode")}
      </span>
      <input
        type="checkbox"
        className="sidebar-theme-toggle-input"
        checked={Boolean(user?.hideMyRecords)}
        disabled={saving}
        onChange={(e) => handleChange(e.target.checked)}
        aria-label={t("nav.stealthMode")}
      />
      <span className="sidebar-theme-toggle-track" aria-hidden />
    </label>
  );
}
