import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and, desc } from "drizzle-orm"
import { getDB } from "../db"
import * as schema from "../db/schema"
import type { Env } from "../index"
import { createAuth } from "../auth"

const merchantApp = new Hono<Env>()

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

async function getMerchantProfile(c: any) {
  const user = await getSessionUser(c)
  if (!user) return { user: null, profile: null }
  const db = getDB(c.env.DB)
  const rows = await db
    .select()
    .from(schema.merchantProfiles)
    .where(eq(schema.merchantProfiles.userId, user.id))
    .limit(1)
  if (rows && rows.length > 0) return { user, profile: rows[0] }

  const now = new Date()
  const businessName =
    (user.name && String(user.name).trim()) ||
    (user.email && String(user.email).split("@")[0]) ||
    "New Merchant"
  const newProfile = {
    id: crypto.randomUUID(),
    userId: user.id,
    businessName,
    feeType: "part_of",
    feePercentage: 200,
    webhookUrl: null,
    webhookSecret: null,
    sandboxMode: true,
    createdAt: now,
    updatedAt: now,
  }
  try {
    await db.insert(schema.merchantProfiles).values(newProfile)
    return { user, profile: newProfile }
  } catch (err) {
    console.error("Failed to backfill merchant profile for user", user.id, err)
    const existing = await db
      .select()
      .from(schema.merchantProfiles)
      .where(eq(schema.merchantProfiles.userId, user.id))
      .limit(1)
    return { user, profile: existing && existing.length > 0 ? existing[0] : null }
  }
}

function randomToken(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("")
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("")
}

const KEY_DEFAULTS: Record<string, { prefix: string; body: string }> = {
  "publishable:test": { prefix: "pk_test_", body: "" },
  "publishable:live": { prefix: "pk_live_", body: "" },
  "secret:test": { prefix: "sk_test_", body: "" },
  "secret:live": { prefix: "sk_live_", body: "" },
  "signing:test": { prefix: "whsec_", body: "" },
  "signing:live": { prefix: "whsec_live_", body: "" },
}

async function ensureApiKeys(db: any, merchantProfileId: string) {
  const existing = await db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.merchantProfileId, merchantProfileId))

  if (existing.length >= 3) return existing

  const now = Date.now()
  const seeds: Array<{ type: string; environment: string; prefix: string }> = [
    { type: "publishable", environment: "test", prefix: "pk_test_" },
    { type: "secret", environment: "test", prefix: "sk_test_" },
    { type: "signing", environment: "test", prefix: "whsec_" },
  ]

  for (const s of seeds) {
    const dup = existing.find((k: any) => k.type === s.type && k.environment === s.environment)
    if (dup) continue
    const body = randomToken(20)
    const full = `${s.prefix}${body}`
    const lastFour = body.slice(-4)
    const hashed = await sha256(full)
    await db.insert(schema.apiKeys).values({
      id: `key_${crypto.randomUUID()}`,
      merchantProfileId,
      type: s.type,
      environment: s.environment,
      prefix: s.prefix,
      hashedValue: hashed,
      lastFour,
      createdAt: new Date(now),
      lastUsedAt: null,
      revokedAt: null,
    })

    // The signing key (whsec_…) doubles as the webhook signing secret.
    // Store the full value on the profile so sendWebhook can HMAC with it.
    if (s.type === "signing") {
      await db
        .update(schema.merchantProfiles)
        .set({ webhookSecret: full, updatedAt: new Date(now) })
        .where(eq(schema.merchantProfiles.id, merchantProfileId))
    }
  }

  return db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.merchantProfileId, merchantProfileId))
}

async function ensureSettlementSettings(db: any, merchantProfileId: string) {
  const rows = await db
    .select()
    .from(schema.settlementSettings)
    .where(eq(schema.settlementSettings.merchantProfileId, merchantProfileId))
    .limit(1)
  if (rows.length > 0) return rows[0]

  const id = `set_${crypto.randomUUID()}`
  const now = Date.now()
  await db.insert(schema.settlementSettings).values({
    id,
    merchantProfileId,
    enabledChains: '["Solana","Arbitrum","Polygon"]',
    updatedAt: new Date(now),
  })
  const created = await db
    .select()
    .from(schema.settlementSettings)
    .where(eq(schema.settlementSettings.merchantProfileId, merchantProfileId))
    .limit(1)
  return created[0]
}

