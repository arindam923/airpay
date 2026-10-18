import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { getDb } from "./db";
import { webhookDeliveries, webhookEvents, webhooks, type WebhookDeliveryRow } from "./schema";
import { decryptSecret } from "./crypto";
import type { Environment } from "./environment";
import { WEBHOOK_EVENT_TYPES, WILDCARD, type WebhookEventType } from "./webhook-events";

export { WEBHOOK_EVENT_TYPES, WILDCARD };
export type { WebhookEventType };

/**
 * Server-side webhook delivery.
 *
 * Delivery is **at-least-once**: `emitEvent` fans an event out to one queued
 * delivery per subscribed endpoint, and `deliverPending` (run by the worker and
 * the `/api/cron/verify` safety net, or eagerly after a dashboard mutation)
 * drains the queue with exponential backoff. Consumers must be idempotent — the
 * delivered payload carries a stable `id` and the signed envelope.
 *
 * This module must stay free of Next.js imports so the plain `worker` process
 * can import it. Eager flushing is scheduled by request-scoped callers.
 */

/** Backoff between attempts (attempt N waits BACKOFF_MS[N-1] before retrying). */
const BACKOFF_MS = [
  30_000,
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  3 * 60 * 60_000,
  6 * 60 * 60_000,
  12 * 60 * 60_000,
];
export const MAX_ATTEMPTS = BACKOFF_MS.length;
const REQUEST_TIMEOUT_MS = 10_000;
/** Lease held while an attempt is in flight, so worker + cron can't double-send. */
const LEASE_MS = 30_000;
const RESPONSE_BODY_LIMIT = 2_000;

function id(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function backoffMs(attempts: number): number {
  if (attempts <= 0) return BACKOFF_MS[0];
  return BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)];
}

/**
 * Stripe-style signature: `t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "t.body")>`.
 * Consumers re-derive it and compare in constant time.
 */
