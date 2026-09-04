import { listingIdFor } from "./orderTotals.js";

export const ISSUE_TYPES = [
  "grading",
  "wrongItem",
  "damagedTransit",
  "missing",
  "wrongPressing",
  "other",
];

export const RESOLUTIONS = ["partialRefund", "return", "replacement", "informing"];

/** Discogs grading scale, best to worst. */
export const GRADES = [
  "Mint (M)",
  "Near Mint (NM or M-)",
  "Very Good Plus (VG+)",
  "Very Good (VG)",
  "Good Plus (G+)",
  "Good (G)",
  "Fair (F)",
  "Poor (P)",
];

const GRADE_SHORT = {
  "Mint (M)": "M",
  "Near Mint (NM or M-)": "NM",
  "Very Good Plus (VG+)": "VG+",
  "Very Good (VG)": "VG",
  "Good Plus (G+)": "G+",
  "Good (G)": "G",
  "Fair (F)": "F",
  "Poor (P)": "P",
};

/** Short Discogs grade label (NM, VG+, …). Returns null for empty input. */
export function shortGrade(value) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (!text) return null;
  if (GRADE_SHORT[text]) return GRADE_SHORT[text];

  const paren = text.match(/\(([^)]+)\)\s*$/);
  if (paren) {
    return paren[1].split(/\s+or\s+/i)[0].trim() || text;
  }
  return text;
}

/** Media grade for listing cards, e.g. "M: NM". */
export function formatMediaGradeLabel(value) {
  const short = shortGrade(value);
  return short ? `M: ${short}` : null;
}

/** Cover/sleeve grade for listing cards, e.g. "C: VG+". */
export function formatCoverGradeLabel(value) {
  const short = shortGrade(value);
  return short ? `C: ${short}` : null;
}

export const MAX_ISSUE_PHOTOS = 4;
export const MAX_ISSUE_PHOTO_BYTES = 4 * 1024 * 1024;
export const ISSUE_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_ISSUE_BODY_LENGTH = 2000;

/** English wording sent to the seller — sellers are international, so this is not localised. */
const ISSUE_SENTENCE = {
  grading: "The item arrived in worse condition than the listing described.",
  wrongItem: "The item I received is not the item I ordered.",
  damagedTransit: "The item was damaged in transit.",
  missing: "This item was missing from the package.",
  wrongPressing: "The pressing I received is not the one in the listing.",
  other: "There is a problem with this item.",
};

const RESOLUTION_SENTENCE = {
  partialRefund: "I would like a partial refund for this item.",
  return: "I would like to return this item for a full refund.",
  replacement: "I would like a replacement if you have another copy.",
  informing: "I am not asking for anything, I just wanted to let you know.",
};

export function isValidIssueType(value) {
  return ISSUE_TYPES.includes(value);
}

export function isValidResolution(value) {
  return RESOLUTIONS.includes(value);
}

export function isValidGrade(value) {
  return value == null || value === "" || GRADES.includes(value);
}

export function issueItemLabel(link) {
  if (!link) return "Unknown item";
  if (link.artist && link.title) return `${link.artist} — ${link.title}`;
  return link.title || link.artist || link.label || link.url || "Unknown item";
}

export function issuesForLink(issues = [], linkId) {
  return issues.filter((issue) => issue.link_id === linkId);
}

/**
 * Someone may report a problem on an item they ordered themselves; the order
 * placer and app admins may report on any item, since they handle the seller.
 */
export function canReportItemIssue({ link, userId, isOrderAdmin = false }) {
  if (!link || !userId) return false;
  if (isOrderAdmin) return true;
  return link.user_id === userId;
}

function formatDate(value) {
  if (!value) return null;
  const raw = String(value);
  const d = new Date(raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function listedAsLine(link) {
  const media = link?.media_condition;
  const sleeve = link?.sleeve_condition;
  const parts = [];
  if (media) parts.push(`media ${media}`);
  if (sleeve) parts.push(`sleeve ${sleeve}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

function actualGradeLine(issue) {
  const parts = [];
  if (issue.actual_media_condition) {
    parts.push(`the media is closer to ${issue.actual_media_condition}`);
  }
  if (issue.actual_sleeve_condition) {
    parts.push(`the sleeve is closer to ${issue.actual_sleeve_condition}`);
  }
  return parts.length > 0 ? `In my opinion ${parts.join(" and ")}.` : null;
}

function issueBlock(issue, link, index) {
  const lines = [`${index}. ${issueItemLabel(link)}`];

  const listingId = link ? listingIdFor(link) : "—";
  if (listingId && listingId !== "—") {
    lines.push(`   Listing: ${listingId}`);
  } else if (link?.url) {
    lines.push(`   Listing: ${link.url}`);
  }

  const listed = listedAsLine(link);
  if (listed) lines.push(`   Listed as: ${listed}`);

  const problem = [ISSUE_SENTENCE[issue.issue_type] ?? ISSUE_SENTENCE.other];
  const actual = actualGradeLine(issue);
  if (actual) problem.push(actual);
  lines.push(`   Problem: ${problem.join(" ")}`);

  const body = issue.body?.trim();
  if (body) {
    lines.push(`   Details: ${body.replace(/\s*\n\s*/g, " ")}`);
  }

  lines.push(
    `   Request: ${RESOLUTION_SENTENCE[issue.resolution] ?? RESOLUTION_SENTENCE.informing}`
  );

  const photoCount = issue.photos?.length ?? 0;
  if (photoCount > 0) {
    lines.push(
      `   I have ${photoCount} photo${photoCount === 1 ? "" : "s"} of this and can send ${
        photoCount === 1 ? "it" : "them"
      } on request.`
    );
  }

  return lines.join("\n");
}

/**
 * Builds the message the order placer sends to the seller. Always English.
 * Returns null when there is nothing to report.
 */
export function buildSellerMessage({ session, issues = [], senderName } = {}) {
  if (!session || issues.length === 0) return null;

  const links = session.links ?? [];
  const linkById = new Map(links.map((link) => [link.id, link]));
  const sorted = [...issues].sort((a, b) => {
    const ai = links.findIndex((link) => link.id === a.link_id);
    const bi = links.findIndex((link) => link.id === b.link_id);
    return ai - bi;
  });

  const orderDate = formatDate(session.closed_at ?? session.created_at);
  const itemCount = links.length;
  const affected = new Set(sorted.map((issue) => issue.link_id)).size;

  let reportLine;
  if (itemCount <= 1) {
    reportLine = "Unfortunately I have to report a problem with it:";
  } else if (affected === 1) {
    reportLine = "Unfortunately I have to report a problem with one of the items:";
  } else {
    reportLine = `Unfortunately I have to report problems with ${affected} of the items:`;
  }

  const intro = [
    "Hello,",
    "",
    `I ordered ${itemCount} item${itemCount === 1 ? "" : "s"} from you${
      orderDate ? ` (order placed ${orderDate})` : ""
    } and the package has arrived. Thank you for shipping it.`,
    "",
    reportLine,
    "",
  ];

  const blocks = sorted.map((issue, index) =>
    issueBlock(issue, linkById.get(issue.link_id), index + 1)
  );

  const outro = [
    "",
    "Could you let me know how you would like to resolve this? I am happy to send photos or any other detail you need.",
    "",
    "Thanks in advance,",
    senderName || "",
  ];

  return [...intro, blocks.join("\n\n"), ...outro].join("\n").trimEnd();
}
