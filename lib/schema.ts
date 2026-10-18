import {
  pgTable,
  text,
  real,
  integer,
  bigint,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { EmailProvider, IntentStatus, InvoiceStatus, InvoiceTemplate } from "./api-types";
import type { CheckoutAppearance } from "./schemas/checkout-appearance";
import type { Environment } from "./environment";
import { organization, user } from "./auth-schema";

export * from "./auth-schema";

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    number: text("number").notNull(),
    slug: text("slug").notNull(),
    status: text("status").$type<InvoiceStatus>().notNull(),
    environment: text("environment").$type<Environment>().notNull().default("sandbox"),
    merchant: text("merchant").notNull(),
    customer_name: text("customer_name").notNull(),
    customer_email: text("customer_email"),
    subtotal_usd: real("subtotal_usd").notNull(),
    tax_usd: real("tax_usd").notNull().default(0),
    total_usd: real("total_usd").notNull(),
    due_at: bigint("due_at", { mode: "number" }),
    notes: text("notes"),
    template: text("template").$type<InvoiceTemplate>().notNull().default("minimal"),
    accent: text("accent").notNull().default("#6d5efc"),
    receiver: text("receiver").notNull(),
    chain_key: text("chain_key").notNull(),
    token: text("token").notNull(),
    /** Chain key -> allowed coin symbols the payer may choose from. */
    allowed: jsonb("allowed").$type<Record<string, string[]>>().notNull(),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
    sent_at: bigint("sent_at", { mode: "number" }),
    viewed_at: bigint("viewed_at", { mode: "number" }),
    paid_at: bigint("paid_at", { mode: "number" }),
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_invoices_org").on(t.organizationId),
    index("idx_invoices_org_env").on(t.organizationId, t.environment),
    index("idx_invoices_status").on(t.status),
    uniqueIndex("uq_invoices_slug").on(t.slug),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: text("id").primaryKey(),
    invoice_id: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: real("quantity").notNull().default(1),
    unit_usd: real("unit_usd").notNull(),
    amount_usd: real("amount_usd").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("idx_invoice_items_invoice").on(t.invoice_id)],
);

export const invoiceEmails = pgTable(
  "invoice_emails",
  {
    id: text("id").primaryKey(),
    invoice_id: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    to_email: text("to_email").notNull(),
    from_email: text("from_email").notNull(),
    reply_to: text("reply_to"),
    subject: text("subject").notNull(),
    status: text("status").$type<"sent" | "failed">().notNull(),
    provider: text("provider").notNull().default("resend"),
    provider_id: text("provider_id"),
    error: text("error"),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_invoice_emails_invoice").on(t.invoice_id)],
);

export const paymentIntents = pgTable(
  "payment_intents",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    merchant: text("merchant").notNull(),
    mode: text("mode").$type<"fixed" | "flex">().notNull(),
    environment: text("environment").$type<Environment>().notNull().default("sandbox"),
    amount_usd: real("amount_usd").notNull(),
    chain_key: text("chain_key").notNull(),
    token: text("token").notNull(),
    expected_units: text("expected_units").notNull(),
    receiver: text("receiver").notNull(),
    invoice_id: text("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    payer: text("payer"),
    tx_hash: text("tx_hash"),
    status: text("status").$type<IntentStatus>().notNull(),
    confirmations: integer("confirmations").notNull().default(0),
    block_number: integer("block_number"),
    error: text("error"),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
    expires_at: bigint("expires_at", { mode: "number" }).notNull(),
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    confirmed_at: bigint("confirmed_at", { mode: "number" }),
    next_verify_at: bigint("next_verify_at", { mode: "number" }),
    next_detect_at: bigint("next_detect_at", { mode: "number" }),
  },
  (t) => [
    index("idx_intents_org").on(t.organizationId),
    index("idx_intents_org_env").on(t.organizationId, t.environment),
    index("idx_intents_status").on(t.status),
    index("idx_intents_tx_hash").on(t.tx_hash),
    index("idx_intents_status_created").on(t.status, t.created_at),
    index("idx_intents_expires_at").on(t.expires_at),
    index("idx_intents_next_verify_at").on(t.next_verify_at),
    index("idx_intents_invoice").on(t.invoice_id),
  ],
);

export const kv = pgTable("kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updated_at: bigint("updated_at", { mode: "number" }).notNull(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    prefix: text("prefix").notNull(),
    hashedSecret: text("hashed_secret").notNull(),
    lastFour: text("last_four").notNull(),
    scope: text("scope").notNull().default("full"),
    environment: text("environment").$type<Environment>().notNull().default("sandbox"),
    revoked: boolean("revoked").notNull().default(false),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    lastUsedAt: bigint("last_used_at", { mode: "number" }),
  },
  (t) => [index("idx_api_keys_org").on(t.organizationId), index("idx_api_keys_org_env").on(t.organizationId, t.environment)],
);

