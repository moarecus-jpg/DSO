import { useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function NotificationToggle({ className = "", variant = "sidebar" }) {
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
    if (variant === "icon") {
      return (
        <Link
          to="/settings"
          className={`mobile-topbar-icon-btn${className ? ` ${className}` : ""}`}
          aria-label={t("nav.notifications")}
          title={t("settings.notificationsNeedEmail")}
        >
          <Bell size={18} aria-hidden />
        </Link>
      );
    }

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

  if (variant === "icon") {
    return (
      <button
        type="button"
        className={`mobile-topbar-icon-btn${
          active ? " mobile-topbar-icon-btn--active" : ""
        }${className ? ` ${className}` : ""}`}
        onClick={() => handleChange(!active)}
        disabled={saving}
        aria-label={t("nav.notifications")}
        aria-pressed={active}
        title={t("settings.notificationsHint")}
      >
        <Bell size={18} aria-hidden />
      </button>
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
