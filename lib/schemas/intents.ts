import { z } from "zod";

export const createIntentSchema = z.object({
  slug: z.string().min(1).max(80).default("checkout"),
  title: z.string().min(1).max(200),
  merchant: z.string().min(1).max(200),
  mode: z.enum(["fixed", "flex"]),
  amount: z.number().positive(),
  min: z.number().nonnegative().default(0),
  max: z.number().nullable().optional(),
  chain: z.string().min(1),
  coin: z.enum(["USDC", "ETH"]),
});

export const submitTxSchema = z.object({
  intentId: z.string().uuid(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  payer: z.string().regex(/^0x[0-9a-fA-F]{40}$/).nullable().optional(),
});

export const getIntentSchema = z.object({ id: z.string().uuid() });
