import { useEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

export function EditableParticipantName({
  value,
  placeholder,
  canEdit = false,
  onSave,
  className = "",
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const next = draft.trim();
    const current = (value ?? "").trim();
    if (next === current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      /* caller shows alert */
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <span className={`editable-participant editing ${className}`.trim()}>
        <input
          ref={inputRef}
          className="editable-participant-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          maxLength={80}
          disabled={saving}
          aria-label="Ime naročnika"
          placeholder={placeholder ?? "Ime"}
        />
        <button
          type="button"
          className="chip-icon-btn"
          onClick={save}
          disabled={saving}
          title="Shrani"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          className="chip-icon-btn"
          onClick={cancel}
          disabled={saving}
          title="Prekliči"
        >
          <X size={14} />
        </button>
      </span>
    );
  }

  return (
    <span className={`editable-participant ${className}`.trim()}>
      <span className="editable-participant-value">{value ?? "Neznan"}</span>
      {canEdit && (
        <button
          type="button"
          className="chip-icon-btn chip-edit-btn"
          onClick={() => setEditing(true)}
          title="Spremeni ime"
        >
          <Pencil size={12} />
        </button>
      )}
    </span>
  );
}
