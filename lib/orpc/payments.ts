import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { eq, and, inArray, desc } from "drizzle-orm";
import { createIntent, getIntent, attachTx, toPublic, IntentError } from "@/lib/intents";
import { selfHeal } from "@/lib/selfheal";
import { getDb } from "@/lib/db";
import { paymentIntents } from "@/lib/schema";
import { base, orgScoped, onboarded } from "./base";
import { createIntentSchema, getIntentSchema, submitTxSchema } from "@/lib/schemas/intents";
import type { IntentStatus } from "@/lib/api-types";

export const paymentsRouter = {
  create: onboarded
    .input(createIntentSchema)
    .handler(async ({ input, context }) => {
      try {
        const intent = await createIntent({
          organizationId: context.organizationId!,
          createdBy: context.session!.user.id,
          slug: input.slug,
          title: input.title,
          merchant: input.merchant,
          mode: input.mode,
          amount: input.amount,
          min: input.min,
          max: input.max ?? null,
          chain: input.chain,
          coin: input.coin,
        });
        return toPublic(intent);
      } catch (err) {
        if (err instanceof IntentError) throw new ORPCError("BAD_REQUEST", { message: err.message });
        throw err;
      }
    }),

  get: base
    .input(getIntentSchema)
    .handler(async ({ input }) => {
      const intent = await getIntent(input.id);
      if (!intent) throw new ORPCError("NOT_FOUND");
      const healed = await selfHeal(intent);
      return toPublic(healed);
    }),

  submitTx: base
    .input(submitTxSchema)
    .handler(async ({ input }) => {
      try {
        const intent = await attachTx({
          intentId: input.intentId,
          txHash: input.txHash,
          payer: input.payer ?? null,
        });
        return toPublic(intent);
      } catch (err) {
        if (err instanceof IntentError) throw new ORPCError("BAD_REQUEST", { message: err.message });
        throw err;
      }
    }),

  listByOrg: orgScoped
    .input(z.object({ statuses: z.array(z.string()).optional() }))
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const rows = input.statuses?.length
        ? await db
            .select()
            .from(paymentIntents)
            .where(
              and(
                eq(paymentIntents.organizationId, context.organizationId!),
                inArray(paymentIntents.status, input.statuses as IntentStatus[]),
              ),
            )
            .orderBy(desc(paymentIntents.created_at))
        : await db
            .select()
            .from(paymentIntents)
            .where(eq(paymentIntents.organizationId, context.organizationId!))
            .orderBy(desc(paymentIntents.created_at));
      return rows.map((r) => toPublic(r as never));
    }),
};
