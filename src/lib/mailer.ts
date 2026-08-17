import nodemailer from "nodemailer";

import { db } from "@/lib/db";

const SMTP_ID = "smtp";

/** Server-side read of the singleton SMTP row, creating the default (Hostinger-shaped, unconfigured) row on first use. */
export async function getSmtpSettings() {
  return db.smtpSettings.upsert({
    where: { id: SMTP_ID },
    update: {},
    create: { id: SMTP_ID },
  });
}

export { SMTP_ID };

export function isSmtpConfigured(settings: { host: string; username: string; password: string; fromEmail: string }): boolean {
  return Boolean(settings.host.trim() && settings.username.trim() && settings.password.trim() && settings.fromEmail.trim());
}

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Sends one email through the admin-configured SMTP relay (Hostinger by default). Throws with
 * the real transport/SMTP error message on failure — callers (the admin test-email action, and
 * any future feature that sends mail) are expected to surface that message directly rather than
 * swallow it, since a misconfigured relay is something the admin needs to see exactly.
 */
export async function sendMail({ to, subject, html, text }: SendMailInput): Promise<void> {
  const settings = await getSmtpSettings();
  if (!isSmtpConfigured(settings)) {
    throw new Error("SMTP belum dikonfigurasi. Lengkapi pengaturan SMTP di System Configuration terlebih dahulu.");
  }

  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: { user: settings.username, pass: settings.password },
  });

  const fromHeader = settings.fromName ? `"${settings.fromName}" <${settings.fromEmail}>` : settings.fromEmail;

  await transporter.sendMail({
    from: fromHeader,
    to,
    subject,
    html,
    text,
    ...(settings.replyTo ? { replyTo: settings.replyTo } : {}),
  });
}
