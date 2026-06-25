import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and, desc } from "drizzle-orm"
import { getDB } from "../../db"
import * as schema from "../../db/schema"
import type { Env } from "../../index"
import { apiKeyAuth, getAuthProfile } from "../../middleware/apiKeyAuth"

const v1 = new Hono<Env>()

// Shared constants — keep in sync with existing /api/checkout routes
const CURRENCIES = ["USDC", "USDT", "EURC"] as const
const NETWORKS = ["Solana", "Arbitrum", "Polygon", "Ethereum"] as const

// ---------------------------------------------------------------------------
// Error helpers — uniform, machine-friendly shape for SDK consumers
// ---------------------------------------------------------------------------
function errorResponse(c: any, status: number, type: string, message: string, extra?: Record<string, unknown>) {
  return c.json({ error: { type, message, ...(extra || {}) } }, status)
}

// ---------------------------------------------------------------------------
// POST /api/v1/checkout/sessions  (secret key)
// Create a new checkout session on behalf of the authenticated merchant.
// ---------------------------------------------------------------------------
const createSessionSchema = z.object({
  product_name: z.string().min(1).max(200),
  amount: z.number().int().positive().max(1_000_000_00), // cents
  currency: z.enum(CURRENCIES),
  network: z.enum(NETWORKS),
  collect_email: z.boolean().default(false),
  expires_in: z.number().int().positive().max(60 * 60).default(30 * 60), // seconds
  metadata: z.record(z.string(), z.string()).optional(),
})

v1.post("/checkout/sessions", apiKeyAuth(["secret"]), zValidator("json", createSessionSchema), async (c) => {
  const profile = getAuthProfile(c)
  if (!profile) return errorResponse(c, 401, "authentication_error", "No authenticated merchant")

  const body = c.req.valid("json")
  const db = getDB(c.env.DB)

  // Resolve merchant wallet for the requested network
  const wallet = await db
    .select()
    .from(schema.merchantWallets)
    .where(and(
      eq(schema.merchantWallets.merchantProfileId, profile.id),
      eq(schema.merchantWallets.network, body.network),
    ))
    .limit(1)

  if (!wallet || wallet.length === 0) {
    return errorResponse(c, 400, "invalid_request_error", `Wallet not configured for ${body.network}`)
  }

  // Resolve company wallet from env
  const companyWalletMap: Record<string, string | undefined> = {
    Solana: c.env.COMPANY_SOLANA_WALLET,
    Arbitrum: c.env.COMPANY_ARBITRUM_WALLET,
    Polygon: c.env.COMPANY_POLYGON_WALLET,
    Ethereum: c.env.COMPANY_ETHEREUM_WALLET,
  }
  const companyWalletAddress = companyWalletMap[body.network]
  if (!companyWalletAddress) {
    return errorResponse(c, 500, "internal_error", `Company wallet not configured for ${body.network}`)
  }

  // Calculate fees (basis points; 200 = 2%)
  const feeAmount = Math.round((body.amount * profile.feePercentage) / 10000)
  const merchantAmount = profile.feeType === "on_top" ? body.amount : body.amount - feeAmount
  const totalAmount = profile.feeType === "on_top" ? body.amount + feeAmount : body.amount

  const id = crypto.randomUUID()
  const now = Date.now()
  const expiresAt = now + body.expires_in * 1000

  await db.insert(schema.checkOutSessions).values({
    id,
    userId: profile.userId,
    merchantProfileId: profile.id,
    productName: body.product_name,
    amount: totalAmount,
    feeAmount,
    merchantAmount,
    currency: body.currency,
    network: body.network,
    companyWalletAddress,
    merchantWalletAddress: wallet[0].walletAddress,
    collectEmail: body.collect_email,
    status: "pending",
    expiresAt: new Date(expiresAt),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  })

  return c.json({
    id,
    object: "checkout.session",
    product_name: body.product_name,
    amount: totalAmount,
    fee_amount: feeAmount,
    merchant_amount: merchantAmount,
    currency: body.currency,
    network: body.network,
    fee_type: profile.feeType,
    fee_percentage: profile.feePercentage,
    merchant_wallet_address: wallet[0].walletAddress,
    company_wallet_address: companyWalletAddress,
    collect_email: body.collect_email,
    status: "pending",
    expires_at: expiresAt,
    created_at: now,
    metadata: body.metadata ?? null,
  }, 201)
})

