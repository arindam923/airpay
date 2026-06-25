import { eq, and, lte } from "drizzle-orm"
import { getDB } from "./db"
import * as schema from "./db/schema"

// Cron handler for blockchain verification
// This runs every minute to check pending transactions

const MAX_RETRIES = 10
const RETRY_DELAYS = [60, 120, 240, 480, 960, 1800, 3600, 7200, 14400, 28800] // seconds

// RPC endpoints
const RPC_ENDPOINTS: Record<string, string> = {
  Solana: "https://api.mainnet-beta.solana.com",
  Ethereum: "https://eth.llamarpc.com",
  Arbitrum: "https://arb1.arbitrum.io/rpc",
  Polygon: "https://polygon.llamarpc.com",
}

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

      const network = session[0]?.network || "Solana"
      const verified = await verifyTransaction(payment, network, c.env)

      if (verified.success) {
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
        if (session && session.length > 0) {
          const profile = await db
            .select()
            .from(schema.merchantProfiles)
            .where(eq(schema.merchantProfiles.id, session[0].merchantProfileId))
            .limit(1)

          if (profile && profile.length > 0 && profile[0].webhookUrl) {
            await sendWebhook(profile[0], payment, session[0], "payment.confirmed", c.env)
          }
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
        if (session && session.length > 0) {
          const profile = await db
            .select()
            .from(schema.merchantProfiles)
            .where(eq(schema.merchantProfiles.id, session[0].merchantProfileId))
            .limit(1)

          if (profile && profile.length > 0 && profile[0].webhookUrl) {
            await sendWebhook(profile[0], payment, session[0], "payment.failed", c.env)
          }
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

async function verifyTransaction(payment: any, network: string, env: any) {
  try {
    const rpcUrl = RPC_ENDPOINTS[network] || RPC_ENDPOINTS.Solana

    if (network === "Solana") {
      return await verifySolanaTransaction(payment, rpcUrl)
    } else {
      return await verifyEvmTransaction(payment, rpcUrl, network)
    }
  } catch (err) {
    console.error(`Verification error for ${network}:`, err)
    return { success: false, failed: false, confirmations: 0, reason: null }
  }
}

async function verifySolanaTransaction(payment: any, rpcUrl: string) {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [payment.txHash, "json"],
      }),
    })

    const data: any = await response.json()

    if (data?.result && data?.result?.meta && data?.result?.meta?.err === null) {
      // Transaction confirmed
      const confirmations = data?.result?.meta?.confirmations || 1
      return { success: true, confirmations, failed: false, reason: null }
    } else if (data?.result && data?.result?.meta && data?.result?.meta?.err !== null) {
      // Transaction failed
      return { success: false, failed: true, confirmations: 0, reason: "Transaction error on Solana" }
    }

    return { success: false, failed: false, confirmations: 0, reason: null }
  } catch (err) {
    console.error("Solana verification error:", err)
    return { success: false, failed: false, confirmations: 0, reason: null }
  }
}

async function verifyEvmTransaction(payment: any, rpcUrl: string, network: string) {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [payment.txHash],
      }),
    })

    const data: any = await response.json()

    if (data?.result && data?.result?.blockHash) {
      // Transaction is mined
      if (data?.result?.status === "0x1") {
        // Success
        const blockNumber = parseInt(data?.result?.blockNumber, 16)
        const confirmations = await getEvmConfirmations(rpcUrl, blockNumber)
        return { success: true, confirmations, failed: false, reason: null }
      } else {
        // Failed
        return { success: false, failed: true, confirmations: 0, reason: "Transaction failed on EVM" }
      }
    }

    return { success: false, failed: false, confirmations: 0, reason: null }
  } catch (err) {
    console.error("EVM verification error:", err)
    return { success: false, failed: false, confirmations: 0, reason: null }
  }
}

async function getEvmConfirmations(rpcUrl: string, txBlockNumber: number) {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
        params: [],
      }),
    })

    const data: any = await response.json()
    const currentBlock = parseInt(data?.result, 16)
    return Math.max(0, currentBlock - txBlockNumber)
  } catch (err) {
    return 1
  }
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
