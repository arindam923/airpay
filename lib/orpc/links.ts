import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { paymentLinks, workspaceSettings } from "@/lib/schema";
import { enabledPairs, isValidTestnetKey } from "@/lib/onboarding";
import { coinAvailableOnTestnet } from "@/lib/tokens";
import { newSlug, toPublicLink } from "@/lib/links";
import { orgScoped, onboarded } from "./base";
import { createLinkSchema, revokeLinkSchema } from "@/lib/schemas/links";

export const linksRouter = {
  list: orgScoped.handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(paymentLinks)
      .where(eq(paymentLinks.organizationId, context.organizationId!))
      .orderBy(desc(paymentLinks.created_at));
    return rows.map(toPublicLink);
  }),

  create: onboarded
    .input(createLinkSchema)
    .handler(async ({ input, context }) => {
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
              receiver: settings.payoutWallet,
              allowed: pairs,
              active: true,
              created_at: now,
            })
            .returning();
          return toPublicLink(inserted[0]);
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
      await db
        .update(paymentLinks)
        .set({ active: false })
        .where(
          and(
            eq(paymentLinks.id, input.id),
            eq(paymentLinks.organizationId, context.organizationId!),
          ),
        );
      return { ok: true };
    }),
};
