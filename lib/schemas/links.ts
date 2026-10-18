import { z } from "zod";

export const createLinkSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    merchant: z.string().trim().min(1).max(200),
    mode: z.enum(["fixed", "flex"]),
    amount: z.number().positive(),
    min: z.number().nonnegative().default(0),
    max: z.number().nullable().optional(),
    chain: z.string().min(1),
    coin: z.enum(["USDC", "ETH"]),
  })
  .refine((v) => v.mode !== "flex" || v.amount >= v.min, {
    message: "Suggested amount must be at least the minimum.",
    path: ["amount"],
  });

export const revokeLinkSchema = z.object({ id: z.string().min(1) });

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
