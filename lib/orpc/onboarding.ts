import { after } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workspaceSettings } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { enabledPairs, isOnboarded } from "@/lib/onboarding";
import { syncOrgMerchants } from "@/lib/settlement/register";
import { orgScoped, adminOnly } from "./base";
import { completeOnboardingSchema } from "@/lib/schemas/onboarding";

export const onboardingRouter = {
  get: orgScoped.handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.organizationId, context.organizationId!))
      .limit(1);
    const settings = rows[0] ?? null;
    return {
      onboarded: isOnboarded(settings),
      organizationId: context.organizationId!,
      accountType: settings?.accountType ?? null,
      enabledChains: settings?.enabledChains ?? [],
      enabledAssets: settings?.enabledAssets ?? {},
      payoutWallet: settings?.payoutWallet ?? "",
      enabledPairs: enabledPairs(settings),
    };
  }),

  complete: adminOnly
    .input(completeOnboardingSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const now = Date.now();
      const enabledAssets: Record<string, string[]> = {};
      for (const chain of input.enabledChains) {
        enabledAssets[chain] = input.enabledAssets[chain];
      }

      await db
        .insert(workspaceSettings)
        .values({
          organizationId: context.organizationId!,
          accountType: input.accountType,
          enabledChains: input.enabledChains,
          enabledAssets,
          payoutWallet: input.payoutWallet,
          onboardedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: workspaceSettings.organizationId,
          set: {
            accountType: input.accountType,
            enabledChains: input.enabledChains,
            enabledAssets,
            payoutWallet: input.payoutWallet,
            onboardedAt: now,
            updatedAt: now,
          },
        });

      // Register the merchant on the settlement contract for every enabled
      // chain (best-effort; failures are recorded per row).
      after(() => {
        void syncOrgMerchants(
          {
            organizationId: context.organizationId!,
            enabledChains: input.enabledChains,
            payoutMode: "all",
            payoutWallet: input.payoutWallet,
            payoutAddresses: null,
          },
          { environment: context.environment },
        );
      });

      let invited = 0;
      for (const invite of input.invites ?? []) {
        try {
          await auth.api.createInvitation({
            headers: context.headers,
            body: {
              email: invite.email,
              role: invite.role,
              organizationId: context.organizationId!,
            },
          });
          invited += 1;
        } catch (err) {
          console.error("[onboarding] invite failed:", invite.email, err);
        }
      }

      return { ok: true, invited };
    }),
};
