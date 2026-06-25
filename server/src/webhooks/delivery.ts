import { eq, and, lte, count } from "drizzle-orm"
import { getDB } from "../db"
import * as schema from "../db/schema"

const WEBHOOK_RETRY_DELAYS = [60, 300, 900, 3600, 7200] // seconds
const MAX_WEBHOOK_RETRIES = 5

export interface WebhookPayload {
  id: string
  object: "event"
  event: string
  payment_id: string
  checkout_session_id: string
  amount: number
  fee_amount: number
  merchant_amount: number
  currency: string | null
  network: string | null
  tx_hash: string
  status: string
  blockchain_status: string
  confirmations: number
  created: number
}

export async function queueWebhook(
  db: any,
  payment: typeof schema.payment.$inferSelect,
  session: typeof schema.checkOutSessions.$inferSelect,
  event: string,
  env: Record<string, string | undefined>,
) {
  const profile = await db
    .select()
    .from(schema.merchantProfiles)
    .where(eq(schema.merchantProfiles.id, session.merchantProfileId))
    .limit(1)

  if (!profile || profile.length === 0 || !profile[0].webhookUrl) {
    return
  }

  const payload: WebhookPayload = {
    id: `evt_${crypto.randomUUID()}`,
    object: "event",
    event,
    payment_id: payment.id,
    checkout_session_id: payment.checkoutSessionId,
    amount: payment.amount,
    fee_amount: payment.feeAmount,
    merchant_amount: payment.merchantAmount,
    currency: session.currency,
    network: session.network,
    tx_hash: payment.txHash,
    status: payment.status,
    blockchain_status: payment.blockchainStatus,
    confirmations: payment.confirmations,
    created: Date.now(),
  }

  const body = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000)
  const signingSecret = profile[0].webhookSecret || ""
  const signature = await signWebhook(body, timestamp, signingSecret)
  const signatureHeader = `t=${timestamp},v1=${signature}`

  await db.insert(schema.webhookRetries).values({
    id: payload.id,
    paymentId: payment.id,
    event,
    url: profile[0].webhookUrl,
    payload: body,
    signatureHeader,
    attempt: 0,
    maxAttempts: MAX_WEBHOOK_RETRIES,
    nextAttemptAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

export async function processWebhookRetries(
  db: any,
  env: Record<string, string | undefined>,
  limit = 50,
) {
  const now = Date.now()

  const retries = await db
    .select()
    .from(schema.webhookRetries)
    .where(
      and(
        eq(schema.webhookRetries.failedPermanently, false),
        lte(schema.webhookRetries.nextAttemptAt, new Date(now))
      )
    )
    .limit(limit)

  let processed = 0

  for (const retry of retries) {
    try {
      const result = await sendWebhookRequest(retry.url, retry.payload, retry.signatureHeader)

      if (result.ok) {
        // Successful delivery: record it and remove from retry queue.
        await db.insert(schema.webhookDeliveries).values({
          id: crypto.randomUUID(),
          paymentId: retry.paymentId,
          event: retry.event,
          url: retry.url,
          statusCode: result.statusCode,
          responseBody: result.responseBody.slice(0, 1000),
          attempt: retry.attempt + 1,
          deliveredAt: new Date(),
          createdAt: new Date(),
        })

        await db
          .update(schema.payment)
          .set({
            webhookDelivered: true,
            webhookDeliveryCount: (await getDeliveryCount(db, retry.paymentId)) + 1,
            updatedAt: new Date(),
          })
          .where(eq(schema.payment.id, retry.paymentId))

        await db.delete(schema.webhookRetries).where(eq(schema.webhookRetries.id, retry.id))
      } else {
        await rescheduleOrFail(db, retry, result.statusCode, result.error)
      }
    } catch (err: any) {
      await rescheduleOrFail(db, retry, 0, err.message || "Network error")
    }
    processed++
  }

  return { processed }
}

async function rescheduleOrFail(
  db: any,
  retry: typeof schema.webhookRetries.$inferSelect,
  statusCode: number | null,
  error: string | null,
) {
  const attempt = retry.attempt + 1
  const now = Date.now()

  if (attempt >= retry.maxAttempts) {
    await db
      .update(schema.webhookRetries)
      .set({
        attempt,
        lastStatusCode: statusCode,
        lastError: error,
        failedPermanently: true,
        updatedAt: new Date(now),
      })
      .where(eq(schema.webhookRetries.id, retry.id))
  } else {
    const delay = WEBHOOK_RETRY_DELAYS[Math.min(attempt - 1, WEBHOOK_RETRY_DELAYS.length - 1)]
    await db
      .update(schema.webhookRetries)
      .set({
        attempt,
        nextAttemptAt: new Date(now + delay * 1000),
        lastStatusCode: statusCode,
        lastError: error,
        updatedAt: new Date(now),
      })
      .where(eq(schema.webhookRetries.id, retry.id))
  }
}

async function sendWebhookRequest(
  url: string,
  payload: string,
  signatureHeader: string,
): Promise<{ ok: boolean; statusCode: number | null; responseBody: string; error: string | null }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "AirPay-Signature": signatureHeader,
    },
    body: payload,
  })

  const responseBody = await response.text()
  const ok = response.status >= 200 && response.status < 300

  return {
    ok,
    statusCode: response.status,
    responseBody,
    error: ok ? null : `HTTP ${response.status}`,
  }
}

async function signWebhook(body: string, timestamp: number, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const data = new TextEncoder().encode(`${timestamp}.${body}`)
  const sig = await crypto.subtle.sign("HMAC", key, data)
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, "0")).join("")
}

async function getDeliveryCount(db: any, paymentId: string): Promise<number> {
  const rows = await db
    .select({ count: count() })
    .from(schema.webhookDeliveries)
    .where(eq(schema.webhookDeliveries.paymentId, paymentId))
  return rows[0]?.count ?? 0
}
