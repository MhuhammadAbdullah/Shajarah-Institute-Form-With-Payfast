export interface PaymentConfirmationEmailData {
  studentName: string;
  program: string;
  basketId: string;
  transactionId: string;
  amount: number;
  paymentDate: Date;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPaymentConfirmationEmail(data: PaymentConfirmationEmailData): { subject: string; html: string; text: string } {
  const formattedAmount = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(data.amount);
  const formattedDate = new Intl.DateTimeFormat("en-PK", { dateStyle: "long", timeStyle: "short" }).format(data.paymentDate);

  const subject = `Payment Confirmed — Shajarah Institute (${data.basketId})`;

  const rows: [string, string][] = [
    ["Student Name", data.studentName],
    ["Program", data.program],
    ["Basket ID", data.basketId],
    ["Transaction ID", data.transactionId],
    ["Amount Paid", formattedAmount],
    ["Payment Date", formattedDate],
  ];

  const html = `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h2 style="color: #0f5132;">Payment Confirmed</h2>
    <p>Assalam-o-Alaikum ${escapeHtml(data.studentName)},</p>
    <p>Your registration payment for <strong>${escapeHtml(data.program)}</strong> at Shajarah Institute has been received and confirmed. Your enrollment is now complete.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${escapeHtml(label)}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${escapeHtml(value)}</td>
        </tr>`,
        )
        .join("")}
    </table>
    <p>Please retain this email as proof of payment. If you have any questions, feel free to contact our admissions office.</p>
    <p style="margin-top: 32px; color: #6b7280; font-size: 12px;">Shajarah Institute &mdash; This is an automated confirmation email.</p>
  </div>`;

  const text = [
    `Payment Confirmed - Shajarah Institute`,
    ``,
    `Assalam-o-Alaikum ${data.studentName},`,
    `Your registration payment for ${data.program} has been received and confirmed.`,
    ``,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    ``,
    `Please retain this email as proof of payment.`,
  ].join("\n");

  return { subject, html, text };
}
