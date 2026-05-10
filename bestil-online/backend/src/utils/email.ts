import nodemailer from "nodemailer";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

function createTransport() {
  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  // Dev: log emails to console
  return nodemailer.createTransport({ jsonTransport: true });
}

const transport = createTransport();

async function send(to: string, subject: string, html: string) {
  const info = await transport.sendMail({ from: env.EMAIL_FROM, to, subject, html });
  if (env.NODE_ENV !== "production") {
    logger.info({ to, subject, preview: (info as { message?: string }).message?.slice(0, 200) }, "Email sent (dev)");
  }
}

export const emailService = {
  async sendVerification(to: string, token: string) {
    const url = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    await send(
      to,
      "Bekræft din email — Bestil Online",
      `<p>Klik på linket for at bekræfte din email:</p><p><a href="${url}">${url}</a></p><p>Linket udløber om 24 timer.</p>`,
    );
  },

  async sendPasswordReset(to: string, token: string) {
    const url = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    await send(
      to,
      "Nulstil adgangskode — Bestil Online",
      `<p>Klik på linket for at nulstille din adgangskode:</p><p><a href="${url}">${url}</a></p><p>Linket udløber om 1 time.</p>`,
    );
  },
};
