import type { PublicIntent, PublicInvoiceDetail } from "@/lib/api-types";
import { shortWallet } from "./utils";

export interface CustomerRecord {
  id: string;
  name: string;
  email: string | null;
  wallet: string | null;
  source: "invoice" | "payment";
  /** Total ever invoiced to this customer (sum of non-void invoice totals). */
  billedUsd: number;
  /** Total actually settled on-chain (sum of confirmed payments). */
  settledUsd: number;
  /** Number of confirmed payments. */
  payments: number;
  firstSeen: number;
  lastSeen: number;
  invoices: PublicInvoiceDetail[];
  intents: PublicIntent[];
}

/**
 * Aggregate real customers from invoices and payment intents.
 *
 * Identity resolution (production semantics):
 *  - A customer is keyed by email when we have one (invoices), otherwise by
 *    the on-chain payer wallet (link payments), otherwise by the invoice id.
 *  - Payments are attributed to a customer via their `invoiceId` when they
 *    originate from an invoice checkout; ad-hoc link payments attach to the
 *    payer wallet. This is the same join used server-side to mark invoices paid.
 *  - `billedUsd` and `settledUsd` are tracked separately so a customer with
 *    unpaid invoices is never reported as revenue.
 */
export function deriveCustomers(
  invoices: PublicInvoiceDetail[],
  intents: PublicIntent[],
): CustomerRecord[] {
  const byKey = new Map<string, CustomerRecord>();
  const invoiceToKey = new Map<string, string>();

  const blank = (key: string, over: Partial<CustomerRecord>): CustomerRecord => ({
    id: key,
    name: "Unknown",
    email: null,
    wallet: null,
    source: "payment",
    billedUsd: 0,
    settledUsd: 0,
    payments: 0,
    firstSeen: Number.MAX_SAFE_INTEGER,
    lastSeen: 0,
    invoices: [],
    intents: [],
    ...over,
  });

  for (const inv of invoices) {
    if (inv.status === "void") continue;
    const email = inv.customerEmail?.trim().toLowerCase() || null;
    const key = email ? `email:${email}` : `invoice:${inv.id}`;
    invoiceToKey.set(inv.id, key);
    const customer =
      byKey.get(key) ??
      blank(key, {
        name: inv.customerName || email || "Unknown",
        email,
        source: "invoice",
      });
    customer.billedUsd += inv.totalUsd;
    customer.invoices.push(inv);
    customer.firstSeen = Math.min(customer.firstSeen, inv.createdAt);
    customer.lastSeen = Math.max(customer.lastSeen, inv.createdAt);
    byKey.set(key, customer);
  }

  for (const intent of intents) {
    const linkedInvoiceKey = intent.invoiceId ? invoiceToKey.get(intent.invoiceId) : undefined;
    const key = linkedInvoiceKey ?? (intent.payer ? `wallet:${intent.payer.toLowerCase()}` : null);
    if (!key) continue;

    const customer =
      byKey.get(key) ??
      blank(key, {
        name: intent.payer ? shortWallet(intent.payer) : intent.merchant,
        wallet: intent.payer?.toLowerCase() ?? null,
        source: "payment",
      });
    if (!customer.wallet && intent.payer) customer.wallet = intent.payer;
    customer.intents.push(intent);
    if (intent.status === "confirmed") {
      customer.settledUsd += intent.amountUsd;
      customer.payments += 1;
    }
    customer.firstSeen = Math.min(customer.firstSeen, intent.createdAt);
    customer.lastSeen = Math.max(customer.lastSeen, intent.createdAt);
    byKey.set(key, customer);
  }

  return [...byKey.values()]
    .map((c) => ({
      ...c,
      firstSeen: c.firstSeen === Number.MAX_SAFE_INTEGER ? c.lastSeen : c.firstSeen,
    }))
    .sort((a, b) => b.settledUsd - a.settledUsd || b.billedUsd - a.billedUsd);
}
