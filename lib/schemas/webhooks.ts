import { z } from "zod";
import { WEBHOOK_SUBSCRIBABLE_EVENTS, WILDCARD } from "@/lib/webhook-events";

/** HTTPS-only: webhook targets must be reachable securely. */
const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), { message: "Endpoint URL must use https://" });

const eventType = z.enum([
  WILDCARD,
  ...(WEBHOOK_SUBSCRIBABLE_EVENTS as [string, ...string[]]),
]);

export const createWebhookSchema = z.object({
  url: httpsUrl,
  events: z.array(eventType).min(1, "Select at least one event."),
});

export const toggleWebhookSchema = z.object({ id: z.string().min(1), active: z.boolean() });
export const deleteWebhookSchema = z.object({ id: z.string().min(1) });
export const webhookIdSchema = z.object({ id: z.string().min(1) });
export const webhookDeliveryIdSchema = z.object({ id: z.string().min(1) });
export const listDeliveriesSchema = z.object({
  webhookId: z.string().min(1).optional(),
  status: z.enum(["pending", "success", "failed", "exhausted"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
