import { z } from "zod";
import { TESTNETS } from "@/lib/chains";
import { TESTNET_COINS } from "@/lib/tokens";

export const ACCOUNT_TYPES = ["individual", "team"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

const coinSchema = z.enum(TESTNET_COINS);
const chainSchema = z
  .string()
  .refine((key) => key in TESTNETS, { message: "Unsupported network." });

export const onboardingInviteSchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export const completeOnboardingSchema = z
  .object({
    accountType: z.enum(ACCOUNT_TYPES),
    enabledChains: z.array(chainSchema).min(1, "Enable at least one network."),
    enabledAssets: z.record(chainSchema, z.array(coinSchema).min(1)),
    payoutWallet: z
      .string()
      .trim()
      .regex(/^0x[0-9a-fA-F]{40}$/, "Enter a valid 0x wallet address."),
    invites: z.array(onboardingInviteSchema).optional(),
  })
  .superRefine((val, ctx) => {
    for (const chain of val.enabledChains) {
      const assets = val.enabledAssets[chain];
      if (!assets || assets.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["enabledAssets", chain],
          message: "Pick at least one asset for every enabled network.",
        });
      }
    }
  });

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
