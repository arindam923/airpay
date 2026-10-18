import type { PublicInvoiceDetail } from "@/lib/api-types";

export interface InvoiceEmailRender {
  subject: string;
  html: string;
  text: string;
}

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(ms: number | null): string | null {
  if (ms == null) return null;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function renderInvoiceEmail(
  invoice: PublicInvoiceDetail,
  opts: { payUrl: string; appName?: string },
): InvoiceEmailRender {
  const appName = opts.appName ?? "AirPay";
  const subject = `Invoice ${invoice.number} from ${invoice.merchant}`;
  const due = formatDate(invoice.dueAt);
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(invoice.accent) ? invoice.accent : "#6d5efc";
  const { template } = invoice;

  const itemRows = invoice.items
    .map(
      (it) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;color:#333;font-size:14px;">
            ${esc(it.description)}
            <span style="color:#999;">×${it.quantity}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;color:#333;font-size:14px;text-align:right;">
            ${money(it.amountUsd)}
          </td>
        </tr>`,
    )
    .join("");

  const headerBand =
    template === "branded"
      ? `<tr><td style="background:${accent};padding:28px 32px;">
           <p style="margin:0;color:#fff;font-size:20px;font-weight:600;">${esc(invoice.merchant)}</p>
           <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Invoice ${esc(invoice.number)}</p>
         </td></tr>`
      : "";

  const headerPlain =
    template === "minimal"
      ? ""
      : `<div style="margin-bottom:20px;">
           <p style="margin:0;font-size:15px;font-weight:600;color:#111;">${esc(invoice.merchant)}</p>
         </div>`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e8;">
          ${headerBand}
          <tr><td style="padding:32px;">
            ${headerPlain}
            <p style="margin:0 0 4px;font-size:22px;font-weight:600;color:#111;">Invoice ${esc(invoice.number)}</p>
            <p style="margin:0 0 2px;font-size:14px;color:#666;">Bill to ${esc(invoice.customerName)}</p>
            ${due ? `<p style="margin:0 0 20px;font-size:14px;color:#666;">Due ${due}</p>` : `<p style="margin:0 0 20px;"></p>`}

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${itemRows || `<tr><td style="padding:10px 0;color:#666;font-size:14px;">No line items</td></tr>`}
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr>
                <td style="padding:4px 0;color:#666;font-size:14px;">Subtotal</td>
                <td style="padding:4px 0;color:#333;font-size:14px;text-align:right;">${money(invoice.subtotalUsd)}</td>
              </tr>
              ${
                invoice.taxUsd > 0
                  ? `<tr>
                       <td style="padding:4px 0;color:#666;font-size:14px;">Tax</td>
                       <td style="padding:4px 0;color:#333;font-size:14px;text-align:right;">${money(invoice.taxUsd)}</td>
                     </tr>`
                  : ""
              }
              <tr>
                <td style="padding:10px 0 0;color:#111;font-size:16px;font-weight:600;border-top:1px solid #eee;">Total due</td>
                <td style="padding:10px 0 0;color:#111;font-size:16px;font-weight:600;text-align:right;border-top:1px solid #eee;">${money(invoice.totalUsd)}</td>
              </tr>
            </table>

            <a href="${opts.payUrl}" style="display:block;margin-top:24px;background:${accent};color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:600;">
              Pay invoice
            </a>

            ${invoice.notes ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#666;">${esc(invoice.notes)}</p>` : ""}

            <p style="margin:24px 0 0;font-size:12px;color:#999;">
              Sent on behalf of ${esc(invoice.merchant)} via ${esc(appName)}. Reply to this email to reach the merchant directly.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const textLines = [
    `${invoice.merchant} — Invoice ${invoice.number}`,
    `Bill to ${invoice.customerName}`,
    due ? `Due ${due}` : "",
    "",
    ...invoice.items.map((it) => `${it.quantity} × ${it.description} — ${money(it.amountUsd)}`),
    "",
    `Subtotal: ${money(invoice.subtotalUsd)}`,
    invoice.taxUsd > 0 ? `Tax: ${money(invoice.taxUsd)}` : "",
    `Total due: ${money(invoice.totalUsd)}`,
    "",
    `Pay: ${opts.payUrl}`,
    invoice.notes ? `\n${invoice.notes}` : "",
  ].filter((l) => l !== "");

  return { subject, html, text: textLines.join("\n") };
}
