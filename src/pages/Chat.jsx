import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  MessageCircle,
  MessagesSquare,
  Send,
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
  if (user?.discogsUsername) return `@${user.discogsUsername}`;
  if (user?.username) return `@${user.username}`;
  return user?.name ?? "—";
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
  if (prev.some((m) => m.id === message.id)) return prev;
  return [...prev, message];
}

function applyRoomPreview(prevRooms, roomId, message, activeRoomId, selfId) {
  const preview = {
    id: message.id,
    body: message.body,
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
  const messagesEndRef = useRef(null);
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
          user?.id
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
    if (!roomId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const data = await api(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      });
      setMessages((prev) => applyIncomingMessage(prev, data.message));
      setDraft("");
      setRooms((prev) =>
        applyRoomPreview(prev, roomId, data.message, roomId, user?.id)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

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
                        : t("chat.directMessage")}
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
                        : t("chat.directMessage")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-small chat-back-mobile"
                  onClick={() => navigate("/chat")}
                >
                  {t("nav.back")}
                </button>
              </header>

              <div className="plac-inbox-messages">
                {messages.length === 0 ? (
                  <p className="muted center">{t("chat.noMessagesYet")}</p>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender?.id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`plac-inbox-bubble${
                          mine ? " plac-inbox-bubble--mine" : ""
                        }`}
                      >
                        {!mine && activeRoom?.kind === "community" ? (
                          <span className="chat-bubble-sender">
                            {memberLabel(msg.sender)}
                          </span>
                        ) : null}
                        <p>{msg.body}</p>
                        <time dateTime={msg.createdAt}>
                          {formatWhen(msg.createdAt, locale)}
                        </time>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="plac-inbox-compose" onSubmit={handleSend}>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("chat.composePlaceholder")}
                  maxLength={2000}
                  disabled={sending}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || !draft.trim()}
                  aria-label={t("chat.send")}
                >
                  {sending ? (
                    <Loader2 className="spin" size={18} />
                  ) : (
                    <Send size={18} strokeWidth={2.1} />
                  )}
                </button>
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
                        {member.name ? (
                          <span className="muted">{member.name}</span>
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
    </div>
  );
}
