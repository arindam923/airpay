import { z } from "zod";
import { TESTNETS } from "@/lib/chains";
import { TESTNET_COINS } from "@/lib/tokens";

export const PAYOUT_MODES = ["all", "per_network"] as const;
export type PayoutMode = (typeof PAYOUT_MODES)[number];

export const EMAIL_PROVIDERS = ["platform", "resend", "smtp", "google"] as const;

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

const chainKeySchema = z
  .string()
  .refine((key) => key in TESTNETS, { message: "Unsupported network." });

const addressSchema = z
  .string()
  .trim()
  .regex(EVM_ADDRESS_RE, "Enter a valid 0x wallet address (40 hex characters).");

export const updateSettingsSchema = z
  .object({
    workspaceName: z.string().min(1).max(80),
    payoutMode: z.enum(PAYOUT_MODES).default("all"),
    /** Required in 'all' mode; ignored in 'per_network' (derived server-side). */
    payoutWallet: z.union([addressSchema, z.literal("")]).default(""),
    payoutAddresses: z.record(chainKeySchema, addressSchema).default({}),
    enabledChains: z.array(chainKeySchema).min(1, "Enable at least one network."),
    enabledAssets: z.record(chainKeySchema, z.array(z.enum(TESTNET_COINS)).min(1)),
    emailPayouts: z.boolean(),
    emailFailures: z.boolean(),
    emailProduct: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.payoutMode === "all" && !EVM_ADDRESS_RE.test(val.payoutWallet)) {
      ctx.addIssue({
        code: "custom",
        path: ["payoutWallet"],
        message: "Enter a valid 0x wallet address (40 hex characters).",
      });
    }
    for (const chain of val.enabledChains) {
      if ((val.enabledAssets[chain] ?? []).length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["enabledAssets", chain],
          message: "Pick at least one asset for every enabled network.",
        });
      }
      if (val.payoutMode === "per_network") {
        const addr = val.payoutAddresses[chain];
        if (!addr || !EVM_ADDRESS_RE.test(addr)) {
          ctx.addIssue({
            code: "custom",
            path: ["payoutAddresses", chain],
            message: "Add a destination address for every enabled network.",
          });
        }
      }
    }
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/** Dashboard "Go live" switch — opt the workspace into production (mainnet). */
export const setProductionSchema = z.object({ enabled: z.boolean() });

const optionalEmail = z.union([z.literal(""), z.email().max(200)]).default("");

/**
 * Empty / omitted secrets mean "keep what's already stored" — the server
 * merges them against the existing `email_settings` row.
 */
export const updateEmailSchema = z.object({
  provider: z.enum(EMAIL_PROVIDERS),
  fromName: z.string().trim().max(80).default(""),
  fromEmail: optionalEmail,
  resendApiKey: z.string().trim().max(300).optional(),
  smtpHost: z.string().trim().max(200).default(""),
  smtpPort: z.number().int().min(1).max(65535).default(465),
  smtpSecure: z.boolean().default(true),
  smtpUser: z.string().trim().max(200).default(""),
  smtpPass: z.string().trim().max(500).optional(),
  replyTo: optionalEmail,
  disconnectGoogle: z.boolean().default(false),
});

export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
