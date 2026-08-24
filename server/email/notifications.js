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
  const users = listUsersForNewOrderNotifications(excludeUserId);
  if (!users.length) return;

  const title = displayOrderTitle(session);
  const url = orderShareUrl(baseUrl, session.id);
  const linkLabel = orderEmailLinkLabel(session, { locale: "en", action: "open" });
  const summary = orderShareDescription(session, "en");
  const subject = `DSO: New order opened — ${title}`;
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
  const subject = `DSO: New note on ${title}`;
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
          subject: `DSO: Order marked unplaced — ${title}`,
          text: `The group order ${title} was closed as unplaced (not ordered).\n\n${linkLabel}: ${url}`,
          html: `<p>The group order <strong>${title}</strong> was closed as <strong>unplaced</strong> (not ordered).</p>
<p><a href="${url}">${linkLabel}</a></p>`,
        }
      : kind === "canceled"
        ? {
            subject: `DSO: Order canceled — ${title}`,
            text: `The group order ${title} was canceled.\n\n${linkLabel}: ${url}`,
            html: `<p>The group order <strong>${title}</strong> was <strong>canceled</strong>.</p>
<p><a href="${url}">${linkLabel}</a></p>`,
          }
      : kind === "auto"
        ? {
            subject: `DSO: Order auto-closed — ${title}`,
            text: `The group order ${title} was automatically closed after 14 days without activity.\n\n${linkLabel}: ${url}`,
            html: `<p>The group order <strong>${title}</strong> was automatically closed after 14 days without activity.</p>
<p><a href="${url}">${linkLabel}</a></p>`,
          }
        : {
            subject: `DSO: Order closed — ${title}`,
            text: `The group order ${title} has been closed.\n\n${linkLabel}: ${url}`,
            html: `<p>The group order <strong>${title}</strong> has been closed.</p>
<p><a href="${url}">${linkLabel}</a></p>`,
          };

  await notifyUsers(users, copy);
}

export async function sendPasswordResetEmail({ baseUrl, user, token }) {
  const url = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = "DSO: Reset your password";
  const text = `Hello ${user.name ?? user.username ?? "there"},\n\nReset your password using this link (valid for 1 hour):\n\n${url}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<p>Hello ${user.name ?? user.username ?? "there"},</p>
<p>Reset your password using this link (valid for 1 hour):</p>
<p><a href="${url}">${url}</a></p>
<p>If you did not request this, you can ignore this email.</p>`;

  return sendEmail({ to: user.email, subject, text, html });
}
