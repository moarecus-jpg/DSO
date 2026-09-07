import QRCode from "qrcode";
import { sendEmail } from "./mailer.js";
import {
  listUsersForNewOrderNotifications,
  listSessionMembersForNotifications,
} from "../db.js";
import { displayOrderTitle } from "../../shared/orderTitle.js";
import {
  orderEmailLinkLabel,
  orderShareDescription,
  orderShareUrl,
} from "../../shared/orderShare.js";
import { APP_FULL_NAME, APP_SHORT_NAME } from "../../shared/brand.js";

async function notifyUsers(users, { subject, text, html }) {
  for (const user of users) {
    await sendEmail({
      to: user.email,
      subject,
      text,
      html,
    });
  }
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
  const html = `<p>A new group order was opened: <strong>${title}</strong></p>
<p>${summary}</p>
<p><a href="${url}">${linkLabel}</a></p>`;

  await notifyUsers(users, { subject, text, html });
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
  const html = `<p><strong>${authorName}</strong> posted a note on <strong>${title}</strong>:</p>
<blockquote>${preview.replace(/\n/g, "<br>")}</blockquote>
<p><a href="${url}">${linkLabel}</a></p>`;

  await notifyUsers(users, { subject, text, html });
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
          html: `<p>The group order <strong>${title}</strong> was closed as <strong>unplaced</strong> (not ordered).</p>
<p><a href="${url}">${linkLabel}</a></p>`,
        }
      : kind === "canceled"
        ? {
            subject: `${APP_SHORT_NAME}: Order canceled — ${title}`,
            text: `The group order ${title} was canceled.\n\n${linkLabel}: ${url}`,
            html: `<p>The group order <strong>${title}</strong> was <strong>canceled</strong>.</p>
<p><a href="${url}">${linkLabel}</a></p>`,
          }
      : kind === "auto"
        ? {
            subject: `${APP_SHORT_NAME}: Order auto-closed — ${title}`,
            text: `The group order ${title} was automatically closed after 14 days without activity.\n\n${linkLabel}: ${url}`,
            html: `<p>The group order <strong>${title}</strong> was automatically closed after 14 days without activity.</p>
<p><a href="${url}">${linkLabel}</a></p>`,
          }
        : {
            subject: `${APP_SHORT_NAME}: Order closed — ${title}`,
            text: `The group order ${title} has been closed.\n\n${linkLabel}: ${url}`,
            html: `<p>The group order <strong>${title}</strong> has been closed.</p>
<p><a href="${url}">${linkLabel}</a></p>`,
          };

  await notifyUsers(users, copy);
}

export async function sendPasswordResetEmail({ baseUrl, user, token }) {
  const url = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = `${APP_SHORT_NAME}: Reset your password`;
  const text = `Hello ${user.name ?? user.username ?? "there"},\n\nReset your password using this link (valid for 1 hour):\n\n${url}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<p>Hello ${user.name ?? user.username ?? "there"},</p>
<p>Reset your password using this link (valid for 1 hour):</p>
<p><a href="${url}">${url}</a></p>
<p>If you did not request this, you can ignore this email.</p>`;

  return sendEmail({ to: user.email, subject, text, html });
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

  const html = `<p><strong>${fromName}</strong> invited you to join <strong>${communityName}</strong> on ${APP_FULL_NAME} (${APP_SHORT_NAME}).</p>
<p>Invite code: <strong style="letter-spacing:0.06em;">${inviteCode}</strong></p>
<p><a href="${inviteUrl}">Open invite</a></p>
${qrHtml}`;

  return sendEmail({
    to,
    subject,
    text,
    html,
    attachments: qrBuffer
      ? [
          {
            filename: "dco-invite-qr.png",
            content: qrBuffer,
            contentId: "invite-qr",
          },
        ]
      : undefined,
  });
}
