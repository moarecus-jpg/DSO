import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Info,
  Loader2,
  MessageCircle,
  MessagesSquare,
  MoreVertical,
  Paperclip,
  Pencil,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { HeaderAccount } from "../components/HeaderAccount.jsx";
import { UserAvatar } from "../components/UserAvatar.jsx";
import { api } from "../api.js";
import { useAuth } from "../hooks/useAuth.jsx";
import { useChatSocket } from "../hooks/useChatSocket.js";
import { useLocale } from "../hooks/useLocale.jsx";
import { resolveUserAvatarUrl } from "../utils/userAvatarUrl.js";

const FALLBACK_POLL_MS = 8000;

function memberLabel(user) {
  if (user?.name?.trim()) return user.name.trim();
  if (user?.discogsUsername) return `@${user.discogsUsername}`;
  if (user?.username) return `@${user.username}`;
  return "—";
}

function memberHandle(user) {
  if (user?.discogsUsername) return `@${user.discogsUsername}`;
  if (user?.username) return `@${user.username}`;
  return null;
}

function formatWhen(value, locale) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "sl" ? "sl-SI" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roomTitle(room, communityName) {
  if (!room) return "";
  if (room.kind === "community") return communityName;
  return memberLabel(room.otherUser);
}

function applyIncomingMessage(prev, message) {
  if (!message?.id) return prev;
  const index = prev.findIndex((m) => m.id === message.id);
  if (index >= 0) {
    const next = [...prev];
    next[index] = { ...next[index], ...message };
    return next;
  }
  return [...prev, message];
}

function messagePreviewText(message, t) {
  const body = message?.body?.trim();
  if (body) return body;
  const count = message?.attachments?.length ?? 0;
  if (count > 0) return t("chat.attachmentPreview", { count });
  return "";
}

