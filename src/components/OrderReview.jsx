import { AlertOctagon, ClipboardList, Trash2 } from "lucide-react";
import { issueItemLabel, issuesForLink } from "../../shared/orderReview.js";
import { formatGrading } from "../../shared/orderTotals.js";
import { useLocale } from "../hooks/useLocale.jsx";

function formatIssueTime(createdAt, localeTag) {
  if (!createdAt) return "";
  const raw = String(createdAt);
  const d = new Date(raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(localeTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function IssueCard({ issue, sessionId, canDelete, deleting, onDelete, t, localeTag }) {
  const actual = [
    issue.actual_media_condition
      ? t("session.reviewActualMediaShort", { grade: issue.actual_media_condition })
      : null,
    issue.actual_sleeve_condition
      ? t("session.reviewActualSleeveShort", { grade: issue.actual_sleeve_condition })
      : null,
  ].filter(Boolean);

  return (
    <li className="order-issue">
      <div className="order-issue-head">
        <span className="order-issue-type">
          <AlertOctagon size={14} aria-hidden />
          {t(`session.issueType.${issue.issue_type}`)}
        </span>
        <span className="order-issue-resolution">
          {t(`session.resolution.${issue.resolution}`)}
        </span>
        {canDelete && (
          <button
            type="button"
            className="order-issue-delete"
            onClick={() => onDelete?.(issue)}
            disabled={deleting}
            aria-label={t("session.reviewDelete")}
            title={t("session.reviewDelete")}
          >
            <Trash2 size={14} aria-hidden />
          </button>
        )}
      </div>

      {actual.length > 0 && (
        <p className="order-issue-actual muted fine">{actual.join(" · ")}</p>
      )}
      {issue.body && <p className="order-issue-body">{issue.body}</p>}

      {issue.photos?.length > 0 && (
        <div className="order-issue-photo-row">
          {issue.photos.map((photo) => {
            const src = `/api/sessions/${sessionId}/issues/${issue.id}/photos/${photo.id}`;
            return (
              <a
                key={photo.id}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="order-issue-photo"
              >
                <img src={src} alt={t("session.reviewPhotoAlt")} loading="lazy" />
              </a>
            );
          })}
        </div>
      )}

      <p className="order-issue-meta muted fine">
        {issue.user_name ?? t("common.unknown")} ·{" "}
        {formatIssueTime(issue.created_at, localeTag)}
      </p>
    </li>
  );
}

/** Summary of reported items — reporting happens inline on each item row. */
export function OrderReview({
  session,
  currentUserId,
  deletingIssueId = null,
  onDeleteIssue,
}) {
  const { t, localeTag } = useLocale();

  const links = session.links ?? [];
  const issues = session.issues ?? [];
  const isOrderAdmin = Boolean(session.canManageOrder);
  const reportedLinkIds = new Set(issues.map((issue) => issue.link_id));
  const linksWithIssues = links.filter((link) => reportedLinkIds.has(link.id));

  if (linksWithIssues.length === 0) return null;

  return (
    <div className="order-review card">
      <div className="order-review-header">
        <ClipboardList size={18} aria-hidden />
        <h2 className="order-review-title">{t("session.reviewTitle")}</h2>
        <span className="order-review-count">
          {t("session.reviewReportedCount", {
            count: linksWithIssues.length,
            total: links.length,
          })}
        </span>
      </div>

      <ul className="order-review-items">
        {linksWithIssues.map((link) => (
          <li key={link.id} className="order-review-item">
            <div className="order-review-item-head">
              <strong className="order-review-item-title">
                {issueItemLabel(link)}
              </strong>
              <span className="muted fine">{formatGrading(link)}</span>
            </div>
            <ul className="order-issue-list">
              {issuesForLink(issues, link.id).map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  sessionId={session.id}
                  canDelete={isOrderAdmin || issue.user_id === currentUserId}
                  deleting={deletingIssueId === issue.id}
                  onDelete={onDeleteIssue}
                  t={t}
                  localeTag={localeTag}
                />
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
