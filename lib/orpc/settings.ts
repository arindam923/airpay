import { after } from "next/server";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { getDb } from "@/lib/db";
import { emailSettings, workspaceSettings, type SettlementMerchantRow } from "@/lib/schema";
import { orgScoped, adminOnly } from "./base";
import { setProductionSchema, updateEmailSchema, updateSettingsSchema } from "@/lib/schemas/settings";
import { isOnboarded } from "@/lib/onboarding";
import { isProductionReady } from "@/lib/environment";
import { checkoutAppearanceSchema } from "@/lib/schemas/checkout-appearance";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { sendEmail } from "@/lib/email/client";
import { getOrgEmailConfig, maskEmailConfig } from "@/lib/email/config";
import { listSettlementMerchants } from "@/lib/settlement/merchants";
import { syncOrgMerchants, settlementAdminConfigured } from "@/lib/settlement/register";

export function toPublicSettlement(row: SettlementMerchantRow) {
  return {
    chainKey: row.chainKey,
    merchantId: row.merchantId,
    contractAddress: row.contractAddress,
    payoutAddress: row.payoutAddress,
    feeBps: row.feeBps,
    status: row.status,
    environment: row.environment,
    registerTxHash: row.registerTxHash,
    error: row.error,
    updatedAt: row.updatedAt,
  };
}

