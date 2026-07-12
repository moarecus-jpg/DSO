import nodemailer from "nodemailer";

const SYNTHETIC_EMAIL_SUFFIX = "@users.iglarnica";

export function isDeliverableEmail(email) {
  const trimmed = email?.trim().toLowerCase() ?? "";
  if (!trimmed || !trimmed.includes("@")) return false;
  return !trimmed.endsWith(SYNTHETIC_EMAIL_SUFFIX);
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

function createTransport() {
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

export async function sendEmail({ to, subject, text, html }) {
  if (!isDeliverableEmail(to)) {
    return { ok: false, reason: "invalid_recipient" };
  }

  const from = process.env.SMTP_FROM?.trim();
  if (!from || !emailConfigured()) {
    console.log("[email] SMTP not configured — would send:");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  ${text}`);
    return { ok: true, dev: true };
  }

  const transport = createTransport();
  if (!transport) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    await transport.sendMail({ from, to, subject, text, html: html ?? text });
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed:", err.message);
    return { ok: false, reason: "send_failed" };
  }
}
