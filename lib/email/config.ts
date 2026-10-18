import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailSettings } from "@/lib/schema";
import type { EmailProvider } from "@/lib/api-types";
import { decryptSecret } from "@/lib/crypto";
import { emailFrom } from "./client";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface ResolvedEmailConfig {
  /** Effective transport — `platform` when the merchant config is incomplete. */
  provider: EmailProvider;
  /** RFC 5322 sender, e.g. `Acme Billing <billing@acme.com>`. */
  from: string;
  /** True when the merchant's own config was abandoned for the platform sender. */
  usedFallback: boolean;
  resendApiKey?: string;
  smtp?: SmtpConfig;
  google?: { subject: string; refreshToken: string };
}

export function formatFrom(name: string | null | undefined, email: string): string {
  const trimmedName = (name ?? "").trim();
  return trimmedName ? `${trimmedName} <${email}>` : email;
}

export async function getEmailSettingsRow(orgId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(emailSettings)
    .where(eq(emailSettings.organizationId, orgId))
    .limit(1);
  return rows[0] ?? null;
}

/** Never call with secrets — use `maskEmailConfig` before returning to clients. */
export { decryptSecret };

function platformConfig(): ResolvedEmailConfig {
  return { provider: "platform", from: emailFrom(), usedFallback: false };
}

/**
 * Resolves the effective sending config for an organization. Incomplete or
 * broken merchant configs fall back to the platform sender (with a warning) so
 * invoices never silently fail to leave the building.
 */
export async function getOrgEmailConfig(orgId: string): Promise<ResolvedEmailConfig> {
  const row = await getEmailSettingsRow(orgId);
  if (!row) return platformConfig();

  const warn = (reason: string) =>
    console.warn(`[email] org ${orgId} using platform sender: ${reason}`);

  if (row.provider === "resend") {
    const key = decryptSecret(row.resendApiKey);
    if (key && row.fromEmail) {
      return {
        provider: "resend",
        from: formatFrom(row.fromName, row.fromEmail),
        usedFallback: false,
        resendApiKey: key,
      };
    }
    warn("resend config incomplete (missing API key or from address).");
    return { ...platformConfig(), usedFallback: true };
  }

  if (row.provider === "smtp") {
    if (row.smtpHost && row.smtpPort && row.fromEmail) {
      return {
        provider: "smtp",
        from: formatFrom(row.fromName, row.fromEmail),
        usedFallback: false,
        smtp: {
          host: row.smtpHost,
          port: row.smtpPort,
          secure: row.smtpSecure ?? true,
          user: row.smtpUser ?? "",
          pass: decryptSecret(row.smtpPass),
        },
      };
    }
    warn("smtp config incomplete (missing host, port, or from address).");
    return { ...platformConfig(), usedFallback: true };
  }

  if (row.provider === "google") {
    const refreshToken = decryptSecret(row.googleRefreshToken);
    if (refreshToken && row.googleSubject) {
      return {
        provider: "google",
        from: formatFrom(row.fromName || row.googleSubject, row.fromEmail || row.googleSubject),
        usedFallback: false,
        google: { subject: row.googleSubject, refreshToken },
      };
    }
    warn("google account not connected.");
    return { ...platformConfig(), usedFallback: true };
  }

  return platformConfig();
}

/** Safe-to-return projection of `email_settings` — no secrets leave the server. */
export function maskEmailConfig(row: Awaited<ReturnType<typeof getEmailSettingsRow>>) {
  return {
    provider: row?.provider ?? "platform",
    fromName: row?.fromName ?? "",
    fromEmail: row?.fromEmail ?? "",
    smtpHost: row?.smtpHost ?? "",
    smtpPort: row?.smtpPort ?? 465,
    smtpSecure: row?.smtpSecure ?? true,
    smtpUser: row?.smtpUser ?? "",
    hasResendKey: !!row?.resendApiKey,
    hasSmtpPass: !!row?.smtpPass,
    googleSubject: row?.googleSubject ?? null,
    hasGoogle: !!row?.googleRefreshToken,
    lastTestStatus: row?.lastTestStatus ?? null,
    lastTestAt: row?.lastTestAt ?? null,
    lastTestError: row?.lastTestError ?? null,
    /** Platform sender identity (env `EMAIL_FROM`) for the default provider. */
    platformFrom: emailFrom(),
    /** Whether this deployment can run the Google OAuth connect flow. */
    googleAvailable: !!(
      process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
    ),
  };
}

export type MaskedEmailConfig = ReturnType<typeof maskEmailConfig>;
