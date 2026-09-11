import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";
import { sendEmail } from "./mailer.js";
import {
  listUsersForNewOrderNotifications,
  listSessionMembersForNotifications,
  isDeliverableEmail,
} from "../db.js";
import { displayOrderTitle } from "../../shared/orderTitle.js";
import {
  ATTENTION_IDLE_DAYS,
  lastActivityTs,
} from "../../shared/orderDashboard.js";
import {
  orderEmailLinkLabel,
  orderShareDescription,
  orderShareUrl,
} from "../../shared/orderShare.js";
import { APP_FULL_NAME, APP_SHORT_NAME } from "../../shared/brand.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function attentionReason(session, now = Date.now()) {
  const idle = now - lastActivityTs(session) >= ATTENTION_IDLE_DAYS * DAY_MS;
  let pastTarget = false;
  if (session?.target_date) {
    const target = new Date(`${session.target_date}T12:00:00`).getTime();
    pastTarget = !Number.isNaN(target) && target < now;
  }
  if (idle && pastTarget) return "both";
  if (pastTarget) return "target";
  return "idle";
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_CANDIDATES = [
  path.join(__dirname, "..", "..", "public", "dco-email-logo.png"),
  path.join(__dirname, "..", "..", "dist", "dco-email-logo.png"),
  path.join(__dirname, "..", "..", "public", "dso-icon.png"),
  path.join(__dirname, "..", "..", "dist", "dso-icon.png"),
];

function loadEmailLogoBuffer() {
  for (const candidate of LOGO_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) {
        return fs.readFileSync(candidate);
      }
    } catch {
      // try next path
    }
  }
  return null;
}

function emailBrandHeaderHtml({ baseUrl, includeCidLogo }) {
  const origin = baseUrl.replace(/\/$/, "");
  const logoSrc = includeCidLogo ? "cid:dco-logo" : `${origin}/dco-email-logo.png`;
  return `<div style="margin:0 0 20px;padding:0 0 16px;border-bottom:1px solid #e5e5e5;">
  <img src="${logoSrc}" alt="${APP_SHORT_NAME}" width="56" height="56" style="display:block;border:0;border-radius:12px;" />
  <p style="margin:10px 0 0;font-size:15px;font-weight:700;color:#111113;">${APP_FULL_NAME}</p>
</div>`;
}

function withBrandAttachments(attachments, logoBuffer) {
  const list = Array.isArray(attachments) ? [...attachments] : [];
  if (logoBuffer) {
    list.unshift({
      filename: "dco-logo.png",
      content: logoBuffer,
      contentId: "dco-logo",
    });
  }
  return list.length ? list : undefined;
}

async function notifyUsers(users, { subject, text, html, attachments }) {
  for (const user of users) {
    await sendEmail({
      to: user.email,
      subject,
      text,
      html,
      attachments,
    });
  }
}

function brandedHtml(baseUrl, bodyHtml) {
  const logoBuffer = loadEmailLogoBuffer();
  return {
    html: `${emailBrandHeaderHtml({
      baseUrl,
      includeCidLogo: Boolean(logoBuffer),
    })}${bodyHtml}`,
    logoBuffer,
  };
}

export async function notifyNewOrderOpened({ baseUrl, session, excludeUserId }) {
  const users = listUsersForNewOrderNotifications(
    excludeUserId,
    session?.community_id
  );
  if (!users.length) return;

  const title = displayOrderTitle(session);
  const url = orderShareUrl(baseUrl, session.id);
  const linkLabel = orderEmailLinkLabel(session, { locale: "en", action: "open" });
  const summary = orderShareDescription(session, "en");
  const subject = `${APP_SHORT_NAME}: New order opened — ${title}`;
  const text = `A new group order was opened: ${title}\n\n${summary}\n\n${linkLabel}: ${url}`;
  const { html, logoBuffer } = brandedHtml(
    baseUrl,
    `<p>A new group order was opened: <strong>${title}</strong></p>
<p>${summary}</p>
<p><a href="${url}">${linkLabel}</a></p>`
  );

  await notifyUsers(users, {
    subject,
    text,
    html,
    attachments: withBrandAttachments(undefined, logoBuffer),
  });
}