async function ensureWebhookEventSubscriptions(db: any, merchantProfileId: string) {
  const events = ["payment.succeeded", "payment.failed", "payout.completed", "payment.refunded"]
  const defaults: Record<string, boolean> = {
    "payment.succeeded": true,
    "payment.failed": true,
    "payout.completed": false,
    "payment.refunded": false,
  }
  const existing = await db
    .select()
    .from(schema.webhookEventSubscriptions)
    .where(eq(schema.webhookEventSubscriptions.merchantProfileId, merchantProfileId))

  const now = Date.now()
  for (const ev of events) {
    if (!existing.find((e: any) => e.event === ev)) {
      await db.insert(schema.webhookEventSubscriptions).values({
        id: `wev_${crypto.randomUUID()}`,
        merchantProfileId,
        event: ev,
        enabled: defaults[ev],
        updatedAt: new Date(now),
      })
    }
  }
  return db
    .select()
    .from(schema.webhookEventSubscriptions)
    .where(eq(schema.webhookEventSubscriptions.merchantProfileId, merchantProfileId))
}

// POST /api/merchant/profile — create merchant profile
const createProfileSchema = z.object({
  businessName: z.string().min(1).max(200),
  feeType: z.enum(["part_of", "on_top"]).default("part_of"),
  webhookUrl: z.string().url().optional(),
  wallets: z.array(z.object({
    network: z.enum(["Solana", "Arbitrum", "Polygon", "Ethereum"]),
    walletAddress: z.string().min(10).max(100),
  })).min(1),
})

merchantApp.post("/profile", zValidator("json", createProfileSchema), async (c) => {
  const user = await getSessionUser(c)
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = c.req.valid("json")
  const db = getDB(c.env.DB)

  const now = Date.now()
  const profileId = crypto.randomUUID()

  await db.insert(schema.merchantProfiles).values({
    id: profileId,
    userId: user.id,
    businessName: body.businessName,
    feeType: body.feeType,
    feePercentage: 200,
    webhookUrl: body.webhookUrl ?? null,
    webhookSecret: null,
    sandboxMode: true,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  })

  for (const wallet of body.wallets) {
    await db.insert(schema.merchantWallets).values({
      id: crypto.randomUUID(),
      merchantProfileId: profileId,
      network: wallet.network,
      walletAddress: wallet.walletAddress,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    })
  }

  await ensureApiKeys(db, profileId)
  await ensureSettlementSettings(db, profileId)
  await ensureWebhookEventSubscriptions(db, profileId)

  return c.json({
    id: profileId,
    businessName: body.businessName,
    feeType: body.feeType,
    feePercentage: 200,
    wallets: body.wallets,
  }, 201)
})

// GET /api/merchant/profile — get current merchant profile
merchantApp.get("/profile", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  if (!profile) {
    return c.json({ error: "Merchant profile not found" }, 404)
  }

  const db = getDB(c.env.DB)
  const wallets = await db
    .select()
    .from(schema.merchantWallets)
    .where(eq(schema.merchantWallets.merchantProfileId, profile.id))

  return c.json({
    id: profile.id,
    businessName: profile.businessName,
    feeType: profile.feeType,
    feePercentage: profile.feePercentage,
    webhookUrl: profile.webhookUrl,
    sandboxMode: profile.sandboxMode,
    wallets: wallets.map(w => ({
      network: w.network,
      walletAddress: w.walletAddress,
    })),
  })
})

// PUT /api/merchant/profile — update merchant profile
const updateProfileSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  feeType: z.enum(["part_of", "on_top"]).optional(),
  webhookUrl: z.string().url().optional().nullable(),
  wallets: z.array(z.object({
    network: z.enum(["Solana", "Arbitrum", "Polygon", "Ethereum"]),
    walletAddress: z.string().min(10).max(100),
  })).optional(),
})

merchantApp.put("/profile", zValidator("json", updateProfileSchema), async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }
  if (!profile) {
    return c.json({ error: "Merchant profile not found" }, 404)
  }

  const body = c.req.valid("json")
  const db = getDB(c.env.DB)
  const now = Date.now()

  await db
    .update(schema.merchantProfiles)
    .set({
      ...(body.businessName && { businessName: body.businessName }),
      ...(body.feeType && { feeType: body.feeType }),
      ...(body.webhookUrl !== undefined && { webhookUrl: body.webhookUrl }),
      updatedAt: new Date(now),
    })
    .where(eq(schema.merchantProfiles.id, profile.id))

  if (body.wallets && body.wallets.length > 0) {
    await db
      .delete(schema.merchantWallets)
      .where(eq(schema.merchantWallets.merchantProfileId, profile.id))

    for (const wallet of body.wallets) {
      await db.insert(schema.merchantWallets).values({
        id: crypto.randomUUID(),
        merchantProfileId: profile.id,
        network: wallet.network,
        walletAddress: wallet.walletAddress,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
    }
  }

  return c.json({ success: true })
})

