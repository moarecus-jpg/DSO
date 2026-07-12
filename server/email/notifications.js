import { sendEmail } from "./mailer.js";
import {
  listUsersForNewOrderNotifications,
  listSessionMembersForNotifications,
} from "../db.js";

function orderUrl(baseUrl, sessionId) {
  return `${baseUrl.replace(/\/$/, "")}/session/${sessionId}`;
}

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

  const title = session.title ?? session.seller_username;
  const url = orderUrl(baseUrl, session.id);
  const subject = `DSO: New order opened — ${title}`;
  const text = `A new group order was opened: ${title}\n\nSeller: @${session.seller_username}\n\nOpen order: ${url}`;
  const html = `<p>A new group order was opened: <strong>${title}</strong></p>
<p>Seller: @${session.seller_username}</p>
<p><a href="${url}">Open order</a></p>`;

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

  const title = session.title ?? session.seller_username;
  const url = orderUrl(baseUrl, session.id);
  const preview =
    note.body.length > 200 ? `${note.body.slice(0, 200)}…` : note.body;
  const subject = `DSO: New note on ${title}`;
  const text = `${authorName} posted a note on ${title}:\n\n"${preview}"\n\nView order: ${url}`;
  const html = `<p><strong>${authorName}</strong> posted a note on <strong>${title}</strong>:</p>
<blockquote>${preview.replace(/\n/g, "<br>")}</blockquote>
<p><a href="${url}">View order</a></p>`;

  await notifyUsers(users, { subject, text, html });
}

export async function notifyOrderClosed({ baseUrl, session, excludeUserId }) {
  const users = listSessionMembersForNotifications(session.id, "closed", excludeUserId);
  if (!users.length) return;

  const title = session.title ?? session.seller_username;
  const url = orderUrl(baseUrl, session.id);
  const subject = `DSO: Order closed — ${title}`;
  const text = `The group order ${title} has been closed.\n\nView order: ${url}`;
  const html = `<p>The group order <strong>${title}</strong> has been closed.</p>
<p><a href="${url}">View order</a></p>`;

  await notifyUsers(users, { subject, text, html });
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