export async function notifyPaymentRequest({
  baseUrl,
  session,
  toUser,
  fromName,
  amountLabel,
  paypalUrl,
  note,
}) {
  if (!toUser?.email || !isDeliverableEmail(toUser.email)) {
    return { ok: false, reason: "no_email" };
  }

  const title = displayOrderTitle(session);
  const url = orderShareUrl(baseUrl, session.id);
  const linkLabel = orderEmailLinkLabel(session, { locale: "en", action: "view" });
  const subject = `${APP_SHORT_NAME}: Payment request — ${amountLabel} for ${title}`;
  const noteBlock = note?.trim() ? `\n\nNote: ${note.trim()}` : "";
  const text = `${fromName} requested ${amountLabel} for the group order ${title}.

Pay with PayPal:
${paypalUrl}
${noteBlock}

${linkLabel}: ${url}`;
  const noteHtml = note?.trim()
    ? `<p>${note.trim().replace(/\n/g, "<br>")}</p>`
    : "";
  const { html, logoBuffer } = brandedHtml(
    baseUrl,
    `<p><strong>${fromName}</strong> requested <strong>${amountLabel}</strong> for the group order <strong>${title}</strong>.</p>
<p><a href="${paypalUrl}" style="display:inline-block;padding:10px 16px;background:#0070ba;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Pay with PayPal</a></p>
<p style="font-size:13px;color:#555;word-break:break-all;"><a href="${paypalUrl}">${paypalUrl}</a></p>
${noteHtml}
<p><a href="${url}">${linkLabel}</a></p>`
  );

  return sendEmail({
    to: toUser.email,
    subject,
    text,
    html,
    attachments: withBrandAttachments(undefined, logoBuffer),
  });
}

export async function notifyOrderNotePosted({
  baseUrl,
  session,
  note,
  authorName,
  excludeUserId,
}) {
  const users = listSessionMembersForNotifications(session.id, "note", excludeUserId);
  if (!users.length) return;

  const title = displayOrderTitle(session);
  const url = orderShareUrl(baseUrl, session.id);
  const linkLabel = orderEmailLinkLabel(session, { locale: "en", action: "view" });
  const preview =
    note.body.length > 200 ? `${note.body.slice(0, 200)}…` : note.body;
  const subject = `${APP_SHORT_NAME}: New note on ${title}`;
  const text = `${authorName} posted a note on ${title}:\n\n"${preview}"\n\n${linkLabel}: ${url}`;
  const { html, logoBuffer } = brandedHtml(
    baseUrl,
    `<p><strong>${authorName}</strong> posted a note on <strong>${title}</strong>:</p>
<blockquote>${preview.replace(/\n/g, "<br>")}</blockquote>
<p><a href="${url}">${linkLabel}</a></p>`
  );

  await notifyUsers(users, {
    subject,
    text,
    html,
    attachments: withBrandAttachments(undefined, logoBuffer),
  });
}

export async function notifyOrderClosed({
  baseUrl,
  session,
  excludeUserId,
  kind = "closed",
}) {
  const users = listSessionMembersForNotifications(session.id, "closed", excludeUserId);
  if (!users.length) return;

  const title = displayOrderTitle(session);
  const url = orderShareUrl(baseUrl, session.id);
  const linkLabel = orderEmailLinkLabel(session, { locale: "en", action: "view" });

  const copy =
    kind === "unplaced"
      ? {
          subject: `${APP_SHORT_NAME}: Order marked unplaced — ${title}`,
          text: `The group order ${title} was closed as unplaced (not ordered).\n\n${linkLabel}: ${url}`,
          body: `<p>The group order <strong>${title}</strong> was closed as <strong>unplaced</strong> (not ordered).</p>
<p><a href="${url}">${linkLabel}</a></p>`,
        }
      : kind === "canceled"
        ? {
            subject: `${APP_SHORT_NAME}: Order canceled — ${title}`,
            text: `The group order ${title} was canceled.\n\n${linkLabel}: ${url}`,
            body: `<p>The group order <strong>${title}</strong> was <strong>canceled</strong>.</p>
<p><a href="${url}">${linkLabel}</a></p>`,
          }
        : kind === "auto"
          ? {
              subject: `${APP_SHORT_NAME}: Order auto-closed — ${title}`,
              text: `The group order ${title} was automatically closed after 14 days without activity.\n\n${linkLabel}: ${url}`,
              body: `<p>The group order <strong>${title}</strong> was automatically closed after 14 days without activity.</p>
<p><a href="${url}">${linkLabel}</a></p>`,
            }
          : {
              subject: `${APP_SHORT_NAME}: Order closed — ${title}`,
              text: `The group order ${title} has been closed.\n\n${linkLabel}: ${url}`,
              body: `<p>The group order <strong>${title}</strong> has been closed.</p>
<p><a href="${url}">${linkLabel}</a></p>`,
            };

  const { html, logoBuffer } = brandedHtml(baseUrl, copy.body);
  await notifyUsers(users, {
    subject: copy.subject,
    text: copy.text,
    html,
    attachments: withBrandAttachments(undefined, logoBuffer),
  });
}

