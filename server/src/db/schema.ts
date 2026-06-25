import { sqliteTable, text, integer, real, unique } from "drizzle-orm/sqlite-core"

// Auth tables (better-auth)
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

// Merchant Profiles
export const merchantProfiles = sqliteTable("merchant_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  feeType: text("fee_type").notNull().default("part_of"), // 'part_of' or 'on_top'
  feePercentage: integer("fee_percentage").notNull().default(200), // basis points (200 = 2%)
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  sandboxMode: integer("sandbox_mode", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

// Merchant Wallets (one per network)
export const merchantWallets = sqliteTable("merchant_wallets", {
  id: text("id").primaryKey(),
  merchantProfileId: text("merchant_profile_id")
    .notNull()
    .references(() => merchantProfiles.id, { onDelete: "cascade" }),
  network: text("network").notNull(),
  walletAddress: text("wallet_address").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

// Checkout Sessions
export const checkOutSessions = sqliteTable("check_out_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  merchantProfileId: text("merchant_profile_id")
    .notNull()
    .references(() => merchantProfiles.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  amount: integer("amount").notNull(), // total amount in cents (what buyer sees)
  feeAmount: integer("fee_amount").notNull(), // 2% fee in cents
  merchantAmount: integer("merchant_amount").notNull(), // amount merchant receives
  currency: text("currency").notNull(),
  network: text("network").notNull(),
  companyWalletAddress: text("company_wallet_address").notNull(),
  merchantWalletAddress: text("merchant_wallet_address").notNull(),
  collectEmail: integer("collect_email", { mode: "boolean" }).notNull().default(false),
  buyerEmail: text("buyer_email"),
  buyerAddress: text("buyer_address"),
  signature: text("signature"),
  status: text("status").notNull().default("pending"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

// Payments
export const payment = sqliteTable("payments", {
  id: text("id").primaryKey(),
  checkoutSessionId: text("checkout_session_id")
    .notNull()
    .references(() => checkOutSessions.id, { onDelete: "cascade" }),
  txHash: text("tx_hash").notNull(),
  feeTxHash: text("fee_tx_hash"),
  buyerAddress: text("buyer_address"),
  signature: text("signature"),
  amount: integer("amount").notNull(),
  feeAmount: integer("fee_amount").notNull(),
  merchantAmount: integer("merchant_amount").notNull(),
  status: text("status").notNull().default("pending_confirmation"),
  blockchainStatus: text("blockchain_status").notNull().default("pending"),
  confirmations: integer("confirmations").notNull().default(0),
  retryCount: integer("retry_count").notNull().default(0),
  nextRetryAt: integer("next_retry_at", { mode: "timestamp_ms" }),
  failureReason: text("failure_reason"),
  webhookDelivered: integer("webhook_delivered", { mode: "boolean" }).notNull().default(false),
  webhookDeliveryCount: integer("webhook_delivery_count").notNull().default(0),
  settledAt: integer("settled_at", { mode: "timestamp_ms" }),
  lockedAt: integer("locked_at", { mode: "timestamp_ms" }),
  lockedBy: text("locked_by"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => ({
  // Prevent the same checkout session + tx hash from being credited twice.
  uniqCheckoutTx: unique("uniq_checkout_tx").on(table.checkoutSessionId, table.txHash),
}))

// Webhook Deliveries
export const webhookDeliveries = sqliteTable("webhook_deliveries", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id")
    .notNull()
    .references(() => payment.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  url: text("url").notNull(),
  statusCode: integer("status_code"),
  responseBody: text("response_body"),
  attempt: integer("attempt").notNull(),
  deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
})

// API Keys (publishable, secret, signing) — full value never stored, only sha256 hash
export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  merchantProfileId: text("merchant_profile_id")
    .notNull()
    .references(() => merchantProfiles.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'publishable' | 'secret' | 'signing'
  environment: text("environment").notNull(), // 'test' | 'live'
  prefix: text("prefix").notNull(), // 'pk_test_' | 'pk_live_' | 'sk_test_' | 'sk_live_' | 'whsec_'
  hashedValue: text("hashed_value").notNull(),
  lastFour: text("last_four").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
})

// Idempotency keys (for POST /api/v1/checkout/sessions)
export const idempotencyKeys = sqliteTable("idempotency_keys", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  requestMethod: text("request_method").notNull(),
  requestPath: text("request_path").notNull(),
  requestBodyHash: text("request_body_hash").notNull(),
  responseStatus: integer("response_status").notNull(),
  responseBody: text("response_body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
})

// Webhook retry queue
export const webhookRetries = sqliteTable("webhook_retries", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id")
    .notNull()
    .references(() => payment.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  url: text("url").notNull(),
  payload: text("payload").notNull(),
  signatureHeader: text("signature_header").notNull(),
  attempt: integer("attempt").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  nextAttemptAt: integer("next_attempt_at", { mode: "timestamp_ms" }).notNull(),
  lastStatusCode: integer("last_status_code"),
  lastError: text("last_error"),
  failedPermanently: integer("failed_permanently", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

// Webhook event subscriptions (per merchant, per event)
export const webhookEventSubscriptions = sqliteTable("webhook_event_subscriptions", {
  id: text("id").primaryKey(),
  merchantProfileId: text("merchant_profile_id")
    .notNull()
    .references(() => merchantProfiles.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

// Settlement settings (1:1 with merchant profile)
// NOTE: AirPay is non-custodial. Funds settle directly to merchant wallets on-chain.
// This table only stores merchant preferences, not sweep/gas rules.
export const settlementSettings = sqliteTable("settlement_settings", {
  id: text("id").primaryKey(),
  merchantProfileId: text("merchant_profile_id")
    .notNull()
    .unique()
    .references(() => merchantProfiles.id, { onDelete: "cascade" }),
  enabledChains: text("enabled_chains").notNull().default('["Solana","Arbitrum","Polygon"]'),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})
