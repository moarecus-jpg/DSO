import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Users } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useLocale } from "../hooks/useLocale.jsx";

export function CommunitySwitcher({ compact = false }) {
  const { user, refresh } = useAuth();
  const { t } = useLocale();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const communities = user?.communities ?? [];
  const active = user?.activeCommunity ?? communities[0] ?? null;

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!communities.length) return null;

  async function switchTo(id) {
    if (!id || id === active?.id || busy) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/communities/${id}/active`, { method: "POST" });
      await refresh();
      setOpen(false);
      window.location.assign("/");
    } catch (err) {
      setError(err.message ?? t("communities.switchError"));
      setBusy(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className={`community-switcher community-switcher--header${
        compact ? " community-switcher--compact" : ""
      }`}
    >
      <button
        type="button"
        className="community-switcher-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={active?.name ?? t("communities.label")}
        onClick={() => setOpen((v) => !v)}
      >
        <Users size={14} strokeWidth={2.2} aria-hidden />
        <span className="community-switcher-name">
          {active?.name ?? t("communities.label")}
        </span>
        <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
      </button>
      {open ? (
        <div className="community-switcher-menu" role="listbox">
          {communities.map((community) => (
            <button
              key={community.id}
              type="button"
              role="option"
              aria-selected={community.id === active?.id}
              className={`community-switcher-option${
                community.id === active?.id ? " is-active" : ""
              }`}
              disabled={busy}
              onClick={() => switchTo(community.id)}
            >
              {community.name}
            </button>
          ))}
          <Link
            to="/communities"
            className="community-switcher-manage"
            onClick={() => setOpen(false)}
          >
            {t("communities.manage")}
          </Link>
          {error ? <p className="community-switcher-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