export async function notifyOrderNeedsAttention({ baseUrl, session, owner, reason }) {
  if (!owner?.email) return;

  const title = displayOrderTitle(session);
  const url = orderShareUrl(baseUrl, session.id);
  const linkLabel = orderEmailLinkLabel(session, { locale: "en", action: "view" });
  const summary = orderShareDescription(session, "en");
  const kind = reason ?? attentionReason(session);
  const reasonText =
    kind === "target"
      ? "The target date for this order has passed."
      : kind === "both"
        ? `This order has been inactive for ${ATTENTION_IDLE_DAYS}+ days and its target date has passed.`
        : `This order has been inactive for ${ATTENTION_IDLE_DAYS}+ days.`;

  const subject = `${APP_SHORT_NAME}: Order needs attention — ${title}`;
  const text = `Your group order needs attention: ${title}

${reasonText}

${summary}

${linkLabel}: ${url}`;
  const { html, logoBuffer } = brandedHtml(
    baseUrl,
    `<p>Your group order needs attention: <strong>${title}</strong></p>
<p>${reasonText}</p>
<p>${summary}</p>
<p><a href="${url}">${linkLabel}</a></p>`
  );

  await sendEmail({
    to: owner.email,
    subject,
    text,
    html,
    attachments: withBrandAttachments(undefined, logoBuffer),
  });
}

export async function sendPasswordResetEmail({ baseUrl, user, token }) {
  const url = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = `${APP_SHORT_NAME}: Reset your password`;
  const text = `Hello ${user.name ?? user.username ?? "there"},\n\nReset your password using this link (valid for 1 hour):\n\n${url}\n\nIf you did not request this, you can ignore this email.`;
  const { html, logoBuffer } = brandedHtml(
    baseUrl,
    `<p>Hello ${user.name ?? user.username ?? "there"},</p>
<p>Reset your password using this link (valid for 1 hour):</p>
<p><a href="${url}">${url}</a></p>
<p>If you did not request this, you can ignore this email.</p>`
  );

  return sendEmail({
    to: user.email,
    subject,
    text,
    html,
    attachments: withBrandAttachments(undefined, logoBuffer),
  });
}

export async function sendCommunityInviteEmail({
  baseUrl,
  to,
  community,
  invitedByName,
}) {
  const inviteCode = community?.inviteCode ?? community?.invite_code;
  if (!inviteCode) {
    return { ok: false, reason: "missing_invite_code" };
  }

  const origin = baseUrl.replace(/\/$/, "");
  const inviteUrl = `${origin}/invite/${encodeURIComponent(inviteCode)}`;
  const communityName = community.name ?? "a community";
  const fromName = invitedByName?.trim() || "A Diggers community member";

  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(inviteUrl, {
      type: "png",
      width: 440,
      margin: 1,
      color: { dark: "#111113", light: "#ffffff" },
    });
  } catch (err) {
    console.error("[email] QR generation failed:", err.message);
  }

  const subject = `${APP_SHORT_NAME}: You're invited to ${communityName}`;
  const text = `${fromName} invited you to join ${communityName} on ${APP_FULL_NAME} (${APP_SHORT_NAME}).

Invite code: ${inviteCode}

Open this link to join:
${inviteUrl}

Or scan the attached QR code (if your email client shows attachments).`;

  const qrHtml = qrBuffer
    ? `<p><img src="cid:invite-qr" alt="Invite QR code" width="220" height="220" style="display:block;border:0;border-radius:12px;" /></p>
<p style="color:#666;font-size:13px;">Scan the QR code, or use the invite code / link above.</p>`
    : `<p style="color:#666;font-size:13px;">Use the invite code or link above to join.</p>`;

  const { html, logoBuffer } = brandedHtml(
    baseUrl,
    `<p><strong>${fromName}</strong> invited you to join <strong>${communityName}</strong> on ${APP_FULL_NAME} (${APP_SHORT_NAME}).</p>
<p>Invite code: <strong style="letter-spacing:0.06em;">${inviteCode}</strong></p>
<p><a href="${inviteUrl}">Open invite</a></p>
${qrHtml}`
  );

  return sendEmail({
    to,
    subject,
    text,
    html,
    attachments: withBrandAttachments(
      qrBuffer
        ? [
            {
              filename: "dco-invite-qr.png",
              content: qrBuffer,
              contentId: "invite-qr",
            },
          ]
        : undefined,
      logoBuffer
    ),
  });
}