// GET /api/merchant/wallets/:network — get wallet for a specific network
merchantApp.get("/wallets/:network", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }
  if (!profile) {
    return c.json({ error: "Merchant profile not found" }, 404)
  }

  const network = c.req.param("network")
  const db = getDB(c.env.DB)
  const wallet = await db
    .select()
    .from(schema.merchantWallets)
    .where(and(
      eq(schema.merchantWallets.merchantProfileId, profile.id),
      eq(schema.merchantWallets.network, network)
    ))
    .limit(1)

  if (!wallet || wallet.length === 0) {
    return c.json({ error: "Wallet not found for this network" }, 404)
  }

  return c.json({
    network: wallet[0].network,
    walletAddress: wallet[0].walletAddress,
  })
})

// ============================================================================
// CONSOLE ENDPOINTS (added for dynamic console)
// ============================================================================

// GET /api/merchant/overview — aggregate stats for Overview tab
merchantApp.get("/overview", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)

  const db = getDB(c.env.DB)
  const now = Date.now()
  const last7d = now - 7 * 24 * 60 * 60 * 1000

  const allPayments = await db
    .select({
      id: schema.payment.id,
      amount: schema.payment.amount,
      merchantAmount: schema.payment.merchantAmount,
      status: schema.payment.status,
      blockchainStatus: schema.payment.blockchainStatus,
      confirmations: schema.payment.confirmations,
      createdAt: schema.payment.createdAt,
      settledAt: schema.payment.settledAt,
    })
    .from(schema.payment)
    .innerJoin(
      schema.checkOutSessions,
      eq(schema.payment.checkoutSessionId, schema.checkOutSessions.id)
    )
    .where(eq(schema.checkOutSessions.merchantProfileId, profile.id))

  const totalVolume = allPayments
    .filter(p => p.status === "completed" || p.status === "settled")
    .reduce((acc, p) => acc + (p.amount || 0), 0)
  const settledAmount = allPayments
    .filter(p => p.settledAt)
    .reduce((acc, p) => acc + (p.merchantAmount || 0), 0)
  const settledCount = allPayments.filter(p => p.settledAt).length
  const completedCount = allPayments.filter(p => p.status === "completed" || p.status === "settled").length
  const failedCount = allPayments.filter(p => p.status === "failed").length
  const successRate = allPayments.length > 0
    ? ((completedCount / (completedCount + failedCount || 1)) * 100).toFixed(2) + "%"
    : "100%"

  const recentPayments = allPayments
    .filter(p => p.createdAt.getTime() >= last7d)
  const olderPayments = allPayments
    .filter(p => p.createdAt.getTime() < last7d)
  const recentTotal = recentPayments
    .filter(p => p.status === "completed" || p.status === "settled")
    .reduce((acc, p) => acc + (p.amount || 0), 0)
  const olderTotal = olderPayments
    .filter(p => p.status === "completed" || p.status === "settled")
    .reduce((acc, p) => acc + (p.amount || 0), 0)
  const trend = olderTotal > 0
    ? (((recentTotal - olderTotal) / olderTotal) * 100).toFixed(1) + "%"
    : (recentTotal > 0 ? "+100.0%" : "+0.0%")

  // Per-session data for currency/network stats
  const byCurrency: Record<string, number> = { USDC: 0, USDT: 0, EURC: 0 }
  const byNetwork: Record<string, number> = { Solana: 0, Arbitrum: 0, Polygon: 0, Ethereum: 0 }
  const joined = await db
    .select({
      amount: schema.payment.amount,
      status: schema.payment.status,
      currency: schema.checkOutSessions.currency,
      network: schema.checkOutSessions.network,
    })
    .from(schema.payment)
    .innerJoin(
      schema.checkOutSessions,
      eq(schema.payment.checkoutSessionId, schema.checkOutSessions.id)
    )
    .where(eq(schema.checkOutSessions.merchantProfileId, profile.id))

  for (const r of joined) {
    if (r.status === "completed" || r.status === "settled") {
      if (byCurrency[r.currency] !== undefined) byCurrency[r.currency] += r.amount
      if (byNetwork[r.network] !== undefined) byNetwork[r.network] += r.amount
    }
  }

  // Avg settlement time (ms between createdAt and settledAt)
  const settledPayments = allPayments.filter(p => p.settledAt)
  const avgSettlementMs = settledPayments.length > 0
    ? settledPayments.reduce((acc, p) => acc + (p.settledAt!.getTime() - p.createdAt.getTime()), 0) / settledPayments.length
    : 0
  const avgSettlementSec = avgSettlementMs > 0 ? (avgSettlementMs / 1000).toFixed(1) + "s" : "—"

  return c.json({
    grossVolumeCents: totalVolume,
    settledVolumeCents: settledAmount,
    settledCount,
    completedCount,
    failedCount,
    successRate,
    avgSettlementTime: avgSettlementSec,
    trend,
    byCurrency,
    byNetwork,
    totalPayments: allPayments.length,
  })
})

