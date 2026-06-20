import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and } from "drizzle-orm"
import { getDB } from "../db"
import * as schema from "../db/schema"
import type { Env } from "../index"
import { createAuth } from "../auth"

const checkoutApp = new Hono<Env>()

// Helper to verify session via better-auth cookie
async function getSessionUser(c: any) {
  const auth = createAuth({
    binding: c.env.DB,
    url: c.env.BETTER_AUTH_URL,
    secret: c.env.BETTER_AUTH_SECRET,
    frontendUrl: c.env.FRONTEND_URL,
    googleClientId: c.env.GOOGLE_CLIENT_ID,
    googleClientSecret: c.env.GOOGLE_CLIENT_SECRET,
  })
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })
  return session?.user ?? null
}

// POST /api/checkout — create a new checkout session (requires auth)
const createSchema = z.object({
  productName: z.string().min(1).max(200),
  amount: z.number().positive().max(1_000_000_00), // cents, max $1M
  currency: z.enum(["USDC", "USDT", "EURC"]),
  network: z.enum(["Solana", "Arbitrum", "Polygon", "Ethereum"]),
  collectEmail: z.boolean().default(false),
})

checkoutApp.post("/", zValidator("json", createSchema), async (c) => {
  const user = await getSessionUser(c)
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = c.req.valid("json")
  const db = getDB(c.env.DB)

  // Get merchant profile
  const profile = await db
    .select()
    .from(schema.merchantProfiles)
    .where(eq(schema.merchantProfiles.userId, user.id))
    .limit(1)

  if (!profile || profile.length === 0) {
    return c.json({ error: "Merchant profile not found. Please set up your profile first." }, 400)
  }

  const p = profile[0]

  // Get wallet for this network
  const wallet = await db
    .select()
    .from(schema.merchantWallets)
    .where(and(
      eq(schema.merchantWallets.merchantProfileId, p.id),
      eq(schema.merchantWallets.network, body.network)
    ))
    .limit(1)

  if (!wallet || wallet.length === 0) {
    return c.json({ error: `Wallet not configured for ${body.network}` }, 400)
  }

  const w = wallet[0]

  // Calculate fee
  const feeAmount = Math.round((body.amount * p.feePercentage) / 10000)
  const merchantAmount = p.feeType === "on_top" ? body.amount : body.amount - feeAmount
  const totalAmount = p.feeType === "on_top" ? body.amount + feeAmount : body.amount

  // Resolve company wallet from env vars (set by admin, not merchant)
  const companyWalletMap: Record<string, string | undefined> = {
    Solana: c.env.COMPANY_SOLANA_WALLET,
    Arbitrum: c.env.COMPANY_ARBITRUM_WALLET,
    Polygon: c.env.COMPANY_POLYGON_WALLET,
    Ethereum: c.env.COMPANY_ETHEREUM_WALLET,
  }
  const companyWalletAddress = companyWalletMap[body.network]
  if (!companyWalletAddress) {
    return c.json({ error: `Company wallet not configured for ${body.network}` }, 500)
  }

  const id = crypto.randomUUID()
  const now = Date.now()
  const expiresAt = now + 30 * 60 * 1000 // 30 minutes

  await db.insert(schema.checkOutSessions).values({
    id,
    userId: user.id,
    merchantProfileId: p.id,
    productName: body.productName,
    amount: totalAmount,
    feeAmount,
    merchantAmount,
    currency: body.currency,
    network: body.network,
    companyWalletAddress,
    merchantWalletAddress: w.walletAddress,
    collectEmail: body.collectEmail,
    status: "pending",
    expiresAt: new Date(expiresAt),
    createdAt: new Date(now),
    updatedAt: new Date(now),
  })

  return c.json({
    id,
    productName: body.productName,
    amount: totalAmount,
    feeAmount,
    merchantAmount,
    currency: body.currency,
    network: body.network,
    feeType: p.feeType,
    feePercentage: p.feePercentage,
    merchantWalletAddress: w.walletAddress,
    companyWalletAddress,
    status: "pending",
    expiresAt,
  }, 201)
})

