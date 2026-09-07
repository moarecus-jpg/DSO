import nodemailer from "nodemailer";
import { Resend } from "resend";

const SYNTHETIC_EMAIL_SUFFIX = "@users.iglarnica";

export function isDeliverableEmail(email) {
  const trimmed = email?.trim().toLowerCase() ?? "";
  if (!trimmed || !trimmed.includes("@")) return false;
  return !trimmed.endsWith(SYNTHETIC_EMAIL_SUFFIX);
}

function resendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

function fromAddress() {
  return (
    process.env.RESEND_FROM?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    ""
  );
}

export function emailConfigured() {
  return Boolean(fromAddress() && (resendApiKey() || process.env.SMTP_HOST?.trim()));
}

function createSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
}

function toResendAttachments(attachments) {
  if (!attachments?.length) return undefined;
  return attachments.map((a) => ({
    filename: a.filename,
    content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content),
    ...(a.contentId ? { contentId: a.contentId } : {}),
  }));
}

function toSmtpAttachments(attachments) {
  if (!attachments?.length) return undefined;
  return attachments.map((a) => ({
    filename: a.filename,
    content: a.content,
    ...(a.contentId ? { cid: a.contentId } : {}),
  }));
}

export async function sendEmail({ to, subject, text, html, attachments }) {
  if (!isDeliverableEmail(to)) {
    return { ok: false, reason: "invalid_recipient" };
  }

  const from = fromAddress();
  if (!from || !emailConfigured()) {
    console.log("[email] Email not configured — would send:");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  ${text}`);
    return { ok: true, dev: true };
  }

  const apiKey = resendApiKey();
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from,
        to,
        subject,
        text,
        html: html ?? text,
        attachments: toResendAttachments(attachments),
      });
      if (error) {
        console.error("[email] Resend send failed:", error.message ?? error);
        return { ok: false, reason: "send_failed" };
      }
      return { ok: true };
    } catch (err) {
      console.error("[email] Resend send failed:", err.message);
      return { ok: false, reason: "send_failed" };
    }
  }

  const transport = createSmtpTransport();
  if (!transport) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    await transport.sendMail({
      from,
      to,
      subject,
      text,
      html: html ?? text,
      attachments: toSmtpAttachments(attachments),
    });
    return { ok: true };
  } catch (err) {
    console.error("[email] SMTP send failed:", err.message);
    return { ok: false, reason: "send_failed" };
  }
}
