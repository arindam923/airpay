import { randomBytes } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { webhooks } from "@/lib/schema";
import { orgScoped, adminOnly } from "./base";
import { createWebhookSchema, toggleWebhookSchema, deleteWebhookSchema } from "@/lib/schemas/webhooks";

export const webhooksRouter = {
  list: orgScoped.handler(async ({ context }) => {
    const db = await getDb();
    return db
      .select()
      .from(webhooks)
      .where(eq(webhooks.organizationId, context.organizationId!))
      .orderBy(desc(webhooks.createdAt));
  }),

  create: adminOnly
    .input(createWebhookSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const id = `wh_${randomBytes(6).toString("hex")}`;
      const secret = randomBytes(24).toString("hex");
      const now = Date.now();
      await db.insert(webhooks).values({
        id,
        organizationId: context.organizationId!,
        url: input.url,
        events: input.events,
        secret,
        active: true,
        createdAt: now,
      });
      return { id, secret };
    }),

  toggle: adminOnly
    .input(toggleWebhookSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      await db
        .update(webhooks)
        .set({ active: input.active })
        .where(and(eq(webhooks.id, input.id), eq(webhooks.organizationId, context.organizationId!)));
      return { ok: true };
    }),

  remove: adminOnly
    .input(deleteWebhookSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      await db
        .delete(webhooks)
        .where(and(eq(webhooks.id, input.id), eq(webhooks.organizationId, context.organizationId!)));
      return { ok: true };
    }),
};
