import { eq, and, lte, or, isNull } from "drizzle-orm"
import { getDB } from "./db"
import * as schema from "./db/schema"
import { verifyPaymentTransaction, getFinalityConfirmations } from "./blockchain/verify"
import { queueWebhook, processWebhookRetries } from "./webhooks/delivery"

// Cron handler for blockchain verification
// This runs every minute to check pending transactions

const MAX_RETRIES = 10
const RETRY_DELAYS = [60, 120, 240, 480, 960, 1800, 3600, 7200, 14400, 28800] // seconds
const LOCK_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export async function handleBlockchainVerification(c: any) {
  const db = getDB(c.env.DB)
  const now = Date.now()
  const instanceId = crypto.randomUUID()

  // Find payments that need verification and are not currently locked by another instance.
  const pendingPayments = await db
    .select()
    .from(schema.payment)
    .where(
      and(
        eq(schema.payment.blockchainStatus, "pending"),
        lte(schema.payment.nextRetryAt, new Date(now)),
        or(
          isNull(schema.payment.lockedAt),
          lte(schema.payment.lockedAt, new Date(now - LOCK_TIMEOUT_MS))
        )
      )
    )
    .limit(50)

  let processed = 0

  for (const payment of pendingPayments) {
    // Try to acquire a row-level lock for this payment.
    await db
      .update(schema.payment)
      .set({
        lockedAt: new Date(now),
        lockedBy: instanceId,
        updatedAt: new Date(now),
      })
      .where(
        and(
          eq(schema.payment.id, payment.id),
          or(
            isNull(schema.payment.lockedAt),
            lte(schema.payment.lockedAt, new Date(now - LOCK_TIMEOUT_MS))
          )
        )
      )

    const relocked = await db
      .select({ lockedBy: schema.payment.lockedBy })
      .from(schema.payment)
      .where(eq(schema.payment.id, payment.id))
      .limit(1)

    if (!relocked || relocked.length === 0 || relocked[0].lockedBy !== instanceId) {
      // Another cron instance acquired the lock first.
      continue
    }

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
      processed++

      if (verified.valid) {
        // Update payment as confirmed
        const finalityThreshold = getFinalityConfirmations(session[0].network)
        await db
          .update(schema.payment)
          .set({
            blockchainStatus: verified.confirmations >= finalityThreshold ? "finalized" : "confirmed",
            confirmations: verified.confirmations || 1,
            status: "completed",
            settledAt: new Date(now),
            updatedAt: new Date(now),
          })
          .where(eq(schema.payment.id, payment.id))

        // Queue webhook for confirmed payment
        await queueWebhook(db, payment, session[0], "payment.confirmed", c.env)
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

        // Queue webhook for failed payment
        await queueWebhook(db, payment, session[0], "payment.failed", c.env)
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
    } finally {
      // Always release the row lock, even if this instance crashed mid-verify.
      await db
        .update(schema.payment)
        .set({ lockedAt: null, lockedBy: null })
        .where(eq(schema.payment.id, payment.id))
    }
  }

  // Process any webhook retries that are due.
  try {
    await processWebhookRetries(db, c.env, 50)
  } catch (err) {
    console.error("Error processing webhook retries:", err)
  }

  return { processed }
}
