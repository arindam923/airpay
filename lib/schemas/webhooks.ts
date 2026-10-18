import { z } from "zod";

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export const toggleWebhookSchema = z.object({ id: z.string().min(1), active: z.boolean() });
export const deleteWebhookSchema = z.object({ id: z.string().min(1) });
