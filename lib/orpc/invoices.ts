import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invoiceItems, invoices, workspaceSettings, type InvoiceItemRow } from "@/lib/schema";
import { enabledPairs, isValidTestnetKey, resolveReceiver } from "@/lib/onboarding";
import { coinAvailableOnTestnet } from "@/lib/tokens";
import { newSlug } from "@/lib/links";
import {
  computeTotals,
  getInvoiceById,
  getInvoiceBySlug,
  listInvoiceItems,
  nextInvoiceNumber,
  round2,
  toPublicInvoice,
} from "@/lib/invoices";
import { adminOnly, base, onboarded, orgScoped, assertEnvironmentEnabled } from "./base";
import { createInvoiceSchema, invoiceIdSchema, markViewedSchema, updateInvoiceSchema } from "@/lib/schemas/invoices";
import type { InvoiceItemInput } from "@/lib/schemas/invoices";
import { sendInvoiceEmail } from "@/lib/email/send-invoice";
import { emitEvent } from "@/lib/webhooks";

function itemRows(invoiceId: string, items: InvoiceItemInput[]): InvoiceItemRow[] {
  return items.map((it, i) => ({
    id: randomUUID(),
    invoice_id: invoiceId,
    description: it.description,
    quantity: it.quantity,
    unit_usd: round2(it.unitUsd),
    amount_usd: round2(it.quantity * it.unitUsd),
    position: i,
  }));
}

