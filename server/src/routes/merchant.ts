import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and } from "drizzle-orm"
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

// POST /api/merchant/profile — create merchant profile
const createProfileSchema = z.object({
  businessName: z.string().min(1).max(200),
  feeType: z.enum(["part_of", "on_top"]).default("part_of"),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().max(500).optional(),
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
    feePercentage: 200, // 2% default, set by admin
    webhookUrl: body.webhookUrl ?? null,
    webhookSecret: body.webhookSecret ?? null,
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
  const user = await getSessionUser(c)
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const db = getDB(c.env.DB)

  const profile = await db
    .select()
    .from(schema.merchantProfiles)
    .where(eq(schema.merchantProfiles.userId, user.id))
    .limit(1)

  if (!profile || profile.length === 0) {
    return c.json({ error: "Merchant profile not found" }, 404)
  }

  const p = profile[0]

  const wallets = await db
    .select()
    .from(schema.merchantWallets)
    .where(eq(schema.merchantWallets.merchantProfileId, p.id))

  return c.json({
    id: p.id,
    businessName: p.businessName,
    feeType: p.feeType,
    feePercentage: p.feePercentage,
    webhookUrl: p.webhookUrl,
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
  webhookSecret: z.string().max(500).optional().nullable(),
  wallets: z.array(z.object({
    network: z.enum(["Solana", "Arbitrum", "Polygon", "Ethereum"]),
    walletAddress: z.string().min(10).max(100),
  })).optional(),
})

merchantApp.put("/profile", zValidator("json", updateProfileSchema), async (c) => {
  const user = await getSessionUser(c)
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = c.req.valid("json")
  const db = getDB(c.env.DB)

  const profile = await db
    .select()
    .from(schema.merchantProfiles)
    .where(eq(schema.merchantProfiles.userId, user.id))
    .limit(1)

  if (!profile || profile.length === 0) {
    return c.json({ error: "Merchant profile not found" }, 404)
  }

  const p = profile[0]
  const now = Date.now()

  await db
    .update(schema.merchantProfiles)
    .set({
      ...(body.businessName && { businessName: body.businessName }),
      ...(body.feeType && { feeType: body.feeType }),
      ...(body.webhookUrl !== undefined && { webhookUrl: body.webhookUrl }),
      ...(body.webhookSecret !== undefined && { webhookSecret: body.webhookSecret }),
      updatedAt: new Date(now),
    })
    .where(eq(schema.merchantProfiles.id, p.id))

  if (body.wallets && body.wallets.length > 0) {
    await db
      .delete(schema.merchantWallets)
      .where(eq(schema.merchantWallets.merchantProfileId, p.id))

    for (const wallet of body.wallets) {
      await db.insert(schema.merchantWallets).values({
        id: crypto.randomUUID(),
        merchantProfileId: p.id,
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
  const user = await getSessionUser(c)
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const network = c.req.param("network")
  const db = getDB(c.env.DB)

  const profile = await db
    .select()
    .from(schema.merchantProfiles)
    .where(eq(schema.merchantProfiles.userId, user.id))
    .limit(1)

  if (!profile || profile.length === 0) {
    return c.json({ error: "Merchant profile not found" }, 404)
  }

  const wallet = await db
    .select()
    .from(schema.merchantWallets)
    .where(and(
      eq(schema.merchantWallets.merchantProfileId, profile[0].id),
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

export default merchantApp