// GET /api/merchant/payments — paginated list
merchantApp.get("/payments", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)

  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200)
  const offset = parseInt(c.req.query("offset") || "0")
  const network = c.req.query("network")
  const status = c.req.query("status")

  const db = getDB(c.env.DB)
  const where = [eq(schema.checkOutSessions.merchantProfileId, profile.id)]
  if (network && ["Solana", "Arbitrum", "Polygon", "Ethereum"].includes(network)) {
    where.push(eq(schema.checkOutSessions.network, network))
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
      failureReason: schema.payment.failureReason,
      settledAt: schema.payment.settledAt,
      createdAt: schema.payment.createdAt,
      productName: schema.checkOutSessions.productName,
      currency: schema.checkOutSessions.currency,
      network: schema.checkOutSessions.network,
      buyerEmail: schema.checkOutSessions.buyerEmail,
    })
    .from(schema.payment)
    .innerJoin(
      schema.checkOutSessions,
      eq(schema.payment.checkoutSessionId, schema.checkOutSessions.id)
    )
    .where(and(...where))
    .orderBy(desc(schema.payment.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({ payments: rows, limit, offset })
})

// GET /api/merchant/payments/:id — single payment
merchantApp.get("/payments/:id", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)

  const id = c.req.param("id")
  const db = getDB(c.env.DB)
  const rows = await db
    .select({
      id: schema.payment.id,
      checkoutSessionId: schema.payment.checkoutSessionId,
      txHash: schema.payment.txHash,
      buyerAddress: schema.payment.buyerAddress,
      signature: schema.payment.signature,
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
      merchantWalletAddress: schema.checkOutSessions.merchantWalletAddress,
      companyWalletAddress: schema.checkOutSessions.companyWalletAddress,
    })
    .from(schema.payment)
    .innerJoin(
      schema.checkOutSessions,
      eq(schema.payment.checkoutSessionId, schema.checkOutSessions.id)
    )
    .where(and(
      eq(schema.payment.id, id),
      eq(schema.checkOutSessions.merchantProfileId, profile.id)
    ))
    .limit(1)

  if (!rows || rows.length === 0) {
    return c.json({ error: "Payment not found" }, 404)
  }

  return c.json(rows[0])
})

// GET /api/merchant/sandbox-mode
merchantApp.get("/sandbox-mode", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ sandboxMode: true })
  return c.json({ sandboxMode: profile.sandboxMode })
})

// PUT /api/merchant/sandbox-mode
merchantApp.put("/sandbox-mode", zValidator("json", z.object({ sandboxMode: z.boolean() })), async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)
  const body = c.req.valid("json")
  const db = getDB(c.env.DB)
  await db
    .update(schema.merchantProfiles)
    .set({ sandboxMode: body.sandboxMode, updatedAt: new Date() })
    .where(eq(schema.merchantProfiles.id, profile.id))
  return c.json({ sandboxMode: body.sandboxMode })
})

// GET /api/merchant/api-keys — list keys (no secrets)
merchantApp.get("/api-keys", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)

  const db = getDB(c.env.DB)
  const keys = await ensureApiKeys(db, profile.id)
  return c.json({
    keys: keys.map((k: any) => ({
      id: k.id,
      type: k.type,
      environment: k.environment,
      display: `${k.prefix}…${k.lastFour}`,
      lastFour: k.lastFour,
      createdAt: k.createdAt.getTime(),
      lastUsedAt: k.lastUsedAt?.getTime() ?? null,
      revokedAt: k.revokedAt?.getTime() ?? null,
    })),
  })
})

