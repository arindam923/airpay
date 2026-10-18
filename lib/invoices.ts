import { and, eq, notInArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { invoiceItems, invoices, workspaceSettings, type InvoiceItemRow, type InvoiceRow } from "./schema";
import { testnetByKey } from "./chains";
import type { PublicInvoiceDetail, PublicInvoiceItem } from "./api-types";
import { emitEvent } from "./webhooks";

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitUsd: number;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeTotals(
  items: InvoiceLineInput[],
  taxRate: number,
): { subtotal: number; tax: number; total: number } {
  const subtotal = round2(items.reduce((sum, i) => sum + round2(i.quantity * i.unitUsd), 0));
  const tax = round2(subtotal * (taxRate / 100));
  return { subtotal, tax, total: round2(subtotal + tax) };
}

/** Atomically reserves the next per-org invoice number, formatted as INV-0001. */
export async function nextInvoiceNumber(organizationId: string): Promise<string> {
  const db = await getDb();
  const rows = await db
    .update(workspaceSettings)
    .set({ invoiceSeq: sql`${workspaceSettings.invoiceSeq} + 1` })
    .where(eq(workspaceSettings.organizationId, organizationId))
    .returning({ seq: workspaceSettings.invoiceSeq });
  const seq = rows[0]?.seq ?? 1;
  return `INV-${String(seq).padStart(4, "0")}`;
}

export function toPublicInvoiceItem(row: InvoiceItemRow): PublicInvoiceItem {
  return {
    id: row.id,
    description: row.description,
    quantity: row.quantity,
    unitUsd: row.unit_usd,
    amountUsd: row.amount_usd,
  };
}

export function toPublicInvoice(row: InvoiceRow, items: InvoiceItemRow[] = []): PublicInvoiceDetail {
  const info = testnetByKey(row.chain_key);
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    merchant: row.merchant,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    subtotalUsd: row.subtotal_usd,
    taxUsd: row.tax_usd,
    totalUsd: row.total_usd,
    dueAt: row.due_at,
    notes: row.notes,
    template: row.template,
    accent: row.accent,
    slug: row.slug,
    chainKey: row.chain_key,
    chainName: info?.name ?? row.chain_key,
    token: row.token,
    allowed: row.allowed ?? {},
    receiver: row.receiver,
    environment: row.environment,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    viewedAt: row.viewed_at,
    paidAt: row.paid_at,
    items: items.map(toPublicInvoiceItem),
  };
}

export async function getInvoiceBySlug(slug: string): Promise<InvoiceRow | null> {
  const db = await getDb();
  const rows = await db.select().from(invoices).where(eq(invoices.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getInvoiceById(id: string): Promise<InvoiceRow | null> {
  const db = await getDb();
  const rows = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listInvoiceItems(invoiceId: string): Promise<InvoiceItemRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoice_id, invoiceId))
    .orderBy(invoiceItems.position);
}

/** Idempotently flips an invoice to paid once its payment intent confirms. */
export async function markInvoicePaid(invoiceId: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  const updated = await db
    .update(invoices)
    .set({ status: "paid", paid_at: now, updated_at: now })
    .where(and(eq(invoices.id, invoiceId), notInArray(invoices.status, ["paid", "void"])))
    .returning();
  const row = updated[0];
  if (row) {
    const items = await listInvoiceItems(row.id);
    await emitEvent({
      organizationId: row.organizationId,
      environment: row.environment,
      type: "invoice.paid",
      data: { invoice: toPublicInvoice(row, items) },
      dedupeKey: `invoice.paid:${row.id}`,
    });
  }
}
