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
  primaryKey,
} from "drizzle-orm/pg-core";
import type {
  ApiKeyKind,
  CheckoutSessionStatus,
  EmailProvider,
  IntentStatus,
  InvoiceStatus,
  InvoiceTemplate,
} from "./api-types";
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
    /**
     * Settlement contract routing. All four are null for the legacy direct-
     * transfer path (no contract configured for the chain); when set, `receiver`
     * is the settlement contract and the fee is split on-chain.
     */
    merchant_id: text("merchant_id"),
    fee_bps: integer("fee_bps"),
    fee_units: text("fee_units"),
    net_units: text("net_units"),
    invoice_id: text("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    /** SHA-256 of the API `client_secret`; only the hash is stored. */
    client_secret_hash: text("client_secret_hash"),
    /** Free-form merchant metadata echoed back on API reads and webhooks. */
    metadata: jsonb("metadata").$type<Record<string, string>>(),
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

/**
 * Hosted checkout session created through the public API. Wraps a payment
 * intent with redirect URLs and merchant metadata; the `/checkout/[id]` page
 * renders it and redirects to `successUrl` once paid.
 */
export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    environment: text("environment").$type<Environment>().notNull().default("sandbox"),
    intent_id: text("intent_id").references(() => paymentIntents.id, { onDelete: "set null" }),
    status: text("status").$type<CheckoutSessionStatus>().notNull().default("open"),
    success_url: text("success_url"),
    cancel_url: text("cancel_url"),
    client_reference_id: text("client_reference_id"),
    metadata: jsonb("metadata").$type<Record<string, string>>(),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
    expires_at: bigint("expires_at", { mode: "number" }).notNull(),
    completed_at: bigint("completed_at", { mode: "number" }),
  },
  (t) => [
    index("idx_checkout_sessions_org").on(t.organizationId, t.created_at),
    index("idx_checkout_sessions_intent").on(t.intent_id),
    index("idx_checkout_sessions_status").on(t.status, t.expires_at),
  ],
);

/**
 * Durable Idempotency-Key store for the public API. A key is unique per
 * (organization, environment); completed responses are replayed verbatim.
 */
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    environment: text("environment").$type<Environment>().notNull().default("sandbox"),
    key: text("key").notNull(),
    request_hash: text("request_hash").notNull(),
    status: text("status").$type<"in_progress" | "completed">().notNull().default("in_progress"),
    response_status: integer("response_status"),
    response_body: text("response_body"),
    created_at: bigint("created_at", { mode: "number" }).notNull(),
    expires_at: bigint("expires_at", { mode: "number" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.environment, t.key] }),
    index("idx_idempotency_expires").on(t.expires_at),
  ],
);

export const kv = pgTable("kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updated_at: bigint("updated_at", { mode: "number" }).notNull(),
});

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    source: text("source").notNull().default("landing"),
    status: text("status").$type<"pending" | "invited" | "removed">().notNull().default("pending"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("uq_waitlist_email").on(t.emailNormalized),
    index("idx_waitlist_created").on(t.createdAt),
    index("idx_waitlist_status").on(t.status),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    prefix: text("prefix").notNull(),
    hashedSecret: text("hashed_secret").notNull(),
    lastFour: text("last_four").notNull(),
    /** `secret` for server keys, `publishable` for browser-safe keys. */
    kind: text("kind").$type<ApiKeyKind>().notNull().default("secret"),
    /**
     * Plaintext publishable key. Publishable keys are public by design, so the
     * dashboard can display them at any time; secret keys never store this.
     */
    publicValue: text("public_value"),
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
  /** Per-org switch that unlocks production (mainnet) resources from the dashboard. */
  productionEnabled: boolean("production_enabled").notNull().default(false),
  productionEnabledAt: bigint("production_enabled_at", { mode: "number" }),
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

/**
 * Per-organization on-chain merchant registration for the AirPay settlement
 * contract. One row per (organization, chain). Mirrors the contract's `Merchant`
 * registry so payments can be routed and fees displayed without an RPC call.
 */
export const settlementMerchants = pgTable(
  "settlement_merchants",
  {
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    chainKey: text("chain_key").notNull(),
    /** bytes32 merchant id (hex) used by the contract. */
    merchantId: text("merchant_id").notNull(),
    contractAddress: text("contract_address").notNull(),
    /** Payout snapshot registered on-chain for this chain. */
    payoutAddress: text("payout_address").notNull(),
    /** Platform fee in basis points (90 = 0.90%). */
    feeBps: integer("fee_bps").notNull().default(90),
    status: text("status").$type<"pending" | "active" | "failed">().notNull().default("pending"),
    environment: text("environment").$type<Environment>().notNull().default("sandbox"),
    registerTxHash: text("register_tx_hash"),
    error: text("error"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.chainKey] }),
    index("idx_settlement_merchants_org").on(t.organizationId),
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
export type SettlementMerchantRow = typeof settlementMerchants.$inferSelect;
export type InvoiceRow = typeof invoices.$inferSelect;
export type InvoiceItemRow = typeof invoiceItems.$inferSelect;
export type InvoiceEmailRow = typeof invoiceEmails.$inferSelect;
export type EmailSettingsRow = typeof emailSettings.$inferSelect;
export type WebhookRow = typeof webhooks.$inferSelect;
export type WebhookEventRow = typeof webhookEvents.$inferSelect;
export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
export type CheckoutSessionRow = typeof checkoutSessions.$inferSelect;
export type IdempotencyKeyRow = typeof idempotencyKeys.$inferSelect;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
