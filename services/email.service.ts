import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/config/env";
import { renderPaymentConfirmationEmail, type PaymentConfirmationEmailData } from "@/emails/payment-confirmation";

let cachedTransporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const env = getEnv();
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  return cachedTransporter;
}

export async function sendPaymentConfirmationEmail(
  data: PaymentConfirmationEmailData & { to: string },
): Promise<void> {
  const env = getEnv();
  const { subject, html, text } = renderPaymentConfirmationEmail(data);

  await getTransporter().sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
    to: data.to,
    subject,
    html,
    text,
  });
}
