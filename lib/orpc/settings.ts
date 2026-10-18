import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workspaceSettings } from "@/lib/schema";
import { orgScoped, adminOnly } from "./base";
import { updateSettingsSchema } from "@/lib/schemas/settings";

export const settingsRouter = {
  get: orgScoped.handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.organizationId, context.organizationId!))
      .limit(1);
    return rows[0] ?? null;
  }),

  update: adminOnly
    .input(updateSettingsSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const now = Date.now();
      await db
        .insert(workspaceSettings)
        .values({
          organizationId: context.organizationId!,
          workspaceName: input.workspaceName,
          settlementCurrency: input.settlementCurrency,
          payoutSchedule: input.payoutSchedule,
          payoutWallet: input.payoutWallet,
          emailPayouts: input.emailPayouts,
          emailFailures: input.emailFailures,
          emailProduct: input.emailProduct,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: workspaceSettings.organizationId,
          set: {
            workspaceName: input.workspaceName,
            settlementCurrency: input.settlementCurrency,
            payoutSchedule: input.payoutSchedule,
            payoutWallet: input.payoutWallet,
            emailPayouts: input.emailPayouts,
            emailFailures: input.emailFailures,
            emailProduct: input.emailProduct,
            updatedAt: now,
          },
        });
      return { ok: true };
    }),
};
