import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { useLocale } from "../hooks/useLocale.jsx";

function formatNoteTime(createdAt, localeTag) {
  if (!createdAt) return "";
  const d = new Date(createdAt.includes("T") ? createdAt : `${createdAt}Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(localeTag, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderNotes({
  notes = [],
  readOnly = false,
  posting = false,
  onPostNote,
}) {
  const { t, localeTag } = useLocale();
  const [draft, setDraft] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || posting) return;
    const ok = await onPostNote?.(body);
    if (ok) setDraft("");
  }

  return (
    <div className="order-notes card">
      <div className="order-notes-header">
        <MessageSquare size={18} aria-hidden />
        <h2 className="order-notes-title">{t("session.orderNotes")}</h2>
      </div>

      {notes.length === 0 ? (
        <p className="order-notes-empty muted fine">{t("session.noNotes")}</p>
      ) : (
        <ul className="order-notes-list">
          {notes.map((note) => (
            <li key={note.id} className="order-note">
              <div className="order-note-meta">
                <strong className="order-note-author">
                  {note.user_name ?? t("common.unknown")}
                </strong>
                <time className="order-note-time muted fine" dateTime={note.created_at}>
                  {formatNoteTime(note.created_at, localeTag)}
                </time>
              </div>
              <p className="order-note-body">{note.body}</p>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <form className="order-notes-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="order-note-input">
            {t("session.orderNotesPlaceholder")}
          </label>
          <textarea
            id="order-note-input"
            className="order-notes-input"
            rows={3}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("session.orderNotesPlaceholder")}
            disabled={posting}
          />
          <div className="order-notes-form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-small"
              disabled={posting || !draft.trim()}
            >
              <Send size={14} aria-hidden />
              {posting ? t("session.postingNote") : t("session.postNote")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
