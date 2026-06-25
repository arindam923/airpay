import { eq, and, isNull } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { getDB } from "../db"
import * as schema from "../db/schema"
import type { Env } from "../index"

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("")
}

export type ApiKeyRole = "publishable" | "secret"

export type AuthLocals = {
  merchantProfile: typeof schema.merchantProfiles.$inferSelect
  apiKey: {
    id: string
    type: string
    environment: string
    prefix: string
    lastFour: string
  }
}

/**
 * Middleware that authenticates a request using an AirPay API key
 * passed via the `Authorization: Bearer <key>` header.
 *
 * @param allowedRoles - which key types may pass. Use ["secret"] for
 *   merchant-only endpoints, ["publishable","secret"] for public/checkout
 *   endpoints that the storefront may call.
 */
export function apiKeyAuth(allowedRoles: ApiKeyRole[]): MiddlewareHandler<Env> {
  return async (c, next) => {
    const header = c.req.header("Authorization")
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      return c.json({ error: { type: "authentication_error", message: "Missing or malformed Authorization header. Expected: Bearer <api_key>" } }, 401)
    }

    const raw = header.slice(7).trim()
    if (!raw) {
      return c.json({ error: { type: "authentication_error", message: "Empty API key" } }, 401)
    }

    // Identify key type by prefix
    const prefixMap: Record<string, ApiKeyRole> = {
      "pk_test_": "publishable",
      "pk_live_": "publishable",
      "sk_test_": "secret",
      "sk_live_": "secret",
    }

    let role: ApiKeyRole | undefined
    for (const prefix of Object.keys(prefixMap)) {
      if (raw.startsWith(prefix)) {
        role = prefixMap[prefix]
        break
      }
    }

    if (!role) {
      return c.json({ error: { type: "authentication_error", message: "Unrecognized API key prefix" } }, 401)
    }

    if (!allowedRoles.includes(role)) {
      return c.json({ error: { type: "authorization_error", message: `This endpoint requires a ${allowedRoles.join(" or ")} key` } }, 403)
    }

    const hashed = await sha256(raw)
    const db = getDB(c.env.DB)

    const rows = await db
      .select()
      .from(schema.apiKeys)
      .where(and(
        eq(schema.apiKeys.hashedValue, hashed),
        isNull(schema.apiKeys.revokedAt),
      ))
      .limit(1)

    if (!rows || rows.length === 0) {
      return c.json({ error: { type: "authentication_error", message: "Invalid or revoked API key" } }, 401)
    }

    const key = rows[0]

    // Defensive: prefix on row should match the one we detected
    if (key.prefix !== raw.slice(0, key.prefix.length)) {
      return c.json({ error: { type: "authentication_error", message: "Invalid API key" } }, 401)
    }

    // Load merchant profile
    const profileRows = await db
      .select()
      .from(schema.merchantProfiles)
      .where(eq(schema.merchantProfiles.id, key.merchantProfileId))
      .limit(1)

    if (!profileRows || profileRows.length === 0) {
      return c.json({ error: { type: "authentication_error", message: "Merchant profile not found for this API key" } }, 401)
    }

    // Update lastUsedAt (fire-and-forget, don't block the request on failure)
    c.executionCtx.waitUntil(
      db
        .update(schema.apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.apiKeys.id, key.id))
        .then(() => {}, () => {})
    )

    c.set("merchantProfile", profileRows[0])
    c.set("apiKey", {
      id: key.id,
      type: key.type,
      environment: key.environment,
      prefix: key.prefix,
      lastFour: key.lastFour,
    })

    await next()
  }
}

/** Helper to pull the authenticated merchant profile off the context in route handlers. */
export function getAuthProfile(c: any) {
  return c.get("merchantProfile") as AuthLocals["merchantProfile"] | undefined
}