// GET /api/checkout/:id — fetch session details (public, no auth required)
checkoutApp.get("/:id", async (c) => {
  const id = c.req.param("id")
  const db = getDB(c.env.DB)

  const session = await db
    .select()
    .from(schema.checkOutSessions)
    .where(eq(schema.checkOutSessions.id, id))
    .limit(1)

  if (!session || session.length === 0) {
    return c.json({ error: "Checkout session not found" }, 404)
  }

  const s = session[0]

  if (s.expiresAt.getTime() < Date.now()) {
    return c.json({ error: "Checkout session expired" }, 410)
  }

  // Get merchant profile for fee type
  const profile = await db
    .select()
    .from(schema.merchantProfiles)
    .where(eq(schema.merchantProfiles.id, s.merchantProfileId))
    .limit(1)

  const feeType = profile && profile.length > 0 ? profile[0].feeType : "part_of"

  return c.json({
    id: s.id,
    productName: s.productName,
    amount: s.amount,
    feeAmount: s.feeAmount,
    merchantAmount: s.merchantAmount,
    currency: s.currency,
    network: s.network,
    feeType,
    collectEmail: s.collectEmail,
    merchantWalletAddress: s.merchantWalletAddress,
    companyWalletAddress: s.companyWalletAddress,
    status: s.status,
    expiresAt: s.expiresAt.getTime(),
  })
})

// POST /api/checkout/:id/confirm — confirm payment (public)
const confirmSchema = z.object({
  txHash: z.string().min(10).max(200),
  buyerAddress: z.string().min(10).max(100),
  signature: z.string().min(1).max(500),
  buyerEmail: z.string().email().optional(),
})

checkoutApp.post("/:id/confirm", zValidator("json", confirmSchema), async (c) => {
  const id = c.req.param("id")
  const db = getDB(c.env.DB)

  const session = await db
    .select()
    .from(schema.checkOutSessions)
    .where(eq(schema.checkOutSessions.id, id))
    .limit(1)

  if (!session || session.length === 0) {
    return c.json({ error: "Checkout session not found" }, 404)
  }

  const s = session[0]

  if (s.expiresAt.getTime() < Date.now()) {
    return c.json({ error: "Checkout session expired" }, 410)
  }

  if (s.status !== "pending") {
    return c.json({ error: "Checkout session already processed" }, 409)
  }

  const body = c.req.valid("json")
  const now = Date.now()

  // Update checkout session
  await db
    .update(schema.checkOutSessions)
    .set({
      status: "completed",
      buyerAddress: body.buyerAddress,
      signature: body.signature,
      buyerEmail: body.buyerEmail ?? null,
      updatedAt: new Date(now),
    })
    .where(eq(schema.checkOutSessions.id, id))

  // Create payment record
  const paymentId = crypto.randomUUID()
  await db.insert(schema.payment).values({
    id: paymentId,
    checkoutSessionId: id,
    txHash: body.txHash,
    buyerAddress: body.buyerAddress,
    signature: body.signature,
    amount: s.amount,
    feeAmount: s.feeAmount,
    merchantAmount: s.merchantAmount,
    status: "pending_confirmation",
    blockchainStatus: "pending",
    confirmations: 0,
    retryCount: 0,
    nextRetryAt: new Date(now + 60 * 1000), // retry in 1 minute
    createdAt: new Date(now),
    updatedAt: new Date(now),
  })

  return c.json({
    id: paymentId,
    checkoutSessionId: id,
    txHash: body.txHash,
    status: "pending_confirmation",
    blockchainStatus: "pending",
    message: "Payment recorded. Blockchain verification in progress.",
  }, 201)
})

// GET /api/payment/:id/status — check payment status
// This endpoint is polled by the frontend
checkoutApp.get("/payment/:id/status", async (c) => {
  const id = c.req.param("id")
  const db = getDB(c.env.DB)

  const payment = await db
    .select()
    .from(schema.payment)
    .where(eq(schema.payment.id, id))
    .limit(1)

  if (!payment || payment.length === 0) {
    return c.json({ error: "Payment not found" }, 404)
  }

  const p = payment[0]

  return c.json({
    id: p.id,
    status: p.status,
    blockchainStatus: p.blockchainStatus,
    confirmations: p.confirmations,
    txHash: p.txHash,
    retryCount: p.retryCount,
    failureReason: p.failureReason,
    settledAt: p.settledAt?.getTime(),
  })
})

export default checkoutApp
