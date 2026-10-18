import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  quantity: z.number().positive().default(1),
  unitUsd: z.number().nonnegative(),
});

export const createInvoiceSchema = z.object({
  merchant: z.string().trim().min(1).max(200),
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.email().max(200).nullable().optional(),
  items: z.array(invoiceItemSchema).min(1).max(50),
  taxRate: z.number().min(0).max(100).default(0),
  dueAt: z.number().int().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  template: z.enum(["minimal", "classic", "branded"]).default("minimal"),
  accent: z.string().trim().max(20).default("#6d5efc"),
  chain: z.string().min(1),
  coin: z.enum(["USDC", "ETH"]),
});

export const updateInvoiceSchema = createInvoiceSchema.extend({
  id: z.string().min(1),
});

export const invoiceIdSchema = z.object({ id: z.string().min(1) });

export const markViewedSchema = z.object({ slug: z.string().min(1) });

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
