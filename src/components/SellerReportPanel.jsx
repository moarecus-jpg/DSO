import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, MailCheck, RotateCcw } from "lucide-react";
import { buildSellerMessage } from "../../shared/orderReview.js";
import { useLocale } from "../hooks/useLocale.jsx";

function formatSentAt(value, localeTag) {
  if (!value) return "";
  const d = new Date(String(value).includes("T") ? value : `${value}Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(localeTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SellerReportPanel({
  session,
  senderName,
  sellerUrl,
  marking = false,
  onMarkSent,
}) {
  const { t, localeTag } = useLocale();
  const generated = useMemo(
    () =>
      buildSellerMessage({
        session,
        issues: session.issues ?? [],
        senderName,
      }),
    [session, senderName]
  );
  const [draft, setDraft] = useState(generated ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(generated ?? "");
  }, [generated]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!generated) return null;

  const sentAt = session.seller_report_sent_at;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      alert(t("session.sellerMessageCopyFailed"));
    }
  }

  return (
    <div className="seller-report card">
      <div className="order-review-header">
        <MailCheck size={18} aria-hidden />
        <h2 className="order-review-title">{t("session.sellerMessageTitle")}</h2>
        {sentAt && (
          <span className="seller-report-sent">
            <Check size={13} aria-hidden />
            {t("session.sellerMessageSentOn", {
              date: formatSentAt(sentAt, localeTag),
            })}
          </span>
        )}
      </div>
      <p className="muted fine order-review-hint">{t("session.sellerMessageHint")}</p>

      <textarea
        className="order-notes-input seller-report-text"
        rows={14}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        spellCheck={false}
      />

      <div className="seller-report-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={handleCopy}>
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          {copied ? t("session.sellerMessageCopied") : t("session.sellerMessageCopy")}
        </button>
        {sellerUrl && (
          <a
            href={sellerUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-small"
          >
            <ExternalLink size={14} aria-hidden />
            {t("session.sellerMessageOpenSeller")}
          </a>
        )}
        {draft !== generated && (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => setDraft(generated)}
          >
            <RotateCcw size={14} aria-hidden />
            {t("session.sellerMessageRegenerate")}
          </button>
        )}
        {onMarkSent && (
          <button
            type="button"
            className="btn btn-ghost btn-small seller-report-mark"
            onClick={() => onMarkSent(!sentAt)}
            disabled={marking}
          >
            <MailCheck size={14} aria-hidden />
            {sentAt
              ? t("session.sellerMessageUnmark")
              : t("session.sellerMessageMarkSent")}
          </button>
        )}
      </div>
    </div>
  );
}
