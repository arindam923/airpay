import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paymentLinks, workspaceSettings } from "@/lib/schema";
import { enabledPairs, isValidTestnetKey, resolveReceiver } from "@/lib/onboarding";
import { coinAvailableOnTestnet } from "@/lib/tokens";
import { newSlug, toPublicLink } from "@/lib/links";
import { orgScoped, onboarded, assertEnvironmentEnabled } from "./base";
import { createLinkSchema, revokeLinkSchema } from "@/lib/schemas/links";
import { emitEvent } from "@/lib/webhooks";

export const linksRouter = {
  list: orgScoped.handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(paymentLinks)
      .where(
        and(
          eq(paymentLinks.organizationId, context.organizationId!),
          eq(paymentLinks.environment, context.environment),
        ),
      )
      .orderBy(desc(paymentLinks.created_at));
    return rows.map(toPublicLink);
  }),

  create: onboarded
    .input(createLinkSchema)
    .handler(async ({ input, context }) => {
      assertEnvironmentEnabled(context.environment);
      const db = await getDb();
      const rows = await db
        .select()
        .from(workspaceSettings)
        .where(eq(workspaceSettings.organizationId, context.organizationId!))
        .limit(1);
      const settings = rows[0];
      if (!settings) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "Finish setting up your account first.",
        });
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

      const now = Date.now();
      for (let attempt = 0; attempt < 5; attempt++) {
        const slug = newSlug();
        try {
          const inserted = await db
            .insert(paymentLinks)
            .values({
              id: randomUUID(),
              organizationId: context.organizationId!,
              createdBy: context.session!.user.id,
              slug,
              title: input.title,
              merchant: input.merchant,
              mode: input.mode,
              amount_usd: input.amount,
              min: input.min,
              max: input.max ?? null,
              chain_key: input.chain,
              token: input.coin,
              receiver: resolveReceiver(settings, input.chain),
              allowed: pairs,
              environment: context.environment,
              active: true,
              created_at: now,
            })
            .returning();
          const link = toPublicLink(inserted[0]);
          await emitEvent({
            organizationId: context.organizationId!,
            environment: context.environment,
            type: "link.created",
            data: { link },
            dedupeKey: `link.created:${link.id}`,
          });
          return link;
        } catch (err) {
          // Unique slug violation — retry with a fresh slug.
          if (attempt < 4) continue;
          console.error("[links] create failed:", err);
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Could not create the payment link.",
          });
        }
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Could not create the payment link.",
      });
    }),

  revoke: orgScoped
    .input(revokeLinkSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const updated = await db
        .update(paymentLinks)
        .set({ active: false })
        .where(
          and(
            eq(paymentLinks.id, input.id),
            eq(paymentLinks.organizationId, context.organizationId!),
            eq(paymentLinks.environment, context.environment),
          ),
        )
        .returning();
      const row = updated[0];
      if (row) {
        await emitEvent({
          organizationId: row.organizationId,
          environment: row.environment,
          type: "link.revoked",
          data: { link: toPublicLink(row) },
          dedupeKey: `link.revoked:${row.id}`,
        });
      }
      return { ok: true };
    }),
};