// ---------------------------------------------------------------------------
// GET /api/v1/checkout/sessions/:id  (publishable or secret)
// Retrieve a session. Public-safe: contains wallet addresses the buyer needs.
// ---------------------------------------------------------------------------
v1.get("/checkout/sessions/:id", apiKeyAuth(["publishable", "secret"]), async (c) => {
  const id = c.req.param("id")
  const db = getDB(c.env.DB)

  const rows = await db
    .select()
    .from(schema.checkOutSessions)
    .where(eq(schema.checkOutSessions.id, id))
    .limit(1)

  if (!rows || rows.length === 0) {
    return errorResponse(c, 404, "not_found_error", "Checkout session not found")
  }

  const s = rows[0]
  if (s.expiresAt.getTime() < Date.now()) {
    return errorResponse(c, 410, "resource_expired", "Checkout session expired")
  }

  const profileRows = await db
    .select()
    .from(schema.merchantProfiles)
    .where(eq(schema.merchantProfiles.id, s.merchantProfileId))
    .limit(1)
  const feeType = profileRows[0]?.feeType ?? "part_of"

  return c.json({
    id: s.id,
    object: "checkout.session",
    product_name: s.productName,
    amount: s.amount,
    fee_amount: s.feeAmount,
    merchant_amount: s.merchantAmount,
    currency: s.currency,
    network: s.network,
    fee_type: feeType,
    collect_email: s.collectEmail,
    merchant_wallet_address: s.merchantWalletAddress,
    company_wallet_address: s.companyWalletAddress,
    status: s.status,
    expires_at: s.expiresAt.getTime(),
    created_at: s.createdAt.getTime(),
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/checkout/sessions/:id/confirm  (NO AUTH — buyer side)
// Submit a payment for the checkout session. The buyer's wallet signs and
// submits the on-chain tx; this just records it for verification by the cron.
// ---------------------------------------------------------------------------
const confirmSchema = z.object({
  tx_hash: z.string().min(10).max(200),
  buyer_address: z.string().min(10).max(100),
  signature: z.string().min(1).max(500),
  buyer_email: z.string().email().optional(),
})

v1.post("/checkout/sessions/:id/confirm", zValidator("json", confirmSchema), async (c) => {
  const id = c.req.param("id")
  const db = getDB(c.env.DB)

  const rows = await db
    .select()
    .from(schema.checkOutSessions)
    .where(eq(schema.checkOutSessions.id, id))
    .limit(1)

  if (!rows || rows.length === 0) {
    return errorResponse(c, 404, "not_found_error", "Checkout session not found")
  }

  const s = rows[0]
  if (s.expiresAt.getTime() < Date.now()) {
    return errorResponse(c, 410, "resource_expired", "Checkout session expired")
  }
  if (s.status !== "pending") {
    return errorResponse(c, 409, "invalid_request_error", "Checkout session already processed")
  }

  const body = c.req.valid("json")
  const now = Date.now()

  await db
    .update(schema.checkOutSessions)
    .set({
      status: "completed",
      buyerAddress: body.buyer_address,
      signature: body.signature,
      buyerEmail: body.buyer_email ?? null,
      updatedAt: new Date(now),
    })
    .where(eq(schema.checkOutSessions.id, id))

  const paymentId = crypto.randomUUID()
  await db.insert(schema.payment).values({
    id: paymentId,
    checkoutSessionId: id,
    txHash: body.tx_hash,
    buyerAddress: body.buyer_address,
    signature: body.signature,
    amount: s.amount,
    feeAmount: s.feeAmount,
    merchantAmount: s.merchantAmount,
    status: "pending_confirmation",
    blockchainStatus: "pending",
    confirmations: 0,
    retryCount: 0,
    nextRetryAt: new Date(now + 60 * 1000),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  })

  return c.json({
    id: paymentId,
    object: "payment",
    checkout_session_id: id,
    tx_hash: body.tx_hash,
    status: "pending_confirmation",
    blockchain_status: "pending",
    message: "Payment recorded. Blockchain verification in progress.",
  }, 201)
})

// ---------------------------------------------------------------------------
// GET /api/v1/payments/:id/status  (publishable or secret)
// Lightweight poll endpoint for the checkout page / SDK.
// ---------------------------------------------------------------------------
v1.get("/payments/:id/status", apiKeyAuth(["publishable", "secret"]), async (c) => {
  const id = c.req.param("id")
  const db = getDB(c.env.DB)

  const rows = await db
    .select()
    .from(schema.payment)
    .where(eq(schema.payment.id, id))
    .limit(1)

  if (!rows || rows.length === 0) {
    return errorResponse(c, 404, "not_found_error", "Payment not found")
  }

  const p = rows[0]
  return c.json({
    id: p.id,
    object: "payment.status",
    status: p.status,
    blockchain_status: p.blockchainStatus,
    confirmations: p.confirmations,
    tx_hash: p.txHash,
    retry_count: p.retryCount,
    failure_reason: p.failureReason,
    settled_at: p.settledAt?.getTime() ?? null,
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/payments/:id  (secret)
// Full payment detail for the merchant.
// ---------------------------------------------------------------------------
v1.get("/payments/:id", apiKeyAuth(["secret"]), async (c) => {
  const profile = getAuthProfile(c)
  if (!profile) return errorResponse(c, 401, "authentication_error", "No authenticated merchant")

  const id = c.req.param("id")
  const db = getDB(c.env.DB)

  const rows = await db
    .select({
      id: schema.payment.id,
      checkoutSessionId: schema.payment.checkoutSessionId,
      txHash: schema.payment.txHash,
      buyerAddress: schema.payment.buyerAddress,
      amount: schema.payment.amount,
      feeAmount: schema.payment.feeAmount,
      merchantAmount: schema.payment.merchantAmount,
      status: schema.payment.status,
      blockchainStatus: schema.payment.blockchainStatus,
      confirmations: schema.payment.confirmations,
      retryCount: schema.payment.retryCount,
      failureReason: schema.payment.failureReason,
      webhookDelivered: schema.payment.webhookDelivered,
      webhookDeliveryCount: schema.payment.webhookDeliveryCount,
      settledAt: schema.payment.settledAt,
      createdAt: schema.payment.createdAt,
      updatedAt: schema.payment.updatedAt,
      productName: schema.checkOutSessions.productName,
      currency: schema.checkOutSessions.currency,
      network: schema.checkOutSessions.network,
      buyerEmail: schema.checkOutSessions.buyerEmail,
    })
    .from(schema.payment)
    .innerJoin(schema.checkOutSessions, eq(schema.payment.checkoutSessionId, schema.checkOutSessions.id))
    .where(and(
      eq(schema.payment.id, id),
      eq(schema.checkOutSessions.merchantProfileId, profile.id),
    ))
    .limit(1)

  if (!rows || rows.length === 0) {
    return errorResponse(c, 404, "not_found_error", "Payment not found")
  }

  const p = rows[0]
  return c.json({
    id: p.id,
    object: "payment",
    checkout_session_id: p.checkoutSessionId,
    tx_hash: p.txHash,
    buyer_address: p.buyerAddress,
    amount: p.amount,
    fee_amount: p.feeAmount,
    merchant_amount: p.merchantAmount,
    status: p.status,
    blockchain_status: p.blockchainStatus,
    confirmations: p.confirmations,
    retry_count: p.retryCount,
    failure_reason: p.failureReason,
    webhook_delivered: p.webhookDelivered,
    webhook_delivery_count: p.webhookDeliveryCount,
    product_name: p.productName,
    currency: p.currency,
    network: p.network,
    buyer_email: p.buyerEmail,
    settled_at: p.settledAt?.getTime() ?? null,
    created_at: p.createdAt.getTime(),
    updated_at: p.updatedAt.getTime(),
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/payments  (secret)
// List payments for the authenticated merchant, newest first.
// Query params: limit (max 100, default 20), offset, network, status
// ---------------------------------------------------------------------------
v1.get("/payments", apiKeyAuth(["secret"]), async (c) => {
  const profile = getAuthProfile(c)
  if (!profile) return errorResponse(c, 401, "authentication_error", "No authenticated merchant")

  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100)
  const offset = parseInt(c.req.query("offset") || "0")
  const network = c.req.query("network")
  const status = c.req.query("status")

  const db = getDB(c.env.DB)
  const where = [eq(schema.checkOutSessions.merchantProfileId, profile.id)]
  if (network && (NETWORKS as readonly string[]).includes(network)) {
    where.push(eq(schema.checkOutSessions.network, network as any))
  }
  if (status) {
    where.push(eq(schema.payment.status, status))
  }

  const rows = await db
    .select({
      id: schema.payment.id,
      checkoutSessionId: schema.payment.checkoutSessionId,
      txHash: schema.payment.txHash,
      buyerAddress: schema.payment.buyerAddress,
      amount: schema.payment.amount,
      feeAmount: schema.payment.feeAmount,
      merchantAmount: schema.payment.merchantAmount,
      status: schema.payment.status,
      blockchainStatus: schema.payment.blockchainStatus,
      confirmations: schema.payment.confirmations,
      settledAt: schema.payment.settledAt,
      createdAt: schema.payment.createdAt,
      productName: schema.checkOutSessions.productName,
      currency: schema.checkOutSessions.currency,
      network: schema.checkOutSessions.network,
    })
    .from(schema.payment)
    .innerJoin(schema.checkOutSessions, eq(schema.payment.checkoutSessionId, schema.checkOutSessions.id))
    .where(and(...where))
    .orderBy(desc(schema.payment.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({
    object: "list",
    data: rows.map(p => ({
      id: p.id,
      object: "payment",
      checkout_session_id: p.checkoutSessionId,
      tx_hash: p.txHash,
      buyer_address: p.buyerAddress,
      amount: p.amount,
      fee_amount: p.feeAmount,
      merchant_amount: p.merchantAmount,
      status: p.status,
      blockchain_status: p.blockchainStatus,
      confirmations: p.confirmations,
      product_name: p.productName,
      currency: p.currency,
      network: p.network,
      settled_at: p.settledAt?.getTime() ?? null,
      created_at: p.createdAt.getTime(),
    })),
    limit,
    offset,
    has_more: rows.length === limit,
  })
})

export default v1