// POST /api/merchant/api-keys/regenerate — returns full key ONCE
const regenerateSchema = z.object({
  type: z.enum(["publishable", "secret", "signing"]),
  environment: z.enum(["test", "live"]).default("test"),
})

merchantApp.post("/api-keys/regenerate", zValidator("json", regenerateSchema), async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)

  const body = c.req.valid("json")
  const db = getDB(c.env.DB)
  const prefix = KEY_DEFAULTS[`${body.type}:${body.environment}`]?.prefix
  if (!prefix) return c.json({ error: "Invalid key type/environment" }, 400)

  // Revoke any existing active key of this type/env
  const existing = await db
    .select()
    .from(schema.apiKeys)
    .where(and(
      eq(schema.apiKeys.merchantProfileId, profile.id),
      eq(schema.apiKeys.type, body.type),
      eq(schema.apiKeys.environment, body.environment)
    ))
  for (const k of existing) {
    if (!k.revokedAt) {
      await db
        .update(schema.apiKeys)
        .set({ revokedAt: new Date() })
        .where(eq(schema.apiKeys.id, k.id))
    }
  }

  const tokenBody = randomToken(24)
  const full = `${prefix}${tokenBody}`
  const lastFour = tokenBody.slice(-4)
  const hashed = await sha256(full)
  const now = Date.now()
  const id = `key_${crypto.randomUUID()}`
  await db.insert(schema.apiKeys).values({
    id,
    merchantProfileId: profile.id,
    type: body.type,
    environment: body.environment,
    prefix,
    hashedValue: hashed,
    lastFour,
    createdAt: new Date(now),
    lastUsedAt: null,
    revokedAt: null,
  })

  // Keep webhookSecret in sync when the signing key is regenerated.
  if (body.type === "signing") {
    await db
      .update(schema.merchantProfiles)
      .set({ webhookSecret: full, updatedAt: new Date(now) })
      .where(eq(schema.merchantProfiles.id, profile.id))
  }

  return c.json({
    id,
    type: body.type,
    environment: body.environment,
    display: `${prefix}…${lastFour}`,
    fullKey: full,
    createdAt: now,
  })
})

// POST /api/merchant/api-keys/:id/revoke
merchantApp.post("/api-keys/:id/revoke", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)

  const id = c.req.param("id")
  const db = getDB(c.env.DB)
  const rows = await db
    .select()
    .from(schema.apiKeys)
    .where(and(
      eq(schema.apiKeys.id, id),
      eq(schema.apiKeys.merchantProfileId, profile.id)
    ))
    .limit(1)
  if (!rows || rows.length === 0) return c.json({ error: "Key not found" }, 404)
  if (rows[0].revokedAt) return c.json({ error: "Key already revoked" }, 400)

  await db
    .update(schema.apiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(schema.apiKeys.id, id))
  return c.json({ success: true })
})

// PUT /api/merchant/webhook-events
const webhookEventsSchema = z.object({
  events: z.record(z.string(), z.boolean()),
})

merchantApp.put("/webhook-events", zValidator("json", webhookEventsSchema), async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)

  const body = c.req.valid("json")
  const db = getDB(c.env.DB)
  const now = Date.now()
  for (const [event, enabled] of Object.entries(body.events)) {
    const rows = await db
      .select()
      .from(schema.webhookEventSubscriptions)
      .where(and(
        eq(schema.webhookEventSubscriptions.merchantProfileId, profile.id),
        eq(schema.webhookEventSubscriptions.event, event)
      ))
      .limit(1)
    if (rows.length > 0) {
      await db
        .update(schema.webhookEventSubscriptions)
        .set({ enabled, updatedAt: new Date(now) })
        .where(eq(schema.webhookEventSubscriptions.id, rows[0].id))
    } else {
      await db.insert(schema.webhookEventSubscriptions).values({
        id: `wev_${crypto.randomUUID()}`,
        merchantProfileId: profile.id,
        event,
        enabled,
        updatedAt: new Date(now),
      })
    }
  }
  const all = await ensureWebhookEventSubscriptions(db, profile.id)
  return c.json({
    events: all.map((e: any) => ({ event: e.event, enabled: e.enabled })),
  })
})

// GET /api/merchant/webhook-events
merchantApp.get("/webhook-events", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)
  const db = getDB(c.env.DB)
  const rows = await ensureWebhookEventSubscriptions(db, profile.id)
  return c.json({
    events: rows.map((e: any) => ({ event: e.event, enabled: e.enabled })),
  })
})

