import { eq, and, lte } from "drizzle-orm"
import { getDB } from "./db"
import * as schema from "./db/schema"
import { verifyPaymentTransaction } from "./blockchain/verify"

// Cron handler for blockchain verification
// This runs every minute to check pending transactions

const MAX_RETRIES = 10
const RETRY_DELAYS = [60, 120, 240, 480, 960, 1800, 3600, 7200, 14400, 28800] // seconds

export async function handleBlockchainVerification(c: any) {
  const db = getDB(c.env.DB)
  const now = Date.now()

  // Find payments that need verification
  const pendingPayments = await db
    .select()
    .from(schema.payment)
    .where(
      and(
        eq(schema.payment.blockchainStatus, "pending"),
        lte(schema.payment.nextRetryAt, new Date(now))
      )
    )
    .limit(50)

  for (const payment of pendingPayments) {
    try {
      // Get session details
      const session = await db
        .select()
        .from(schema.checkOutSessions)
        .where(eq(schema.checkOutSessions.id, payment.checkoutSessionId))
        .limit(1)

      if (!session || session.length === 0) {
        // Orphan payment — mark failed so we stop retrying
        await db
          .update(schema.payment)
          .set({
            blockchainStatus: "failed",
            status: "failed",
            failureReason: "Checkout session not found",
            updatedAt: new Date(now),
          })
          .where(eq(schema.payment.id, payment.id))
        continue
      }

      const verified = await verifyPaymentTransaction(payment, session[0], c.env)

      if (verified.valid) {
        // Update payment as confirmed
        await db
          .update(schema.payment)
          .set({
            blockchainStatus: verified.confirmations >= 12 ? "finalized" : "confirmed",
            confirmations: verified.confirmations || 1,
            status: "completed",
            settledAt: new Date(now),
            updatedAt: new Date(now),
          })
          .where(eq(schema.payment.id, payment.id))

        // Get merchant profile for webhook
        const profile = await db
          .select()
          .from(schema.merchantProfiles)
          .where(eq(schema.merchantProfiles.id, session[0].merchantProfileId))
          .limit(1)

        if (profile && profile.length > 0 && profile[0].webhookUrl) {
          await sendWebhook(profile[0], payment, session[0], "payment.confirmed", c.env)
        }
      } else if (verified.failed) {
        // Transaction failed on blockchain
        await db
          .update(schema.payment)
          .set({
            blockchainStatus: "failed",
            status: "failed",
            failureReason: verified.reason || "Transaction failed on blockchain",
            updatedAt: new Date(now),
          })
          .where(eq(schema.payment.id, payment.id))

        // Send webhook for failed payment
        const profile = await db
          .select()
          .from(schema.merchantProfiles)
          .where(eq(schema.merchantProfiles.id, session[0].merchantProfileId))
          .limit(1)

        if (profile && profile.length > 0 && profile[0].webhookUrl) {
          await sendWebhook(profile[0], payment, session[0], "payment.failed", c.env)
        }
      } else {
        // Not yet confirmed, schedule retry
        const retryCount = payment.retryCount + 1
        const delay = RETRY_DELAYS[Math.min(retryCount - 1, RETRY_DELAYS.length - 1)]
        const nextRetryAt = new Date(now + delay * 1000)

        if (retryCount >= MAX_RETRIES) {
          await db
            .update(schema.payment)
            .set({
              blockchainStatus: "failed",
              status: "failed",
              failureReason: "Max retries exceeded",
              retryCount,
              updatedAt: new Date(now),
            })
            .where(eq(schema.payment.id, payment.id))
        } else {
          await db
            .update(schema.payment)
            .set({
              retryCount,
              nextRetryAt,
              updatedAt: new Date(now),
            })
            .where(eq(schema.payment.id, payment.id))
        }
      }
    } catch (err) {
      console.error(`Error verifying payment ${payment.id}:`, err)

      // Schedule retry even on error
      const retryCount = payment.retryCount + 1
      const delay = RETRY_DELAYS[Math.min(retryCount - 1, RETRY_DELAYS.length - 1)]

      await db
        .update(schema.payment)
        .set({
          retryCount,
          nextRetryAt: new Date(now + delay * 1000),
          updatedAt: new Date(now),
        })
        .where(eq(schema.payment.id, payment.id))
    }
  }

  return { processed: pendingPayments.length }
}

async function sendWebhook(
  profile: any,
  payment: any,
  session: any,
  event: string,
  env: any,
) {
  // Build the event payload. currency/network live on the checkout session,
  // not the payment row — without the session these would be undefined.
  const payload = {
    id: `evt_${crypto.randomUUID()}`,
    object: "event",
    event,
    payment_id: payment.id,
    checkout_session_id: payment.checkoutSessionId,
    amount: payment.amount,
    fee_amount: payment.feeAmount,
    merchant_amount: payment.merchantAmount,
    currency: session?.currency,
    network: session?.network,
    tx_hash: payment.txHash,
    status: payment.status,
    blockchain_status: payment.blockchainStatus,
    confirmations: payment.confirmations,
    created: Date.now(),
  }

  const body = JSON.stringify(payload)
  const timestamp = Math.floor(Date.now() / 1000)
  const signingSecret = profile.webhookSecret || ""

  // Stripe-style signature: HMAC-SHA256 over "<timestamp>.<body>"
  const signature = await signWebhook(body, timestamp, signingSecret)
  const signatureHeader = `t=${timestamp},v1=${signature}`

  try {
    const response = await fetch(profile.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "AirPay-Signature": signatureHeader,
        "AirPay-Event": event,
      },
      body,
    })

    const responseBody = await response.text()

    const db = getDB(env.DB)
    await db.insert(schema.webhookDeliveries).values({
      id: crypto.randomUUID(),
      paymentId: payment.id,
      event,
      url: profile.webhookUrl,
      statusCode: response.status,
      responseBody: responseBody.slice(0, 1000),
      attempt: payment.webhookDeliveryCount + 1,
      deliveredAt: new Date(),
      createdAt: new Date(),
    })

    await db
      .update(schema.payment)
      .set({
        webhookDelivered: response.status >= 200 && response.status < 300,
        webhookDeliveryCount: payment.webhookDeliveryCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.payment.id, payment.id))
  } catch (err) {
    console.error(`Webhook delivery failed for payment ${payment.id}:`, err)
  }
}

/**
 * Compute the v1 HMAC-SHA256 signature for a webhook body.
 * Signed payload: "<timestamp>.<body>" keyed with the merchant's whsec_.
 */
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
