import type { Environment } from "./environment";

export type IntentStatus =
  | "created"
  | "awaiting_payment"
  | "submitted"
  | "confirming"
  | "confirmed"
  | "failed"
  | "expired";

export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "void" | "overdue";

export type InvoiceTemplate = "minimal" | "classic" | "branded";

export type WebhookDeliveryStatus = "pending" | "success" | "failed" | "exhausted";

/** Secret keys authenticate servers; publishable keys identify browsers. */
export type ApiKeyKind = "secret" | "publishable";

export type CheckoutSessionStatus = "open" | "complete" | "expired";

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  environment: Environment;
  createdAt: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  url: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  attempts: number;
  responseStatus: number | null;
  error: string | null;
  durationMs: number | null;
  createdAt: number;
  deliveredAt: number | null;
}

/** Outbound invoice email transport: platform-managed or merchant-owned. */
export type EmailProvider = "platform" | "resend" | "smtp" | "google";

export interface PublicInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitUsd: number;
  amountUsd: number;
}

export interface PublicInvoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  merchant: string;
  customerName: string;
  customerEmail: string | null;
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
  dueAt: number | null;
  notes: string | null;
  template: InvoiceTemplate;
  accent: string;
  slug: string;
  chainKey: string;
  chainName: string;
  token: string;
  allowed: Record<string, string[]>;
  receiver: string;
  environment: Environment;
  createdAt: number;
  sentAt: number | null;
  viewedAt: number | null;
  paidAt: number | null;
}

export interface PublicInvoiceDetail extends PublicInvoice {
  items: PublicInvoiceItem[];
}

export interface PublicIntent {
  id: string;
  status: IntentStatus;
  amountUsd: number;
  token: string;
  chainKey: string;
  chainName: string;
  expectedUnits: string;
  receiver: string;
  /** Settlement contract routing — null for the legacy direct-transfer path. */
  merchantId: string | null;
  feeBps: number | null;
  feeUnits: string | null;
  netUnits: string | null;
  feeUsd: number | null;
  netUsd: number | null;
  payer: string | null;
  txHash: string | null;
  confirmations: number;
  requiredConfirmations: number;
  explorerTx: string | null;
  expiresAt: number;
  error: string | null;
  merchant: string;
  title: string;
  environment: Environment;
  /** Invoice this payment settles, when started from an invoice checkout. */
  invoiceId: string | null;
  metadata: Record<string, string> | null;
  createdAt: number;
  confirmedAt: number | null;
}