export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    events: text("events").array().notNull().default([]),
    /** AES-256-GCM ciphertext (see `lib/crypto.ts`); never returned to the client. */
    secret: text("secret").notNull(),
    environment: text("environment").$type<Environment>().notNull().default("sandbox"),
    active: boolean("active").notNull().default(true),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(0),
  },
  (t) => [index("idx_webhooks_org").on(t.organizationId), index("idx_webhooks_org_env").on(t.organizationId, t.environment)],
);

/**
 * Canonical, idempotent log of platform events. A unique `(org, environment,
 * dedupe_key)` constraint makes re-emitting the same transition a no-op, so the
 * verification sweeps can safely retry.
 */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    environment: text("environment").$type<Environment>().notNull().default("sandbox"),
    type: text("type").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    dedupe_key: text("dedupe_key").notNull(),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("uq_webhook_events_dedupe").on(t.organizationId, t.environment, t.dedupe_key),
    index("idx_webhook_events_org").on(t.organizationId, t.created_at),
  ],
);

/** One outbound HTTP attempt stream per (event, endpoint) pair. */
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    event_id: text("event_id").notNull().references(() => webhookEvents.id, { onDelete: "cascade" }),
    webhook_id: text("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    status: text("status").$type<"pending" | "success" | "failed" | "exhausted">().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    next_attempt_at: bigint("next_attempt_at", { mode: "number" }),
    response_status: integer("response_status"),
    response_body: text("response_body"),
    error: text("error"),
    duration_ms: integer("duration_ms"),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
    updated_at: bigint("updated_at", { mode: "number" }).notNull(),
    delivered_at: bigint("delivered_at", { mode: "number" }),
  },
  (t) => [
    index("idx_webhook_deliveries_due").on(t.status, t.next_attempt_at),
    index("idx_webhook_deliveries_webhook").on(t.webhook_id, t.created_at),
    index("idx_webhook_deliveries_event").on(t.event_id),
  ],
);

