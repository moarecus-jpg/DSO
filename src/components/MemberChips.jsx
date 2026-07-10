import { useEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

export function MemberChips({ members = [], canManage = false, disabled = false, onRename }) {
  return (
    <div className="member-chips">
      {members.map((m) => (
        <MemberChip
          key={m.id}
          member={m}
          canEdit={canManage && !disabled}
          onRename={onRename}
        />
      ))}
    </div>
  );
}

function MemberChip({ member, canEdit, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(member.name ?? "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(member.name ?? "");
  }, [member.name, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    const next = draft.trim();
    const current = (member.name ?? "").trim();
    if (next === current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(member.id, next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(member.name ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="chip chip-editing">
        <input
          ref={inputRef}
          className="chip-name-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          maxLength={80}
          disabled={saving}
          aria-label="Ime sodelujočega"
          placeholder={member.account_name ?? "Ime"}
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
    <span className="chip">
      <span className="chip-name">{member.name}</span>
      {member.discogs_username ? (
        <small>@{member.discogs_username}</small>
      ) : (
        <small className="warn">Discogs ni povezan</small>
      )}
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