function applyRoomPreview(prevRooms, roomId, message, activeRoomId, selfId, t) {
  const previewBody = messagePreviewText(message, t);
  const preview = {
    id: message.id,
    body: previewBody || message.body,
    createdAt: message.createdAt,
    senderId: message.sender?.id,
  };
  const existing = prevRooms.find((row) => row.id === roomId);
  if (!existing) {
    return prevRooms;
  }
  const isActive = roomId === activeRoomId;
  const fromOther = message.sender?.id && message.sender.id !== selfId;
  return prevRooms
    .map((row) =>
      row.id === roomId
        ? {
            ...row,
            lastMessage: preview,
            updatedAt: message.createdAt ?? row.updatedAt,
            unreadCount: isActive
              ? 0
              : fromOther
                ? (row.unreadCount || 0) + 1
                : row.unreadCount || 0,
          }
        : row
    )
    .sort((a, b) => {
      if (a.kind === "community" && b.kind !== "community") return -1;
      if (b.kind === "community" && a.kind !== "community") return 1;
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
}

export function Chat() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roomLoading, setRoomLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [viewer, setViewer] = useState(null);
  const [infoMessageId, setInfoMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const dragDepthRef = useRef(0);
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  const communityName =
    user?.activeCommunity?.name ?? t("chat.communityRoom");

  const loadRooms = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await api("/api/chat/rooms");
      setRooms(data.rooms ?? []);
      setError(null);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useChatSocket({
    enabled: Boolean(user),
    onStatus: setLiveConnected,
    onEvent: (event) => {
      if (event?.type === "chat.deleted" && event.roomId) {
        setRooms((prev) => prev.filter((r) => r.id !== event.roomId));
        if (roomIdRef.current === event.roomId) {
          navigate("/chat");
        }
        return;
      }
      if (event?.type === "chat.cleared" && event.roomId) {
        if (roomIdRef.current === event.roomId) {
          setMessages([]);
          if (event.room) setActiveRoom(event.room);
        }
        setRooms((prev) =>
          prev.map((row) =>
            row.id === event.roomId
              ? {
                  ...row,
                  ...(event.room ?? {}),
                  lastMessage: null,
                  unreadCount: 0,
                }
              : row
          )
        );
        return;
      }
      if (event?.type === "chat.messageDeleted" && event.messageId) {
        if (roomIdRef.current === event.roomId) {
          setMessages((prev) => prev.filter((m) => m.id !== event.messageId));
        }
        loadRooms({ silent: true });
        return;
      }
      if (event?.type === "chat.room" && event.room) {
        setRooms((prev) => {
          const others = prev.filter((r) => r.id !== event.room.id);
          const next = [event.room, ...others];
          return next.sort((a, b) => {
            if (a.kind === "community" && b.kind !== "community") return -1;
            if (b.kind === "community" && a.kind !== "community") return 1;
            return String(b.updatedAt).localeCompare(String(a.updatedAt));
          });
        });
        return;
      }
      if (event?.type !== "chat.message" || !event.message) return;
      const { roomId: eventRoomId, message } = event;
      if (eventRoomId === roomIdRef.current) {
        setMessages((prev) => applyIncomingMessage(prev, message));
        api(`/api/chat/rooms/${eventRoomId}/read`, { method: "POST" }).catch(
          () => {}
        );
      }
      setRooms((prev) => {
        if (!prev.some((row) => row.id === eventRoomId)) {
          loadRooms({ silent: true });
          return prev;
        }
        return applyRoomPreview(
          prev,
          eventRoomId,
          message,
          roomIdRef.current,
          user?.id,
          t
        );
      });
    },
  });

  useEffect(() => {
    if (liveConnected) return undefined;
    const timer = setInterval(
      () => loadRooms({ silent: true }),
      FALLBACK_POLL_MS
    );
    return () => clearInterval(timer);
  }, [liveConnected, loadRooms]);

  useEffect(() => {
    if (!roomId) {
      setActiveRoom(null);
      setMessages([]);
      return undefined;
    }
    let cancelled = false;
    setRoomLoading(true);
    api(`/api/chat/rooms/${roomId}`)
      .then((data) => {
        if (cancelled) return;
        setActiveRoom(data.room ?? null);
        setMessages(data.messages ?? []);
        setRooms((prev) =>
          prev.map((row) =>
            row.id === roomId
              ? { ...row, unreadCount: 0, ...(data.room ?? {}) }
              : row
          )
        );
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setActiveRoom(null);
          setMessages([]);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setRoomLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || liveConnected) return undefined;
    const timer = setInterval(() => {
      api(`/api/chat/rooms/${roomId}`)
        .then((data) => {
          const incoming = data.messages ?? [];
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const msg of incoming) {
              if (!seen.has(msg.id)) merged.push(msg);
            }
            return merged;
          });
          if (data.room) {
            setActiveRoom((prev) => ({
              ...(prev ?? {}),
              ...data.room,
              unreadCount: 0,
            }));
          }
        })
        .catch(() => {});
    }, FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [roomId, liveConnected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, roomId]);

  const subtitle = useMemo(() => {
    if (loading) return t("common.loading");
    const unread = rooms.reduce((sum, row) => sum + (row.unreadCount || 0), 0);
    const live = liveConnected ? ` · ${t("chat.live")}` : "";
    if (rooms.length === 0) return `${t("chat.empty")}${live}`;
    if (unread > 0) return `${t("chat.unread", { count: unread })}${live}`;
    return `${t("chat.roomCount", { count: rooms.length })}${live}`;
  }, [loading, rooms, t, liveConnected]);

  useEffect(() => {
    setPendingFiles((prev) => {
      for (const file of prev) {
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      }
      return [];
    });
    setDraft("");
    setDragging(false);
    setMenuOpen(false);
    setCapabilities(null);
    setEditingId(null);
    setEditDraft("");
    dragDepthRef.current = 0;
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return undefined;
    let cancelled = false;
    api(`/api/chat/rooms/${roomId}/capabilities`)
      .then((data) => {
        if (!cancelled) setCapabilities(data);
      })
      .catch(() => {
        if (!cancelled) setCapabilities(null);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!viewer) return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") setViewer(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [viewer]);

  const MAX_FILES = 5;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ]);

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setPendingFiles((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= MAX_FILES) {
          setError(t("chat.attachTooMany", { max: MAX_FILES }));
          break;
        }
        if (!ALLOWED_TYPES.has(file.type)) {
          setError(t("chat.attachUnsupported"));
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          setError(t("chat.attachTooLarge"));
          continue;
        }
        next.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
          file,
          previewUrl: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : null,
        });
      }
      return next;
    });
  }

  function removePendingFile(id) {
    setPendingFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  async function openPicker() {
    setPickerOpen(true);
    setMembersLoading(true);
    try {
      const data = await api("/api/chat/members");
      setMembers(data.members ?? []);
    } catch (err) {
      setError(err.message);
      setPickerOpen(false);
    } finally {
      setMembersLoading(false);
    }
  }

  async function startDm(memberId) {
    try {
      const data = await api("/api/chat/dm", {
        method: "POST",
        body: JSON.stringify({ userId: memberId }),
      });
      setPickerOpen(false);
      await loadRooms({ silent: true });
      if (data.room?.id) navigate(`/chat/${data.room.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!roomId || sending) return;
    const text = draft.trim();
    if (!text && pendingFiles.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const data = await api(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          body: text,
          hasAttachments: pendingFiles.length > 0,
        }),
      });
      let message = data.message;
      setMessages((prev) => applyIncomingMessage(prev, message));
      setDraft("");
      const files = [...pendingFiles];
      setPendingFiles([]);
      for (const item of files) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        const uploaded = await api(
          `/api/chat/rooms/${roomId}/messages/${message.id}/attachments`,
          {
            method: "POST",
            headers: {
              "Content-Type": item.file.type || "application/octet-stream",
              "X-File-Name": encodeURIComponent(item.file.name || "file"),
            },
            body: item.file,
          }
        );
        message = uploaded.message;
        setMessages((prev) => applyIncomingMessage(prev, message));
      }
      setRooms((prev) =>
        applyRoomPreview(prev, roomId, message, roomId, user?.id, t)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function onComposeDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setDragging(true);
  }

  function onComposeDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragging(false);
  }

  function onComposeDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function onComposeDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragging(false);
    addFiles(e.dataTransfer?.files);
  }

  function onComposePaste(e) {
    const clipboard = e.clipboardData;
    if (!clipboard) return;

    // Prefer clipboard.files; items often mirror the same paste and would duplicate.
    let raw = Array.from(clipboard.files || []).filter((file) =>
      ALLOWED_TYPES.has(file.type)
    );
    if (!raw.length) {
      for (const item of clipboard.items || []) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (file && ALLOWED_TYPES.has(file.type)) raw.push(file);
      }
    }
    if (!raw.length) return;

    const seen = new Set();
    const files = [];
    for (const file of raw) {
      const key = `${file.type}:${file.size}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ext =
        file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
              ? "webp"
              : file.type === "image/gif"
                ? "gif"
                : file.type === "application/pdf"
                  ? "pdf"
                  : "bin";
      const hasRealName =
        file.name &&
        file.name !== "image.png" &&
        file.name !== "blob" &&
        file.name !== "untitled";
      files.push(
        hasRealName
          ? file
          : new File([file], `paste-${Date.now()}-${files.length + 1}.${ext}`, {
              type: file.type,
              lastModified: file.lastModified || Date.now(),
            })
      );
    }

    if (!files.length) return;
    e.preventDefault();
    addFiles(files);
  }

  async function handleClearChat() {
    if (!roomId || busyAction) return;
    const ok = window.confirm(
      activeRoom?.kind === "community"
        ? t("chat.clearCommunityConfirm")
        : t("chat.clearDmConfirm")
    );
    if (!ok) return;
    setBusyAction("clear");
    setMenuOpen(false);
    setError(null);
    try {
      const data = await api(`/api/chat/rooms/${roomId}/clear`, {
        method: "POST",
      });
      setMessages([]);
      if (data.room) setActiveRoom(data.room);
      setRooms((prev) =>
        prev.map((row) =>
          row.id === roomId
            ? { ...row, ...(data.room ?? {}), lastMessage: null, unreadCount: 0 }
            : row
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteChat() {
    if (!roomId || busyAction) return;
    if (!window.confirm(t("chat.deleteDmConfirm"))) return;
    setBusyAction("delete");
    setMenuOpen(false);
    setError(null);
    try {
      await api(`/api/chat/rooms/${roomId}`, { method: "DELETE" });
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      navigate("/chat");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteMessage(messageId) {
    if (!messageId || busyAction) return;
    if (!window.confirm(t("chat.deleteMessageConfirm"))) return;
    setBusyAction(`msg:${messageId}`);
    setError(null);
    try {
      await api(`/api/chat/messages/${messageId}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      if (editingId === messageId) {
        setEditingId(null);
        setEditDraft("");
      }
      await loadRooms({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
    }
  }

  function startEditMessage(msg) {
    setEditingId(msg.id);
    setEditDraft(msg.body || "");
    setError(null);
  }

  function cancelEditMessage() {
    setEditingId(null);
    setEditDraft("");
  }

  async function saveEditMessage(messageId) {
    if (!messageId || busyAction) return;
    const text = editDraft.trim();
    const current = messages.find((m) => m.id === messageId);
    const hasAttachments = Boolean(current?.attachments?.length);
    if (!text && !hasAttachments) {
      setError(t("chat.editEmpty"));
      return;
    }
    setBusyAction(`edit:${messageId}`);
    setError(null);
    try {
      const data = await api(`/api/chat/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ body: text }),
      });
      setMessages((prev) => applyIncomingMessage(prev, data.message));
      setRooms((prev) =>
        applyRoomPreview(prev, roomId, data.message, roomId, user?.id, t)
      );
      setEditingId(null);
      setEditDraft("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyAction(null);
    }
  }

  const showRoomMenu =
    capabilities?.canClear || capabilities?.canDelete;

  return (
    <div
      className={`page orders-page plac-inbox-page chat-page${
        roomId ? " plac-inbox--thread-open" : ""
      }`}
    >
      <header className="orders-page-header orders-page-header--no-search">
        <div>
          <h1 className="orders-page-title">{t("chat.title")}</h1>
          <p className="orders-page-subtitle">{subtitle}</p>
        </div>
        <div className="orders-page-header-account">
          <HeaderAccount />
        </div>
      </header>

      {error ? (
        <p className="banner banner-warn" role="alert">
          {error}
        </p>
      ) : null}

      <div className={`plac-inbox${roomId ? " plac-inbox--thread-open" : ""}`}>
        <aside className="plac-inbox-list">
          <div className="chat-list-actions">
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={openPicker}
            >
              <MessageCircle size={16} strokeWidth={2.1} aria-hidden />
              {t("chat.newDm")}
            </button>
          </div>

          {loading ? (
            <p className="muted plac-inbox-no-threads">{t("common.loading")}</p>
          ) : rooms.length === 0 ? (
            <p className="muted plac-inbox-no-threads">{t("chat.empty")}</p>
          ) : (
            rooms.map((room) => {
              const isCommunity = room.kind === "community";
              const avatarUser = isCommunity ? null : room.otherUser;
              return (
                <button
                  key={room.id}
                  type="button"
                  className={`plac-inbox-thread${
                    room.id === roomId ? " is-active" : ""
                  }${room.unreadCount > 0 ? " has-unread" : ""}`}
                  onClick={() => navigate(`/chat/${room.id}`)}
                >
                  {isCommunity ? (
                    <span
                      className="plac-inbox-thumb plac-inbox-thumb--empty chat-room-icon"
                      aria-hidden
                    >
                      <Users size={18} strokeWidth={2} />
                    </span>
                  ) : (
                    <UserAvatar
                      name={memberLabel(avatarUser)}
                      avatarUrl={resolveUserAvatarUrl(avatarUser)}
                      size={40}
                      className="plac-inbox-thumb"
                    />
                  )}
                  <span className="plac-inbox-thread-body">
                    <span className="plac-inbox-thread-top">
                      <span className="plac-inbox-thread-name">
                        {isCommunity
                          ? communityName
                          : memberLabel(room.otherUser)}
                      </span>
                      {room.unreadCount > 0 ? (
                        <span className="plac-inbox-unread">
                          {room.unreadCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="plac-inbox-thread-listing">
                      {isCommunity
                        ? t("chat.communityRoomHint")
                        : memberHandle(room.otherUser) ||
                          t("chat.directMessage")}
                    </span>
                    <span className="plac-inbox-thread-preview">
                      {room.lastMessage?.body || t("chat.noMessagesYet")}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </aside>

        <section className="plac-inbox-pane">
          {!roomId ? (
            <div className="plac-inbox-empty-pane">
              <MessagesSquare size={36} strokeWidth={1.6} aria-hidden />
              <p>{t("chat.pickRoom")}</p>
            </div>
          ) : roomLoading && !activeRoom ? (
            <div className="plac-inbox-empty-pane">
              <Loader2 className="spin" size={28} aria-hidden />
              <p>{t("common.loading")}</p>
            </div>
          ) : (
            <>
              <header className="plac-inbox-pane-head">
                <div className="plac-inbox-pane-user">
                  {activeRoom?.kind === "community" ? (
                    <span
                      className="plac-inbox-thumb plac-inbox-thumb--empty chat-room-icon"
                      aria-hidden
                    >
                      <Users size={18} strokeWidth={2} />
                    </span>
                  ) : (
                    <UserAvatar
                      name={memberLabel(activeRoom?.otherUser)}
                      avatarUrl={resolveUserAvatarUrl(activeRoom?.otherUser)}
                      size={40}
                    />
                  )}
                  <div>
                    <p className="plac-inbox-pane-name">
                      {roomTitle(activeRoom, communityName)}
                    </p>
                    <p className="muted plac-inbox-pane-listing">
                      {activeRoom?.kind === "community"
                        ? t("chat.communityRoomHint")
                        : memberHandle(activeRoom?.otherUser) ||
                          t("chat.directMessage")}
                    </p>
                  </div>
                </div>
                <div className="chat-pane-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-small chat-back-mobile"
                    onClick={() => navigate("/chat")}
                  >
                    {t("nav.back")}
                  </button>
                  {showRoomMenu ? (
                    <div className="chat-room-menu" ref={menuRef}>
                      <button
                        type="button"
                        className="chat-room-menu-trigger"
                        aria-label={t("chat.roomMenu")}
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((open) => !open)}
                      >
                        <MoreVertical size={18} strokeWidth={2.1} />
                      </button>
                      {menuOpen ? (
                        <div className="chat-room-menu-panel" role="menu">
                          {capabilities?.canClear ? (
                            <button
                              type="button"
                              role="menuitem"
                              disabled={Boolean(busyAction)}
                              onClick={handleClearChat}
                            >
                              <Trash2 size={15} strokeWidth={2} aria-hidden />
                              {t("chat.clearHistory")}
                            </button>
                          ) : null}
                          {capabilities?.canDelete ? (
                            <button
                              type="button"
                              role="menuitem"
                              className="is-danger"
                              disabled={Boolean(busyAction)}
                              onClick={handleDeleteChat}
                            >
                              <Trash2 size={15} strokeWidth={2} aria-hidden />
                              {t("chat.deleteConversation")}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </header>

              <div className="plac-inbox-messages">
                {messages.length === 0 ? (
                  <p className="muted center">{t("chat.noMessagesYet")}</p>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender?.id === user?.id;
                    const canDeleteMsg =
                      mine || Boolean(capabilities?.canModerateMessages);
                    const isEditing = editingId === msg.id;
                    const showInfo = infoMessageId === msg.id;
                    const showActions = !isEditing;
                    const showSender =
                      !mine && activeRoom?.kind === "community";
                    return (
                      <div
                        key={msg.id}
                        className={`plac-inbox-bubble${
                          mine ? " plac-inbox-bubble--mine" : ""
                        }${isEditing ? " is-editing" : ""}`}
                      >
                        {showSender || showActions ? (
                          <div
                            className={`chat-bubble-top${
                              showSender ? "" : " chat-bubble-top--actions-only"
                            }`}
                          >
                            {showSender ? (
                              <span className="chat-bubble-sender">
                                {memberLabel(msg.sender)}
                              </span>
                            ) : null}
                            {showActions ? (
                              <div className="chat-bubble-actions">
                                <button
                                  type="button"
                                  className={`chat-bubble-action${
                                    showInfo ? " is-active" : ""
                                  }`}
                                  aria-label={t("chat.messageInfo")}
                                  aria-pressed={showInfo}
                                  onClick={() =>
                                    setInfoMessageId((current) =>
                                      current === msg.id ? null : msg.id
                                    )
                                  }
                                >
                                  <Info size={13} strokeWidth={2} />
                                </button>
                                {mine ? (
                                  <button
                                    type="button"
                                    className="chat-bubble-action"
                                    aria-label={t("chat.editMessage")}
                                    disabled={Boolean(busyAction)}
                                    onClick={() => startEditMessage(msg)}
                                  >
                                    <Pencil size={13} strokeWidth={2} />
                                  </button>
                                ) : null}
                                {canDeleteMsg ? (
                                  <button
                                    type="button"
                                    className="chat-bubble-action chat-bubble-action--danger"
                                    aria-label={t("chat.deleteMessage")}
                                    disabled={busyAction === `msg:${msg.id}`}
                                    onClick={() => handleDeleteMessage(msg.id)}
                                  >
                                    <Trash2 size={13} strokeWidth={2} />
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {isEditing ? (
                          <div className="chat-bubble-edit">
                            <textarea
                              className="chat-bubble-edit-input"
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              maxLength={2000}
                              rows={3}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  cancelEditMessage();
                                }
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  saveEditMessage(msg.id);
                                }
                              }}
                            />
                            <div className="chat-bubble-edit-actions">
                              <button
                                type="button"
                                className="btn btn-ghost btn-small"
                                onClick={cancelEditMessage}
                                disabled={busyAction === `edit:${msg.id}`}
                              >
                                {t("common.cancel")}
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-small"
                                onClick={() => saveEditMessage(msg.id)}
                                disabled={busyAction === `edit:${msg.id}`}
                              >
                                {busyAction === `edit:${msg.id}` ? (
                                  <Loader2 className="spin" size={14} />
                                ) : (
                                  t("chat.saveEdit")
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {msg.body ? <p>{msg.body}</p> : null}
                            {msg.attachments?.length ? (
                              <div className="chat-bubble-attachments">
                                {msg.attachments.map((file) =>
                                  file.mimeType?.startsWith("image/") ? (
                                    <button
                                      key={file.id}
                                      type="button"
                                      className="chat-bubble-image"
                                      onClick={() => setViewer(file)}
                                      aria-label={file.fileName || t("chat.openAttachment")}
                                    >
                                      <img src={file.url} alt={file.fileName || ""} />
                                    </button>
                                  ) : (
                                    <button
                                      key={file.id}
                                      type="button"
                                      className="chat-bubble-file"
                                      onClick={() => setViewer(file)}
                                    >
                                      <FileText size={16} strokeWidth={2} />
                                      <span>{file.fileName}</span>
                                    </button>
                                  )
                                )}
                              </div>
                            ) : null}
                            {showInfo ? (
                              <time dateTime={msg.editedAt || msg.createdAt}>
                                {formatWhen(msg.createdAt, locale)}
                                {msg.editedAt ? ` · ${t("chat.edited")}` : ""}
                              </time>
                            ) : null}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                className={`chat-compose${dragging ? " is-dragging" : ""}`}
                onSubmit={handleSend}
                onDragEnter={onComposeDragEnter}
                onDragLeave={onComposeDragLeave}
                onDragOver={onComposeDragOver}
                onDrop={onComposeDrop}
              >
                {dragging ? (
                  <div className="chat-compose-drop" aria-hidden>
                    <Paperclip size={22} strokeWidth={2} />
                    <span>{t("chat.dropHere")}</span>
                  </div>
                ) : null}

                {pendingFiles.length > 0 ? (
                  <ul className="chat-compose-files">
                    {pendingFiles.map((item) => (
                      <li key={item.id} className="chat-compose-file">
                        {item.previewUrl ? (
                          <img src={item.previewUrl} alt="" />
                        ) : (
                          <span className="chat-compose-file-icon" aria-hidden>
                            <FileText size={16} />
                          </span>
                        )}
                        <span className="chat-compose-file-name">
                          {item.file.name}
                        </span>
                        <button
                          type="button"
                          className="chat-compose-file-remove"
                          onClick={() => removePendingFile(item.id)}
                          aria-label={t("common.close")}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="chat-compose-shell">
                  <button
                    type="button"
                    className="chat-compose-attach"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || pendingFiles.length >= MAX_FILES}
                    aria-label={t("chat.attach")}
                    title={t("chat.attachHint")}
                  >
                    <Paperclip size={18} strokeWidth={2.1} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    multiple
                    onChange={(e) => {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <textarea
                    className="chat-compose-input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onPaste={onComposePaste}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    placeholder={t("chat.composePlaceholder")}
                    maxLength={2000}
                    rows={1}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="chat-compose-send"
                    disabled={
                      sending || (!draft.trim() && pendingFiles.length === 0)
                    }
                    aria-label={t("chat.send")}
                  >
                    {sending ? (
                      <Loader2 className="spin" size={18} />
                    ) : (
                      <Send size={18} strokeWidth={2.1} />
                    )}
                  </button>
                </div>
                <p className="chat-compose-hint muted fine">
                  {t("chat.composeHint")}
                </p>
              </form>
            </>
          )}
        </section>
      </div>

      {pickerOpen ? (
        <div
          className="chat-picker-backdrop"
          role="presentation"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="chat-picker"
            role="dialog"
            aria-modal="true"
            aria-label={t("chat.newDm")}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="chat-picker-head">
              <h2>{t("chat.newDm")}</h2>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setPickerOpen(false)}
                aria-label={t("common.close")}
              >
                <X size={18} />
              </button>
            </header>
            {membersLoading ? (
              <p className="muted center">{t("common.loading")}</p>
            ) : members.length === 0 ? (
              <p className="muted center">{t("chat.noMembers")}</p>
            ) : (
              <ul className="chat-picker-list">
                {members.map((member) => (
                  <li key={member.id}>
                    <button type="button" onClick={() => startDm(member.id)}>
                      <UserAvatar
                        name={memberLabel(member)}
                        avatarUrl={resolveUserAvatarUrl(member)}
                        size={36}
                      />
                      <span>
                        <strong>{memberLabel(member)}</strong>
                        {memberHandle(member) ? (
                          <span className="muted">{memberHandle(member)}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {viewer
        ? createPortal(
            <div
              className="chat-attachment-lightbox"
              role="presentation"
              onClick={() => setViewer(null)}
            >
              <div
                className="chat-attachment-lightbox-panel"
                role="dialog"
                aria-modal="true"
                aria-label={viewer.fileName || t("chat.openAttachment")}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="chat-attachment-lightbox-close"
                  onClick={() => setViewer(null)}
                  aria-label={t("common.close")}
                >
                  <X size={20} />
                </button>
                {viewer.mimeType?.startsWith("image/") ? (
                  <img
                    className="chat-attachment-lightbox-image"
                    src={viewer.url}
                    alt={viewer.fileName || ""}
                  />
                ) : (
                  <iframe
                    className="chat-attachment-lightbox-frame"
                    src={viewer.url}
                    title={viewer.fileName || t("chat.openAttachment")}
                  />
                )}
                {viewer.fileName ? (
                  <p className="chat-attachment-lightbox-name">{viewer.fileName}</p>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