// GET /api/merchant/webhook-logs
merchantApp.get("/webhook-logs", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)

  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100)
  const db = getDB(c.env.DB)

  const rows = await db
    .select({
      id: schema.webhookDeliveries.id,
      event: schema.webhookDeliveries.event,
      url: schema.webhookDeliveries.url,
      statusCode: schema.webhookDeliveries.statusCode,
      attempt: schema.webhookDeliveries.attempt,
      deliveredAt: schema.webhookDeliveries.deliveredAt,
      createdAt: schema.webhookDeliveries.createdAt,
      paymentId: schema.payment.id,
      txHash: schema.payment.txHash,
    })
    .from(schema.webhookDeliveries)
    .innerJoin(schema.payment, eq(schema.webhookDeliveries.paymentId, schema.payment.id))
    .innerJoin(
      schema.checkOutSessions,
      eq(schema.payment.checkoutSessionId, schema.checkOutSessions.id)
    )
    .where(eq(schema.checkOutSessions.merchantProfileId, profile.id))
    .orderBy(desc(schema.webhookDeliveries.createdAt))
    .limit(limit)

  return c.json({
    logs: rows.map(r => ({
      id: r.id,
      event: r.event,
      url: r.url,
      statusCode: r.statusCode,
      attempt: r.attempt,
      deliveredAt: r.deliveredAt?.getTime() ?? null,
      createdAt: r.createdAt.getTime(),
      paymentId: r.paymentId,
      txHash: r.txHash,
    })),
  })
})

// GET /api/merchant/checkout-links
merchantApp.get("/checkout-links", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)

  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100)
  const db = getDB(c.env.DB)
  const rows = await db
    .select()
    .from(schema.checkOutSessions)
    .where(eq(schema.checkOutSessions.merchantProfileId, profile.id))
    .orderBy(desc(schema.checkOutSessions.createdAt))
    .limit(limit)

  return c.json({
    links: rows.map(r => ({
      id: r.id,
      productName: r.productName,
      amount: r.amount,
      currency: r.currency,
      network: r.network,
      status: r.status,
      buyerEmail: r.buyerEmail,
      collectEmail: r.collectEmail,
      expiresAt: r.expiresAt.getTime(),
      createdAt: r.createdAt.getTime(),
    })),
  })
})

// GET /api/merchant/settlement-settings
merchantApp.get("/settlement-settings", async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)
  const db = getDB(c.env.DB)
  const settings = await ensureSettlementSettings(db, profile.id)
  return c.json(formatSettlementSettings(settings))
})

// PUT /api/merchant/settlement-settings
const settlementSettingsSchema = z.object({
  enabledChains: z.array(z.enum(["Solana", "Arbitrum", "Polygon", "Ethereum"])).optional(),
})

merchantApp.put("/settlement-settings", zValidator("json", settlementSettingsSchema), async (c) => {
  const { user, profile } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  if (!profile) return c.json({ error: "Merchant profile not found" }, 404)

  const body = c.req.valid("json")
  const db = getDB(c.env.DB)
  const current = await ensureSettlementSettings(db, profile.id)
  const now = Date.now()

  const update: any = { updatedAt: new Date(now) }
  if (body.enabledChains !== undefined) update.enabledChains = JSON.stringify(body.enabledChains)

  await db
    .update(schema.settlementSettings)
    .set(update)
    .where(eq(schema.settlementSettings.id, current.id))

  const updated = await db
    .select()
    .from(schema.settlementSettings)
    .where(eq(schema.settlementSettings.id, current.id))
    .limit(1)
  return c.json(formatSettlementSettings(updated[0]))
})

function formatSettlementSettings(s: any) {
  let enabledChains: string[] = []
  try {
    enabledChains = JSON.parse(s.enabledChains)
  } catch {
    enabledChains = []
  }
  return {
    id: s.id,
    enabledChains,
    updatedAt: s.updatedAt.getTime(),
  }
}

// GET /api/merchant/sweep-logs
// NOTE: AirPay is non-custodial — funds settle directly on-chain.
// There are no sweep operations. This endpoint returns empty for backward compatibility.
merchantApp.get("/sweep-logs", async (c) => {
  const { user } = await getMerchantProfile(c)
  if (!user) return c.json({ error: "Unauthorized" }, 401)
  return c.json({ logs: [] })
})

export default merchantApp