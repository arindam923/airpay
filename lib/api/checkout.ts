import { randomBytes } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { checkoutSessions, type CheckoutSessionRow } from "@/lib/schema";
import { getIntent, toPublic } from "@/lib/intents";
import { testnetByKey } from "@/lib/chains";
import { emitEvent } from "@/lib/webhooks";
import type { PublicLink } from "@/lib/links";
import type { PublicIntent } from "@/lib/api-types";
import type { Environment } from "@/lib/environment";

export const createCheckoutSessionApiSchema = z.object({
  /** Amount in minor units (cents). */
  amount: z.number().int().positive(),
  currency: z.literal("usd").default("usd"),
  chain: z.string().min(1),
  token: z.enum(["USDC", "ETH"]).default("USDC"),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  client_reference_id: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  title: z.string().min(1).max(200).optional(),
  merchant: z.string().min(1).max(200).optional(),
});

export const CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000;

export function generateCheckoutSessionId(): string {
  return `cs_${randomBytes(12).toString("hex")}`;
}

export function toApiCheckoutSession(
  row: CheckoutSessionRow,
  baseUrl: string,
): Record<string, unknown> {
  return {
    id: row.id,
    object: "checkout.session",
    status: row.status,
    url: `${baseUrl.replace(/\/$/, "")}/checkout/${row.id}`,
    payment_intent: row.intent_id,
    success_url: row.success_url,
    cancel_url: row.cancel_url,
    client_reference_id: row.client_reference_id,
    metadata: row.metadata ?? {},
    created: Math.floor(row.created_at / 1000),
    expires_at: Math.floor(row.expires_at / 1000),
    completed_at: row.completed_at ? Math.floor(row.completed_at / 1000) : null,
    environment: row.environment,
    livemode: row.environment === "production",
  };
}

export async function createCheckoutSessionRecord(params: {
  organizationId: string;
  environment: Environment;
  intentId: string;
  successUrl: string | null;
  cancelUrl: string | null;
  clientReferenceId: string | null;
  metadata: Record<string, string> | null;
}): Promise<CheckoutSessionRow> {
  const db = await getDb();
  const now = Date.now();
  const row: CheckoutSessionRow = {
    id: generateCheckoutSessionId(),
    organizationId: params.organizationId,
    environment: params.environment,
    intent_id: params.intentId,
    status: "open",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.clientReferenceId,
    metadata: params.metadata,
    created_at: now,
    expires_at: now + CHECKOUT_SESSION_TTL_MS,
    completed_at: null,
  };
  await db.insert(checkoutSessions).values(row);
  return row;
}

export async function getCheckoutSession(id: string): Promise<CheckoutSessionRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(checkoutSessions)
    .where(eq(checkoutSessions.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserCheckoutSession(
  id: string,
  organizationId: string,
  environment: Environment,
): Promise<CheckoutSessionRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.id, id),
        eq(checkoutSessions.organizationId, organizationId),
        eq(checkoutSessions.environment, environment),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function expireCheckoutSession(id: string, organizationId: string): Promise<boolean> {
  const db = await getDb();
  const res = await db
    .update(checkoutSessions)
    .set({ status: "expired" })
    .where(
      and(
        eq(checkoutSessions.id, id),
        eq(checkoutSessions.organizationId, organizationId),
        eq(checkoutSessions.status, "open"),
      ),
    )
    .returning();
  const row = res[0];
  if (!row) return false;
  await emitEvent({
    organizationId: row.organizationId,
    environment: row.environment,
    type: "checkout.session.expired",
    data: { checkout_session: toApiCheckoutSession(row, "") },
    dedupeKey: `checkout.session.expired:${row.id}`,
  });
  return true;
}

/** Mark the open session tied to a confirmed intent as complete. */
export async function completeCheckoutSessionForIntent(intentId: string): Promise<void> {
  const db = await getDb();
  const res = await db
    .update(checkoutSessions)
    .set({ status: "complete", completed_at: Date.now() })
    .where(and(eq(checkoutSessions.intent_id, intentId), eq(checkoutSessions.status, "open")))
    .returning();
  const row = res[0];
  if (!row) return;
  await emitEvent({
    organizationId: row.organizationId,
    environment: row.environment,
    type: "checkout.session.completed",
    data: { checkout_session: toApiCheckoutSession(row, "") },
    dedupeKey: `checkout.session.completed:${row.id}`,
  });
}

/** Expire stale open sessions; returns how many were expired. */
export async function expireStaleCheckoutSessions(now = Date.now()): Promise<number> {
  const db = await getDb();
  const rows = await db
    .update(checkoutSessions)
    .set({ status: "expired" })
    .where(and(eq(checkoutSessions.status, "open"), lt(checkoutSessions.expires_at, now)))
    .returning();
  for (const row of rows) {
    await emitEvent({
      organizationId: row.organizationId,
      environment: row.environment,
      type: "checkout.session.expired",
      data: { checkout_session: toApiCheckoutSession(row, "") },
      dedupeKey: `checkout.session.expired:${row.id}`,
    });
  }
  return rows.length;
}

/**
 * Build the checkout page's view model: the linked intent plus a link-shaped
 * config so the hosted checkout renders without query-string parameters.
 */
export async function loadCheckoutPage(id: string): Promise<{
  session: CheckoutSessionRow;
  intent: PublicIntent;
  link: PublicLink;
} | null> {
  const session = await getCheckoutSession(id);
  if (!session || !session.intent_id) return null;
  const intent = await getIntent(session.intent_id);
  if (!intent) return null;

  const info = testnetByKey(intent.chain_key);
  const link: PublicLink = {
    id: session.id,
    slug: session.id,
    title: intent.title,
    merchant: intent.merchant,
    mode: "fixed",
    amountUsd: intent.amount_usd,
    min: 0,
    max: null,
    chainKey: intent.chain_key,
    chainName: info?.name ?? intent.chain_key,
    coin: intent.token,
    receiver: intent.receiver,
    allowed: { [intent.chain_key]: [intent.token] },
    environment: intent.environment,
    active: session.status === "open",
    createdAt: session.created_at,
  };

  return { session, intent: toPublic(intent), link };
}
