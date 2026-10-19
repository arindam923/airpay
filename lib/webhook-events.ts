/**
 * Webhook event catalog — dependency-free so schemas, UI and the delivery
 * engine can all share it without pulling in the database module.
 */

export const WEBHOOK_EVENT_TYPES = [
  "payment.created",
  "payment.submitted",
  "payment.confirmed",
  "payment.failed",
  "payment.expired",
  "checkout.session.completed",
  "checkout.session.expired",
  "invoice.created",
  "invoice.sent",
  "invoice.viewed",
  "invoice.paid",
  "invoice.void",
  "link.created",
  "link.revoked",
  "webhook.test",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/** Endpoints subscribing to `*` receive every event type. */
export const WILDCARD = "*";

/** Event types a merchant may subscribe to (synthetic test events excluded). */
export const WEBHOOK_SUBSCRIBABLE_EVENTS = WEBHOOK_EVENT_TYPES.filter(
  (t): t is Exclude<WebhookEventType, "webhook.test"> => t !== "webhook.test",
);

export type WebhookEventLabel = { value: string; label: string; group: string };

/** Human labels used by the dashboard event picker. */
export const WEBHOOK_EVENT_OPTIONS: WebhookEventLabel[] = [
  { value: WILDCARD, label: "All events", group: "General" },
  { value: "payment.created", label: "Payment created", group: "Payments" },
  { value: "payment.submitted", label: "Payment submitted", group: "Payments" },
  { value: "payment.confirmed", label: "Payment confirmed", group: "Payments" },
  { value: "payment.failed", label: "Payment failed", group: "Payments" },
  { value: "payment.expired", label: "Payment expired", group: "Payments" },
  { value: "checkout.session.completed", label: "Checkout completed", group: "Checkout" },
  { value: "checkout.session.expired", label: "Checkout expired", group: "Checkout" },
  { value: "invoice.created", label: "Invoice created", group: "Invoices" },
  { value: "invoice.sent", label: "Invoice sent", group: "Invoices" },
  { value: "invoice.viewed", label: "Invoice viewed", group: "Invoices" },
  { value: "invoice.paid", label: "Invoice paid", group: "Invoices" },
  { value: "invoice.void", label: "Invoice voided", group: "Invoices" },
  { value: "link.created", label: "Link created", group: "Payment links" },
  { value: "link.revoked", label: "Link revoked", group: "Payment links" },
];

export function isWebhookEventType(value: string): value is WebhookEventType {
  return (WEBHOOK_EVENT_TYPES as readonly string[]).includes(value);
}
