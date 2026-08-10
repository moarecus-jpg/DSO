import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "./useAuth.jsx";
import { useLocale } from "./useLocale.jsx";
import { useMediaQuery } from "./useMediaQuery.js";

const DESKTOP_MQ = "(min-width: 960px)";

export function useOrderPreview(sessions, { onClosed } = {}) {
  const { user } = useAuth();
  const { t } = useLocale();
  const isDesktop = useMediaQuery(DESKTOP_MQ);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [closing, setClosing] = useState(false);

  const selectedSession =
    sessions.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !sessions.some((s) => s.id === selectedId)) {
      setSelectedId(null);
      setDetail(null);
      setError(null);
    }
  }, [sessions, selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api(`/api/sessions/${selectedId}`)
      .then((d) => {
        if (!cancelled) setDetail(d.session);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(err.message ?? "Error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (isDesktop || !selectedId) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDesktop, selectedId]);

  const selectSession = useCallback((session) => {
    setSelectedId(session.id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setError(null);
  }, []);

  const canClose =
    Boolean(selectedSession) &&
    selectedSession.status !== "closed" &&
    Boolean(
      user?.isAdmin ||
        (user?.id && selectedSession.created_by === user.id) ||
        detail?.canManageOrder
    );

  const closeOrder = useCallback(async () => {
    if (!selectedId) return;
    if (!window.confirm(t("session.confirmClose"))) return;
    setClosing(true);
    try {
      await api(`/api/sessions/${selectedId}/close`, { method: "POST" });
      clearSelection();
      await onClosed?.();
    } catch (err) {
      setError(err.message ?? "Error");
    } finally {
      setClosing(false);
    }
  }, [selectedId, clearSelection, onClosed, t]);

  return {
    isDesktop,
    /** @deprecated use isDesktop — kept for older call sites */
    previewMode: isDesktop,
    selectedId,
    selectedSession,
    detail,
    loading,
    error,
    closing,
    canClose,
    selectSession,
    clearSelection,
    closeOrder,
  };
}
