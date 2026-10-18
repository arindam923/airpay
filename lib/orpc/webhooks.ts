import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { getDb } from "@/lib/db";
import { webhookDeliveries, webhookEvents, webhooks } from "@/lib/schema";
import { orgScoped, adminOnly } from "./base";
import { encryptSecret } from "@/lib/crypto";
import { emitTestEvent, flushWebhooks, resendDelivery } from "@/lib/webhooks";
import {
  createWebhookSchema,
  toggleWebhookSchema,
  deleteWebhookSchema,
  webhookIdSchema,
  webhookDeliveryIdSchema,
  listDeliveriesSchema,
} from "@/lib/schemas/webhooks";

function newSecret(): string {
  return randomBytes(24).toString("hex");
}

export const webhooksRouter = {
  list: orgScoped.handler(async ({ context }) => {
    const db = await getDb();
    return db
      .select({
        id: webhooks.id,
        url: webhooks.url,
        events: webhooks.events,
        active: webhooks.active,
        environment: webhooks.environment,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .where(
        and(
          eq(webhooks.organizationId, context.organizationId!),
          eq(webhooks.environment, context.environment),
        ),
      )
      .orderBy(desc(webhooks.createdAt));
  }),

  create: adminOnly
    .input(createWebhookSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const id = `wh_${randomBytes(6).toString("hex")}`;
      const secret = newSecret();
      const now = Date.now();
      await db.insert(webhooks).values({
        id,
        organizationId: context.organizationId!,
        url: input.url,
        events: input.events,
        secret: encryptSecret(secret),
        environment: context.environment,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      return { id, secret };
    }),

  toggle: adminOnly
    .input(toggleWebhookSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      await db
        .update(webhooks)
        .set({ active: input.active, updatedAt: Date.now() })
        .where(
          and(
            eq(webhooks.id, input.id),
            eq(webhooks.organizationId, context.organizationId!),
            eq(webhooks.environment, context.environment),
          ),
        );
      return { ok: true };
    }),

  remove: adminOnly
    .input(deleteWebhookSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      await db
        .delete(webhooks)
        .where(
          and(
            eq(webhooks.id, input.id),
            eq(webhooks.organizationId, context.organizationId!),
            eq(webhooks.environment, context.environment),
          ),
        );
      return { ok: true };
    }),

  /** Issue a fresh signing secret; the old one stops verifying immediately. */
  rotate: adminOnly.input(webhookIdSchema).handler(async ({ input, context }) => {
    const db = await getDb();
    const secret = newSecret();
    const res = await db
      .update(webhooks)
      .set({ secret: encryptSecret(secret), updatedAt: Date.now() })
      .where(
        and(
          eq(webhooks.id, input.id),
          eq(webhooks.organizationId, context.organizationId!),
          eq(webhooks.environment, context.environment),
        ),
      )
      .returning({ id: webhooks.id });
    if (res.length === 0) throw new ORPCError("NOT_FOUND");
    return { id: input.id, secret };
  }),

  /** Send a signed `webhook.test` event so merchants can verify their handler. */
  test: adminOnly.input(webhookIdSchema).handler(async ({ input, context }) => {
    const db = await getDb();
    const rows = await db
      .select({ id: webhooks.id })
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, input.id),
          eq(webhooks.organizationId, context.organizationId!),
          eq(webhooks.environment, context.environment),
        ),
      )
      .limit(1);
    if (rows.length === 0) throw new ORPCError("NOT_FOUND");
    await emitTestEvent(input.id);
    await flushWebhooks(5);
    return { ok: true };
  }),

  deliveries: orgScoped
    .input(listDeliveriesSchema.optional())
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const rows = await db
        .select({
          id: webhookDeliveries.id,
          webhookId: webhookDeliveries.webhook_id,
          url: webhooks.url,
          eventType: webhookEvents.type,
          payload: webhookEvents.data,
          status: webhookDeliveries.status,
          attempts: webhookDeliveries.attempts,
          responseStatus: webhookDeliveries.response_status,
          error: webhookDeliveries.error,
          durationMs: webhookDeliveries.duration_ms,
          createdAt: webhookDeliveries.created_at,
          deliveredAt: webhookDeliveries.delivered_at,
        })
        .from(webhookDeliveries)
        .innerJoin(webhookEvents, eq(webhookEvents.id, webhookDeliveries.event_id))
        .innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhook_id))
        .where(
          and(
            eq(webhooks.organizationId, context.organizationId!),
            eq(webhooks.environment, context.environment),
            input?.webhookId ? eq(webhookDeliveries.webhook_id, input.webhookId) : undefined,
            input?.status ? eq(webhookDeliveries.status, input.status) : undefined,
          ),
        )
        .orderBy(desc(webhookDeliveries.created_at))
        .limit(input?.limit ?? 50);
      return rows;
    }),

  resend: adminOnly
    .input(webhookDeliveryIdSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const rows = await db
        .select({ id: webhookDeliveries.id })
        .from(webhookDeliveries)
        .innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhook_id))
        .where(
          and(
            eq(webhookDeliveries.id, input.id),
            eq(webhooks.organizationId, context.organizationId!),
            eq(webhooks.environment, context.environment),
          ),
        )
        .limit(1);
      if (rows.length === 0) throw new ORPCError("NOT_FOUND");
      await resendDelivery(input.id);
      await flushWebhooks(5);
      return { ok: true };
    }),
};