export function signPayload(secret: string, timestamp: number, body: string): string {
  const mac = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${mac}`;
}

export interface EmitEventInput {
  organizationId: string | null | undefined;
  environment: Environment;
  type: WebhookEventType;
  data: Record<string, unknown>;
  /** Stable key that makes re-emission idempotent (e.g. `payment.confirmed:<id>`). */
  dedupeKey?: string;
}

/**
 * Record an event and queue a delivery per subscribed endpoint. Never throws:
 * a webhook failure must never break the payment/invoice flow that triggered it.
 */
export async function emitEvent(input: EmitEventInput): Promise<void> {
  try {
    if (!input.organizationId) return;
    const db = await getDb();
    const now = Date.now();
    const dedupeKey = input.dedupeKey ?? `${input.type}:${randomUUID()}`;

    const inserted = await db
      .insert(webhookEvents)
      .values({
        id: id("evt"),
        organizationId: input.organizationId,
        environment: input.environment,
        type: input.type,
        data: input.data,
        dedupe_key: dedupeKey,
        created_at: now,
      })
      .onConflictDoNothing({
        target: [webhookEvents.organizationId, webhookEvents.environment, webhookEvents.dedupe_key],
      })
      .returning({ id: webhookEvents.id });

    const eventId = inserted[0]?.id;
    if (!eventId) return; // Duplicate transition — already emitted, no-op.

    const subs = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.organizationId, input.organizationId),
          eq(webhooks.environment, input.environment),
          eq(webhooks.active, true),
        ),
      );

    const targets = subs.filter(
      (w) => w.events.includes(input.type) || w.events.includes(WILDCARD),
    );
    if (targets.length === 0) return;

    await db.insert(webhookDeliveries).values(
      targets.map((w) => ({
        id: id("whd"),
        event_id: eventId,
        webhook_id: w.id,
        status: "pending" as const,
        attempts: 0,
        next_attempt_at: now,
        created_at: now,
        updated_at: now,
      })),
    );
  } catch (err) {
    console.error("[webhooks] emit failed:", err instanceof Error ? err.message : err);
  }
}

/** Emit a synthetic `webhook.test` event to a single endpoint. */
export async function emitTestEvent(webhookId: string): Promise<void> {
  try {
    const db = await getDb();
    const rows = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
    const wh = rows[0];
    if (!wh) return;
    const now = Date.now();
    const eventId = id("evt");
    await db.insert(webhookEvents).values({
      id: eventId,
      organizationId: wh.organizationId,
      environment: wh.environment,
      type: "webhook.test",
      data: { message: "This is a test event from AirPay.", endpointId: wh.id },
      dedupe_key: `webhook.test:${eventId}`,
      created_at: now,
    });
    await db.insert(webhookDeliveries).values({
      id: id("whd"),
      event_id: eventId,
      webhook_id: wh.id,
      status: "pending",
      attempts: 0,
      next_attempt_at: now,
      created_at: now,
      updated_at: now,
    });
  } catch (err) {
    console.error("[webhooks] test emit failed:", err instanceof Error ? err.message : err);
  }
}

/** Re-queue a completed/failed delivery as a fresh attempt stream. */
export async function resendDelivery(deliveryId: string): Promise<void> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, deliveryId))
    .limit(1);
  const d = rows[0];
  if (!d) return;
  const now = Date.now();
  await db.insert(webhookDeliveries).values({
    id: id("whd"),
    event_id: d.event_id,
    webhook_id: d.webhook_id,
    status: "pending",
    attempts: 0,
    next_attempt_at: now,
    created_at: now,
    updated_at: now,
  });
}

/**
 * Atomically lease a due delivery. The conditional update is what keeps
 * concurrent workers/isolates from sending the same delivery twice.
 */
async function claimDelivery(deliveryId: string): Promise<boolean> {
  const db = await getDb();
  const now = Date.now();
  const res = await db
    .update(webhookDeliveries)
    .set({ next_attempt_at: now + LEASE_MS, updated_at: now })
    .where(
      and(
        eq(webhookDeliveries.id, deliveryId),
        inArray(webhookDeliveries.status, ["pending", "failed"]),
        lte(webhookDeliveries.next_attempt_at, now),
      ),
    )
    .returning({ id: webhookDeliveries.id });
  return res.length > 0;
}

async function attemptDelivery(delivery: WebhookDeliveryRow): Promise<void> {
  const db = await getDb();
  const now = Date.now();

  const [whRows, evtRows] = await Promise.all([
    db.select().from(webhooks).where(eq(webhooks.id, delivery.webhook_id)).limit(1),
    db.select().from(webhookEvents).where(eq(webhookEvents.id, delivery.event_id)).limit(1),
  ]);
  const wh = whRows[0];
  const evt = evtRows[0];
  if (!wh || !evt) {
    await db
      .update(webhookDeliveries)
      .set({ status: "exhausted", error: "Endpoint or event no longer exists.", next_attempt_at: null, updated_at: now })
      .where(eq(webhookDeliveries.id, delivery.id));
    return;
  }

  // A paused endpoint stops receiving new attempts, but this queued one is terminal.
  if (!wh.active) {
    await db
      .update(webhookDeliveries)
      .set({ status: "failed", error: "Endpoint is paused.", next_attempt_at: null, updated_at: now })
      .where(eq(webhookDeliveries.id, delivery.id));
    return;
  }

  const secret = decryptSecret(wh.secret);
  const body = JSON.stringify({
    id: evt.id,
    type: evt.type,
    createdAt: evt.created_at,
    environment: wh.environment,
    data: evt.data,
  });
  const timestamp = Math.floor(now / 1000);
  const signature = signPayload(secret, timestamp, body);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let error: string | null = null;
  let ok = false;
  const started = Date.now();

  try {
    const res = await fetch(wh.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "AirPay-Webhooks/1.0",
        "airpay-event-id": evt.id,
        "airpay-event-type": evt.type,
        "airpay-timestamp": String(timestamp),
        "airpay-environment": wh.environment,
        "airpay-signature": signature,
      },
      body,
      signal: controller.signal,
      redirect: "manual",
    });
    responseStatus = res.status;
    ok = res.status >= 200 && res.status < 300;
    responseBody = (await res.text()).slice(0, RESPONSE_BODY_LIMIT);
  } catch (err) {
    error = err instanceof Error ? err.message : "Request failed.";
  } finally {
    clearTimeout(timer);
  }

  const duration = Date.now() - started;
  const attempts = delivery.attempts + 1;

  if (ok) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "success",
        attempts,
        response_status: responseStatus,
        response_body: responseBody,
        error: null,
        duration_ms: duration,
        next_attempt_at: null,
        delivered_at: Date.now(),
        updated_at: Date.now(),
      })
      .where(eq(webhookDeliveries.id, delivery.id));
    return;
  }

  const failure = error ?? `Endpoint returned ${responseStatus}.`;
  const exhausted = attempts >= MAX_ATTEMPTS;
  await db
    .update(webhookDeliveries)
    .set({
      status: exhausted ? "exhausted" : "failed",
      attempts,
      response_status: responseStatus,
      response_body: responseBody,
      error: failure,
      duration_ms: duration,
      next_attempt_at: exhausted ? null : Date.now() + backoffMs(attempts),
      updated_at: Date.now(),
    })
    .where(eq(webhookDeliveries.id, delivery.id));
}

/** Deliver every due queued attempt, up to `limit`. Returns how many were sent. */
export async function deliverPending(limit = 20): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const due = await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        inArray(webhookDeliveries.status, ["pending", "failed"]),
        lte(webhookDeliveries.next_attempt_at, now),
      ),
    )
    .orderBy(asc(webhookDeliveries.next_attempt_at))
    .limit(limit);

  let sent = 0;
  for (const delivery of due) {
    if (!(await claimDelivery(delivery.id))) continue;
    try {
      await attemptDelivery(delivery);
      sent += 1;
    } catch (err) {
      console.warn(
        `[webhooks] delivery ${delivery.id} errored:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return sent;
}

/** Alias used by request-scoped callers to eagerly drain the queue. */
export function flushWebhooks(limit = 15): Promise<number> {
  return deliverPending(limit);
}