export const workspaceSettings = pgTable("workspace_settings", {
  organizationId: text("organization_id").primaryKey().references(() => organization.id, { onDelete: "cascade" }),
  workspaceName: text("workspace_name").notNull().default(""),
  settlementCurrency: text("settlement_currency").notNull().default("USDC"),
  payoutSchedule: text("payout_schedule").notNull().default("Daily"),
  payoutWallet: text("payout_wallet").notNull().default(""),
  /** 'all' = payoutWallet for every network, 'per_network' = payoutAddresses. */
  payoutMode: text("payout_mode").$type<"all" | "per_network">().notNull().default("all"),
  /** Chain key -> destination address, used when payoutMode is 'per_network'. */
  payoutAddresses: jsonb("payout_addresses").$type<Record<string, string>>(),
  emailPayouts: boolean("email_payouts").notNull().default(true),
  emailFailures: boolean("email_failures").notNull().default(true),
  emailProduct: boolean("email_product").notNull().default(false),
  // Onboarding: null accountType / onboardedAt means setup is incomplete.
  accountType: text("account_type").$type<"individual" | "team">(),
  enabledChains: text("enabled_chains").array().notNull().default([]),
  enabledAssets: jsonb("enabled_assets").$type<Record<string, string[]>>(),
  invoiceSeq: integer("invoice_seq").notNull().default(0),
  /** Reply-To address used when emailing invoices on the merchant's behalf. */
  invoiceReplyTo: text("invoice_reply_to").notNull().default(""),
  /** Hosted-checkout theming. `null` falls back to the AirPay Classic default. */
  checkoutAppearance: jsonb("checkout_appearance").$type<CheckoutAppearance>(),
  onboardedAt: bigint("onboarded_at", { mode: "number" }),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const paymentLinks = pgTable(
  "payment_links",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    merchant: text("merchant").notNull(),
    mode: text("mode").$type<"fixed" | "flex">().notNull(),
    amount_usd: real("amount_usd").notNull(),
    min: real("min").notNull().default(0),
    max: real("max"),
    environment: text("environment").$type<Environment>().notNull().default("sandbox"),
    chain_key: text("chain_key").notNull(),
    token: text("token").notNull(),
    receiver: text("receiver").notNull(),
    /** Chain key -> allowed coin symbols the payer may choose from. */
    allowed: jsonb("allowed").$type<Record<string, string[]>>().notNull(),
    active: boolean("active").notNull().default(true),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_links_org").on(t.organizationId),
    index("idx_links_org_env").on(t.organizationId, t.environment),
    uniqueIndex("uq_links_slug").on(t.slug),
  ],
);

export const jobRuns = pgTable("job_runs", {
  id: text("id").primaryKey(),
  job: text("job").notNull(),
  startedAt: bigint("started_at", { mode: "number" }).notNull(),
  finishedAt: bigint("finished_at", { mode: "number" }),
  status: text("status").notNull(),
  stats: jsonb("stats"),
  error: text("error"),
});

/**
 * Per-organization outbound email transport. Secrets (API keys, passwords,
 * OAuth refresh tokens) are stored AES-256-GCM encrypted via `lib/crypto.ts`
 * and are never returned to the client.
 */
export const emailSettings = pgTable("email_settings", {
  organizationId: text("organization_id").primaryKey().references(() => organization.id, { onDelete: "cascade" }),
  provider: text("provider").$type<EmailProvider>().notNull().default("platform"),
  fromName: text("from_name").notNull().default(""),
  fromEmail: text("from_email").notNull().default(""),
  /** Encrypted. */
  resendApiKey: text("resend_api_key"),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpSecure: boolean("smtp_secure"),
  smtpUser: text("smtp_user"),
  /** Encrypted. */
  smtpPass: text("smtp_pass"),
  /** Google account address granted via OAuth. */
  googleSubject: text("google_subject"),
  /** Encrypted. */
  googleRefreshToken: text("google_refresh_token"),
  lastTestStatus: text("last_test_status").$type<"sent" | "failed">(),
  lastTestAt: bigint("last_test_at", { mode: "number" }),
  lastTestError: text("last_test_error"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export type PaymentIntentRow = typeof paymentIntents.$inferSelect;
export type WorkspaceSettingsRow = typeof workspaceSettings.$inferSelect;
export type PaymentLinkRow = typeof paymentLinks.$inferSelect;
export type InvoiceRow = typeof invoices.$inferSelect;
export type InvoiceItemRow = typeof invoiceItems.$inferSelect;
export type InvoiceEmailRow = typeof invoiceEmails.$inferSelect;
export type EmailSettingsRow = typeof emailSettings.$inferSelect;
export type WebhookRow = typeof webhooks.$inferSelect;
export type WebhookEventRow = typeof webhookEvents.$inferSelect;
export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
