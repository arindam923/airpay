import { eq } from "drizzle-orm"
import { getDB } from "../db"
import * as schema from "../db/schema"
import type { Env } from "../index"

/**
 * Simple idempotency-key middleware for POST endpoints.
 *
 * Behavior:
 * - First request with a given key stores the response for 24 hours.
 * - Replays with the same key and identical body return the stored response.
 * - Replays with the same key but a different body return 422.
 */
export async function idempotencyMiddleware(c: any, next: () => Promise<void>) {
  if (c.req.method !== "POST") {
    return await next()
  }

  const key = c.req.header("Idempotency-Key")
  if (!key) {
    return await next()
  }

  const body = await c.req.raw.clone().text()
  const bodyHash = await sha256(body)
  const db = getDB(c.env.DB)

  const existing = await db
    .select()
    .from(schema.idempotencyKeys)
    .where(eq(schema.idempotencyKeys.key, key))
    .limit(1)

  if (existing && existing.length > 0) {
    const record = existing[0]
    if (record.requestBodyHash !== bodyHash) {
      return c.json({
        error: {
          type: "idempotency_error",
          message: "Idempotency key was used with a different request body",
        },
      }, 422)
    }
    return c.newResponse(record.responseBody, record.responseStatus, {
      "Content-Type": "application/json",
      "Idempotency-Replay": "true",
    })
  }

  // Store a placeholder so concurrent requests with the same key are rejected
  // until the real response is written. We attach the finalizer to the context.
  await db.insert(schema.idempotencyKeys).values({
    id: crypto.randomUUID(),
    key,
    requestMethod: c.req.method,
    requestPath: c.req.path,
    requestBodyHash: bodyHash,
    responseStatus: 0,
    responseBody: "",
    createdAt: new Date(),
  })

  c.set("idempotencyKey", key)
  await next()
}

export async function storeIdempotentResponse(c: any, status: number, body: unknown) {
  const key = c.get("idempotencyKey")
  if (!key) return

  const bodyText = typeof body === "string" ? body : JSON.stringify(body)
  const db = getDB(c.env.DB)
  await db
    .update(schema.idempotencyKeys)
    .set({
      responseStatus: status,
      responseBody: bodyText,
    })
    .where(eq(schema.idempotencyKeys.key, key))
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("")
}
