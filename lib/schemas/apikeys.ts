import { z } from "zod";

export const createApiKeySchema = z.object({
  label: z.string().min(1).max(80),
  scope: z.enum(["full", "readonly"]).default("full"),
  kind: z.enum(["secret", "publishable"]).default("secret"),
});

export const revokeApiKeySchema = z.object({ id: z.string().min(1) });
