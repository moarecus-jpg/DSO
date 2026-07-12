import { useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function NotificationToggle({ className = "" }) {
  const { user, refresh } = useAuth();
  const { t } = useLocale();
  const [saving, setSaving] = useState(false);

  const canNotify = Boolean(user?.hasRealEmail);
  const active = Boolean(
    user?.notifyNewOrder || user?.notifyOrderNote || user?.notifyOrderClosed
  );

  async function handleChange(enabled) {
    if (!canNotify) return;

    setSaving(true);
    try {
      await api("/auth/me/notifications", {
        method: "PATCH",
        body: JSON.stringify({
          notifyNewOrder: enabled,
          notifyOrderNote: enabled,
          notifyOrderClosed: enabled,
        }),
      });
      await refresh();
    } catch (err) {
      alert(err.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  if (!canNotify) {
    return (
      <Link
        to="/settings"
        className={`sidebar-theme-toggle sidebar-theme-toggle--disabled${
          className ? ` ${className}` : ""
        }`}
        title={t("settings.notificationsNeedEmail")}
      >
        <span className="sidebar-theme-toggle-label">
          <Bell size={16} aria-hidden />
          {t("nav.notifications")}
        </span>
        <span className="sidebar-theme-toggle-track" aria-hidden />
      </Link>
    );
  }

  return (
    <label
      className={`sidebar-theme-toggle${className ? ` ${className}` : ""}`}
      title={t("settings.notificationsHint")}
    >
      <span className="sidebar-theme-toggle-label">
        <Bell size={16} aria-hidden />
        {t("nav.notifications")}
      </span>
      <input
        type="checkbox"
        className="sidebar-theme-toggle-input"
        checked={active}
        disabled={saving}
        onChange={(e) => handleChange(e.target.checked)}
        aria-label={t("nav.notifications")}
      />
      <span className="sidebar-theme-toggle-track" aria-hidden />
    </label>
  );
}