export const invoicesRouter = {
  list: orgScoped.handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, context.organizationId!),
          eq(invoices.environment, context.environment),
        ),
      )
      .orderBy(desc(invoices.created_at));
    return rows.map((r) => toPublicInvoice(r));
  }),

  get: orgScoped.input(invoiceIdSchema).handler(async ({ input, context }) => {
    const row = await getInvoiceById(input.id);
    if (!row || row.organizationId !== context.organizationId! || row.environment !== context.environment) {
      throw new ORPCError("NOT_FOUND");
    }
    return toPublicInvoice(row, await listInvoiceItems(row.id));
  }),

  create: onboarded.input(createInvoiceSchema).handler(async ({ input, context }) => {
    assertEnvironmentEnabled(context.environment);
    const db = await getDb();
    const settingsRows = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.organizationId, context.organizationId!))
      .limit(1);
    const settings = settingsRows[0];
    if (!settings) {
      throw new ORPCError("PRECONDITION_FAILED", { message: "Finish setting up your account first." });
    }

    const pairs = enabledPairs(settings);
    if (!isValidTestnetKey(input.chain) || !pairs[input.chain]?.includes(input.coin)) {
      throw new ORPCError("BAD_REQUEST", {
        message: "That network or asset is not enabled for this account.",
      });
    }
    if (!coinAvailableOnTestnet(input.coin)) {
      throw new ORPCError("BAD_REQUEST", { message: "Unsupported asset." });
    }

    const { subtotal, tax, total } = computeTotals(input.items, input.taxRate);
    if (total <= 0) {
      throw new ORPCError("BAD_REQUEST", { message: "Invoice total must be greater than zero." });
    }

    const number = await nextInvoiceNumber(context.organizationId!);
    const invoiceId = randomUUID();
    const now = Date.now();

    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = newSlug();
      try {
        const created = await db.transaction(async (tx) => {
          const inserted = await tx
            .insert(invoices)
            .values({
              id: invoiceId,
              organizationId: context.organizationId!,
              createdBy: context.session!.user.id,
              number,
              slug,
              status: "draft",
              environment: context.environment,
              merchant: input.merchant,
              customer_name: input.customerName,
              customer_email: input.customerEmail ?? null,
              subtotal_usd: subtotal,
              tax_usd: tax,
              total_usd: total,
              due_at: input.dueAt ?? null,
              notes: input.notes ?? null,
              template: input.template,
              accent: input.accent,
              receiver: resolveReceiver(settings, input.chain),
              chain_key: input.chain,
              token: input.coin,
              allowed: pairs,
              created_at: now,
              updated_at: now,
            })
            .returning();
          const items = await tx
            .insert(invoiceItems)
            .values(itemRows(invoiceId, input.items))
            .returning();
          return toPublicInvoice(inserted[0], items);
        });
        await emitEvent({
          organizationId: context.organizationId!,
          environment: context.environment,
          type: "invoice.created",
          data: { invoice: created },
          dedupeKey: `invoice.created:${created.id}`,
        });
        return created;
      } catch (err) {
        if (attempt < 4) continue;
        console.error("[invoices] create failed:", err);
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Could not create the invoice." });
      }
    }
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Could not create the invoice." });
  }),

  update: onboarded.input(updateInvoiceSchema).handler(async ({ input, context }) => {
    const row = await getInvoiceById(input.id);
    if (!row || row.organizationId !== context.organizationId! || row.environment !== context.environment) {
      throw new ORPCError("NOT_FOUND");
    }
    if (row.status !== "draft") {
      throw new ORPCError("BAD_REQUEST", { message: "Only draft invoices can be edited." });
    }

    const db = await getDb();
    const settingsRows = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.organizationId, context.organizationId!))
      .limit(1);
    const settings = settingsRows[0];
    const pairs = enabledPairs(settings ?? null);
    if (!isValidTestnetKey(input.chain) || !pairs[input.chain]?.includes(input.coin)) {
      throw new ORPCError("BAD_REQUEST", {
        message: "That network or asset is not enabled for this account.",
      });
    }

    const { subtotal, tax, total } = computeTotals(input.items, input.taxRate);
    if (total <= 0) {
      throw new ORPCError("BAD_REQUEST", { message: "Invoice total must be greater than zero." });
    }

    const now = Date.now();
    const updated = await db.transaction(async (tx) => {
      const res = await tx
        .update(invoices)
        .set({
          merchant: input.merchant,
          customer_name: input.customerName,
          customer_email: input.customerEmail ?? null,
          subtotal_usd: subtotal,
          tax_usd: tax,
          total_usd: total,
          due_at: input.dueAt ?? null,
          notes: input.notes ?? null,
          template: input.template,
          accent: input.accent,
          chain_key: input.chain,
          token: input.coin,
          allowed: pairs,
          updated_at: now,
        })
        .where(eq(invoices.id, row.id))
        .returning();
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoice_id, row.id));
      const items = await tx
        .insert(invoiceItems)
        .values(itemRows(row.id, input.items))
        .returning();
      return toPublicInvoice(res[0], items);
    });
    return updated;
  }),

  void: adminOnly.input(invoiceIdSchema).handler(async ({ input, context }) => {
    const db = await getDb();
    const updated = await db
      .update(invoices)
      .set({ status: "void", updated_at: Date.now() })
      .where(
        and(
          eq(invoices.id, input.id),
          eq(invoices.organizationId, context.organizationId!),
          eq(invoices.environment, context.environment),
        ),
      )
      .returning();
    const row = updated[0];
    if (row) {
      await emitEvent({
        organizationId: row.organizationId,
        environment: row.environment,
        type: "invoice.void",
        data: { invoice: toPublicInvoice(row) },
        dedupeKey: `invoice.void:${row.id}`,
      });
    }
    return { ok: true };
  }),

  markViewed: base.input(markViewedSchema).handler(async ({ input }) => {
    const db = await getDb();
    const row = await getInvoiceBySlug(input.slug);
    if (!row || row.status !== "sent") return { ok: true };
    await db
      .update(invoices)
      .set({ status: "viewed", viewed_at: Date.now(), updated_at: Date.now() })
      .where(eq(invoices.id, row.id));
    await emitEvent({
      organizationId: row.organizationId,
      environment: row.environment,
      type: "invoice.viewed",
      data: { invoice: toPublicInvoice(row) },
      dedupeKey: `invoice.viewed:${row.id}`,
    });
    return { ok: true };
  }),

  send: adminOnly.input(invoiceIdSchema).handler(async ({ input, context }) => {
    const row = await getInvoiceById(input.id);
    if (!row || row.organizationId !== context.organizationId! || row.environment !== context.environment) {
      throw new ORPCError("NOT_FOUND");
    }
    if (row.status === "void") {
      throw new ORPCError("BAD_REQUEST", { message: "This invoice was voided." });
    }
    if (!row.customer_email) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Add a customer email to the invoice before sending.",
      });
    }

    const db = await getDb();
    const settingsRows = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.organizationId, context.organizationId!))
      .limit(1);
    const settings = settingsRows[0];

    const invoice = toPublicInvoice(row, await listInvoiceItems(row.id));
    const origin = (process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");

    try {
      const res = await sendInvoiceEmail({
        invoice,
        organizationId: context.organizationId!,
        to: row.customer_email,
        replyTo: settings?.invoiceReplyTo || null,
        origin,
      });
      await db
        .update(invoices)
        .set({
          status: row.status === "draft" ? "sent" : row.status,
          sent_at: Date.now(),
          updated_at: Date.now(),
        })
        .where(eq(invoices.id, row.id));
      await emitEvent({
        organizationId: row.organizationId,
        environment: row.environment,
        type: "invoice.sent",
        data: { invoice },
        dedupeKey: `invoice.sent:${row.id}`,
      });
      return { ok: true, id: res.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send the email.";
      throw new ORPCError("BAD_GATEWAY", { message });
    }
  }),
};
