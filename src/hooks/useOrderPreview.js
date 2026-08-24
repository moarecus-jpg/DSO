import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { isOpenSession, isReopenableSession } from "../../shared/orderStatus.js";
import { useAuth } from "./useAuth.jsx";
import { useMediaQuery } from "./useMediaQuery.js";

const DESKTOP_MQ = "(min-width: 960px)";

export function useOrderPreview(sessions, { onClosed, onReopened } = {}) {
  const { user } = useAuth();
  const isDesktop = useMediaQuery(DESKTOP_MQ);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);

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
    isOpenSession(selectedSession.status) &&
    Boolean(
      user?.isAdmin ||
        (user?.id && selectedSession.created_by === user.id) ||
        detail?.canManageOrder
    );

  const canReopen =
    Boolean(selectedSession) &&
    isReopenableSession(selectedSession.status) &&
    Boolean(
      user?.isAdmin ||
        (user?.id && selectedSession.created_by === user.id) ||
        detail?.canReopen
    );

  const closeOrder = useCallback(
    async (outcome = "ordered") => {
      if (!selectedId) return false;
      setClosing(true);
      try {
        const data = await api(`/api/sessions/${selectedId}/close`, {
          method: "POST",
          body: JSON.stringify({ outcome }),
        });
        clearSelection();
        await onClosed?.(data.session);
        return true;
      } catch (err) {
        setError(err.message ?? "Error");
        return false;
      } finally {
        setClosing(false);
      }
    },
    [selectedId, clearSelection, onClosed]
  );

  const reopenOrder = useCallback(async () => {
    if (!selectedId) return;
    setReopening(true);
    try {
      await api(`/api/sessions/${selectedId}/reopen`, { method: "POST" });
      clearSelection();
      await onReopened?.();
    } catch (err) {
      setError(err.message ?? "Error");
    } finally {
      setReopening(false);
    }
  }, [selectedId, clearSelection, onReopened]);

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
    reopening,
    canClose,
    canReopen,
    selectSession,
    clearSelection,
    closeOrder,
    reopenOrder,
  };
}
