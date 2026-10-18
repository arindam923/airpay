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
import type { IntentStatus } from "./api-types";
import { organization, user } from "./auth-schema";

export * from "./auth-schema";

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
    amount_usd: real("amount_usd").notNull(),
    chain_key: text("chain_key").notNull(),
    token: text("token").notNull(),
    expected_units: text("expected_units").notNull(),
    receiver: text("receiver").notNull(),
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
    index("idx_intents_status").on(t.status),
    index("idx_intents_tx_hash").on(t.tx_hash),
    index("idx_intents_status_created").on(t.status, t.created_at),
    index("idx_intents_expires_at").on(t.expires_at),
    index("idx_intents_next_verify_at").on(t.next_verify_at),
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
    revoked: boolean("revoked").notNull().default(false),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    lastUsedAt: bigint("last_used_at", { mode: "number" }),
  },
  (t) => [index("idx_api_keys_org").on(t.organizationId)],
);

export const webhooks = pgTable(
  "webhooks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    events: text("events").array().notNull().default([]),
    secret: text("secret").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("idx_webhooks_org").on(t.organizationId)],
);

export const workspaceSettings = pgTable("workspace_settings", {
  organizationId: text("organization_id").primaryKey().references(() => organization.id, { onDelete: "cascade" }),
  workspaceName: text("workspace_name").notNull().default(""),
  settlementCurrency: text("settlement_currency").notNull().default("USDC"),
  payoutSchedule: text("payout_schedule").notNull().default("Daily"),
  payoutWallet: text("payout_wallet").notNull().default(""),
  emailPayouts: boolean("email_payouts").notNull().default(true),
  emailFailures: boolean("email_failures").notNull().default(true),
  emailProduct: boolean("email_product").notNull().default(false),
  // Onboarding: null accountType / onboardedAt means setup is incomplete.
  accountType: text("account_type").$type<"individual" | "team">(),
  enabledChains: text("enabled_chains").array().notNull().default([]),
  enabledAssets: jsonb("enabled_assets").$type<Record<string, string[]>>(),
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

export type PaymentIntentRow = typeof paymentIntents.$inferSelect;
export type WorkspaceSettingsRow = typeof workspaceSettings.$inferSelect;
export type PaymentLinkRow = typeof paymentLinks.$inferSelect;