export const settingsRouter = {
  get: orgScoped.handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.organizationId, context.organizationId!))
      .limit(1);
    const emailRows = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.organizationId, context.organizationId!))
      .limit(1);
    const settlement = await listSettlementMerchants(context.organizationId!);
    return {
      ...(rows[0] ?? null),
      email: maskEmailConfig(emailRows[0] ?? null),
      settlement: settlement.map(toPublicSettlement),
      settlementAdminConfigured: settlementAdminConfigured(),
      productionReady: isProductionReady(),
    };
  }),

  /**
   * Dashboard "Go live" switch. Production resources stay server-gated by
   * `PRODUCTION_READY`; this only records the workspace's intent so mainnet
   * unlocks the moment the platform ships it.
   */
  setProduction: adminOnly
    .input(setProductionSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const orgId = context.organizationId!;
      const rows = await db
        .select()
        .from(workspaceSettings)
        .where(eq(workspaceSettings.organizationId, orgId))
        .limit(1);
      if (input.enabled && !isOnboarded(rows[0] ?? null)) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "Finish onboarding and save your payout destinations before going live.",
        });
      }
      const now = Date.now();
      const productionEnabledAt = input.enabled ? now : null;
      const values = {
        productionEnabled: input.enabled,
        productionEnabledAt,
        updatedAt: now,
      };
      await db
        .insert(workspaceSettings)
        .values({ organizationId: orgId, ...values })
        .onConflictDoUpdate({
          target: workspaceSettings.organizationId,
          set: values,
        });
      return {
        ok: true,
        productionEnabled: input.enabled,
        productionEnabledAt,
        productionReady: isProductionReady(),
      };
    }),

  update: adminOnly
    .input(updateSettingsSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const now = Date.now();
      // In per-network mode `payout_wallet` stays non-empty (onboarding gates on
      // it) by mirroring the first enabled network's destination.
      const payoutWallet =
        input.payoutMode === "per_network"
          ? input.payoutAddresses[input.enabledChains[0]!] ?? input.payoutWallet
          : input.payoutWallet;
      const values = {
        workspaceName: input.workspaceName,
        payoutMode: input.payoutMode,
        payoutWallet,
        payoutAddresses: input.payoutAddresses,
        enabledChains: input.enabledChains,
        enabledAssets: input.enabledAssets,
        emailPayouts: input.emailPayouts,
        emailFailures: input.emailFailures,
        emailProduct: input.emailProduct,
        updatedAt: now,
      };
      await db
        .insert(workspaceSettings)
        .values({ organizationId: context.organizationId!, ...values })
        .onConflictDoUpdate({
          target: workspaceSettings.organizationId,
          set: values,
        });

      // Register/refresh the merchant on the settlement contract for every
      // enabled chain (best-effort; failures are recorded per row).
      const syncSettings = {
        organizationId: context.organizationId!,
        enabledChains: input.enabledChains,
        payoutMode: input.payoutMode,
        payoutWallet,
        payoutAddresses: input.payoutAddresses,
      };
      after(() => {
        void syncOrgMerchants(syncSettings, { environment: context.environment });
      });

      return { ok: true };
    }),

  /** Manually (re)register every enabled settlement chain for this workspace. */
  syncSettlement: adminOnly.handler(async ({ context }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.organizationId, context.organizationId!))
      .limit(1);
    const settings = rows[0] ?? null;
    if (!settings) {
      throw new ORPCError("PRECONDITION_FAILED", { message: "Finish workspace setup first." });
    }
    if (!settlementAdminConfigured()) {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "Settlement is not configured on the server (missing admin key).",
      });
    }
    const merchants = await syncOrgMerchants(settings, { environment: context.environment });
    return { settlement: merchants.map(toPublicSettlement) };
  }),

  updateCheckout: adminOnly
    .input(checkoutAppearanceSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const now = Date.now();
      await db
        .insert(workspaceSettings)
        .values({ organizationId: context.organizationId!, checkoutAppearance: input, updatedAt: now })
        .onConflictDoUpdate({
          target: workspaceSettings.organizationId,
          set: { checkoutAppearance: input, updatedAt: now },
        });
      return { ok: true, checkoutAppearance: input };
    }),

  updateEmail: adminOnly
    .input(updateEmailSchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const orgId = context.organizationId!;
      const rows = await db
        .select()
        .from(emailSettings)
        .where(eq(emailSettings.organizationId, orgId))
        .limit(1);
      const existing = rows[0] ?? null;

      const storedResendKey = decryptSecret(existing?.resendApiKey);
      const storedSmtpPass = decryptSecret(existing?.smtpPass);

      if (input.provider === "resend") {
        if (!input.fromEmail) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Add the verified sender address for your Resend domain.",
          });
        }
        if (!input.resendApiKey && !storedResendKey) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Paste your Resend API key (re_…).",
          });
        }
      }

      if (input.provider === "smtp") {
        if (!input.smtpHost || !input.smtpPort) {
          throw new ORPCError("BAD_REQUEST", {
            message: "SMTP host and port are required.",
          });
        }
        if (!input.fromEmail) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Add the sender address for your SMTP relay.",
          });
        }
        if (input.smtpUser && !input.smtpPass && !storedSmtpPass) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Paste your SMTP password.",
          });
        }
      }

      if (input.provider === "google" && !existing?.googleRefreshToken) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Connect your Google account first.",
        });
      }

      const now = Date.now();
      const values = {
        provider: input.provider,
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        smtpHost: input.smtpHost,
        smtpPort: input.smtpPort,
        smtpSecure: input.smtpSecure,
        smtpUser: input.smtpUser,
        resendApiKey: input.resendApiKey ? encryptSecret(input.resendApiKey) : existing?.resendApiKey ?? null,
        smtpPass: input.smtpPass ? encryptSecret(input.smtpPass) : existing?.smtpPass ?? null,
        ...(input.disconnectGoogle
          ? { googleSubject: null, googleRefreshToken: null }
          : {}),
        updatedAt: now,
      };

      await db
        .insert(emailSettings)
        .values({
          organizationId: orgId,
          createdAt: now,
          ...values,
        })
        .onConflictDoUpdate({
          target: emailSettings.organizationId,
          set: values,
        });

      // Reply-To is part of the sender card, but lives on workspace_settings.
      await db
        .insert(workspaceSettings)
        .values({
          organizationId: orgId,
          invoiceReplyTo: input.replyTo,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: workspaceSettings.organizationId,
          set: { invoiceReplyTo: input.replyTo, updatedAt: now },
        });

      const updated = await db
        .select()
        .from(emailSettings)
        .where(eq(emailSettings.organizationId, orgId))
        .limit(1);
      return { ok: true, email: maskEmailConfig(updated[0] ?? null) };
    }),

  testEmail: adminOnly.handler(async ({ context }) => {
    const db = await getDb();
    const orgId = context.organizationId!;
    const to = context.session?.user?.email;
    if (!to) {
      throw new ORPCError("BAD_REQUEST", { message: "No account email to send to." });
    }

    const settingsRows = await db
      .select()
      .from(workspaceSettings)
      .where(eq(workspaceSettings.organizationId, orgId))
      .limit(1);
    const workspaceName = settingsRows[0]?.workspaceName?.trim() || "your workspace";
    const config = await getOrgEmailConfig(orgId);
    const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "AirPay";
    const subject = `Test email from ${workspaceName}`;
    const html = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111">
        <p style="font-size:13px;color:#666">Sender</p>
        <p style="font-size:15px;margin:0 0 24px">${config.from}</p>
        <h1 style="font-size:20px;margin:0 0 8px">${appName} is connected</h1>
        <p style="font-size:14px;line-height:1.6;color:#444;margin:0 0 24px">
          Invoices for <strong>${workspaceName}</strong> will be sent from this address.
          Reply-To and per-invoice settings apply on top of this sender.
        </p>
        <p style="font-size:12px;color:#888">Transport: ${config.provider}${config.usedFallback ? " (fallback to platform sender)" : ""}</p>
      </div>`;

    const now = Date.now();
    let status: "sent" | "failed" = "sent";
    let error: string | null = null;
    try {
      await sendEmail(
        { from: config.from, to, subject, html, text: `${subject}\n\nSent via ${config.provider}.` },
        config,
      );
    } catch (err) {
      status = "failed";
      error = err instanceof Error ? err.message : "Could not send the test email.";
    }

    const existing = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.organizationId, orgId))
      .limit(1);
    if (existing[0]) {
      await db
        .update(emailSettings)
        .set({ lastTestStatus: status, lastTestAt: now, lastTestError: error, updatedAt: now })
        .where(eq(emailSettings.organizationId, orgId));
    } else {
      await db
        .insert(emailSettings)
        .values({
          organizationId: orgId,
          createdAt: now,
          updatedAt: now,
          lastTestStatus: status,
          lastTestAt: now,
          lastTestError: error,
        })
        .onConflictDoUpdate({
          target: emailSettings.organizationId,
          set: {
            lastTestStatus: status,
            lastTestAt: now,
            lastTestError: error,
            updatedAt: now,
          },
        });
    }

    if (status === "failed") {
      throw new ORPCError("BAD_GATEWAY", { message: error ?? "Could not send the test email." });
    }
    return { ok: true, to };
  }),
};
