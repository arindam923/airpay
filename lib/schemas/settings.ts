import { z } from "zod";

export const updateSettingsSchema = z.object({
  workspaceName: z.string().min(1).max(80),
  settlementCurrency: z.string().min(1),
  payoutSchedule: z.string().min(1),
  payoutWallet: z.string().regex(/^0x[a-fA-F0-9]{8,}$/),
  emailPayouts: z.boolean(),
  emailFailures: z.boolean(),
  emailProduct: z.boolean(),
});
