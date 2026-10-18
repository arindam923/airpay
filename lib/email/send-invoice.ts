import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { invoiceEmails } from "@/lib/schema";
import type { PublicInvoiceDetail } from "@/lib/api-types";
import { sendEmail } from "./client";
import { getOrgEmailConfig } from "./config";
import { renderInvoiceEmail } from "./templates/invoice";

export interface SendInvoiceEmailInput {
  invoice: PublicInvoiceDetail;
  organizationId: string;
  to: string;
  replyTo?: string | null;
  /** Absolute origin used to build the payment URL (e.g. https://app.airpay.dev). */
  origin: string;
}

/**
 * Renders and sends an invoice email through the organization's configured
 * transport, logging every attempt to `invoice_emails` so the dashboard can
 * show delivery history and failures.
 */
export async function sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<{ id: string }> {
  const config = await getOrgEmailConfig(input.organizationId);
  const from = config.from;
  const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "AirPay";
  const rendered = renderInvoiceEmail(input.invoice, {
    payUrl: `${input.origin.replace(/\/$/, "")}/i/${input.invoice.slug}`,
    appName,
  });

  const db = await getDb();
  const base = {
    invoice_id: input.invoice.id,
    to_email: input.to,
    from_email: from,
    reply_to: input.replyTo ?? null,
    subject: rendered.subject,
    provider: config.provider,
  };

  try {
    const res = await sendEmail(
      {
        from,
        to: input.to,
        replyTo: input.replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      },
      config,
    );
    await db.insert(invoiceEmails).values({
      id: randomUUID(),
      ...base,
      status: "sent",
      provider_id: res.id || null,
      error: null,
      created_at: Date.now(),
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error.";
    await db.insert(invoiceEmails).values({
      id: randomUUID(),
      ...base,
      status: "failed",
      provider_id: null,
      error: message,
      created_at: Date.now(),
    });
    throw err;
  }
}
