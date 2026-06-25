/**
 * Blockchain transaction verification for AirPay.
 *
 * The cron job calls verifyPaymentTransaction() to check that a buyer's
 * on-chain transaction actually sent the expected token, the expected amounts,
 * to the expected merchant + company wallets, from the expected buyer address.
 */

import { eq } from "drizzle-orm"
import { getDB } from "../db"
import * as schema from "../db/schema"

// Token contract addresses per network. These must match the frontend.
export const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  Solana: {
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    EURC: "HzwqbKZw8HxMN6SXFlm6yL1FRhNfeH8YLeTxRDKZZZqY",
  },
  Ethereum: {
    USDC: "0xA0b86a33E6441e3C2BE68c5e0c48b3D3e7E6f9C2",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    EURC: "0x1aBaEA1f7C830bD89Acc67e4b8E4D8d6E4c5e4E7",
  },
  Arbitrum: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1c0b69FCbb9",
    EURC: "0x1aBaEA1f7C830bD89Acc67e4b8E4D8d6E4c5e4E7",
  },
  Polygon: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    EURC: "0x1aBaEA1f7C830bD89Acc67e4b8E4D8d6E4c5e4E7",
  },
}

// Decimals per token. All supported stablecoins currently use 6 decimals,
// but this map makes the conversion explicit and safe if that changes.
export const TOKEN_DECIMALS: Record<string, Record<string, number>> = {
  Solana: { USDC: 6, USDT: 6, EURC: 6 },
  Ethereum: { USDC: 6, USDT: 6, EURC: 6 },
  Arbitrum: { USDC: 6, USDT: 6, EURC: 6 },
  Polygon: { USDC: 6, USDT: 6, EURC: 6 },
}

const RPC_ENDPOINTS: Record<string, string> = {
  Solana: "https://api.mainnet-beta.solana.com",
  Ethereum: "https://eth.llamarpc.com",
  Arbitrum: "https://arb1.arbitrum.io/rpc",
  Polygon: "https://polygon.llamarpc.com",
}

export type VerificationResult =
  | { valid: true; confirmations: number; failed: false; reason: null }
  | { valid: false; confirmations: number; failed: true; reason: string }
  | { valid: false; confirmations: number; failed: false; reason: null }

export function getRpcUrl(network: string, env: { [key: string]: unknown }): string {
  const envKey = `RPC_${network.toUpperCase()}` as keyof typeof env
  const url = (env[envKey] as string | undefined) || RPC_ENDPOINTS[network]
  if (!url) {
    throw new Error(`No RPC endpoint configured for network: ${network}`)
  }
  return url
}

export function getTokenAddress(network: string, currency: string): string | null {
  return TOKEN_ADDRESSES[network]?.[currency] ?? null
}

/**
 * Convert AirPay's internal "cents" amount to raw token units.
 * Throws if the input is not a safe integer.
 */
export function centsToTokenUnits(cents: number, decimals: number): bigint {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error(`Invalid cents amount: ${cents}`)
  }
  if (!Number.isSafeInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error(`Invalid token decimals: ${decimals}`)
  }
  const multiplier = 10 ** (decimals - 2)
  if (!Number.isFinite(multiplier)) {
    throw new Error(`Cannot convert cents with ${decimals} decimals`)
  }
  return BigInt(cents) * BigInt(Math.round(multiplier))
}

export function getTokenDecimals(network: string, currency: string): number {
  return TOKEN_DECIMALS[network]?.[currency] ?? 6
}

/**
 * Verify a payment transaction against the checkout session it belongs to.
 *
 * Supports two modes:
 * - Single tx hash (atomic splitter contract): both merchant + fee transfers live in `txHash`.
 * - Dual tx hashes (current EVM implementation): merchant transfer in `txHash`, fee transfer in `feeTxHash`.
 */
export async function verifyPaymentTransaction(
  payment: typeof schema.payment.$inferSelect,
  session: typeof schema.checkOutSessions.$inferSelect,
  env: Record<string, string | undefined>,
): Promise<VerificationResult> {
  if (!isValidTxHash(payment.txHash, session.network)) {
    return { valid: false, failed: true, confirmations: 0, reason: "Invalid transaction hash format" }
  }
  if (payment.feeTxHash && !isValidTxHash(payment.feeTxHash, session.network)) {
    return { valid: false, failed: true, confirmations: 0, reason: "Invalid fee transaction hash format" }
  }

  const tokenAddress = getTokenAddress(session.network, session.currency)
  if (!tokenAddress) {
    return { valid: false, failed: true, confirmations: 0, reason: `Unsupported currency ${session.currency} on ${session.network}` }
  }

  const decimals = getTokenDecimals(session.network, session.currency)

  try {
    if (session.network === "Solana") {
      return await verifySolanaTransaction(payment, session, tokenAddress, decimals, env)
    }
    return await verifyEvmTransaction(payment, session, tokenAddress, decimals, env)
  } catch (err) {
    console.error(`Verification error for payment ${payment.id}:`, err)
    return { valid: false, failed: false, confirmations: 0, reason: null }
  }
}

function isValidTxHash(hash: string, network: string): boolean {
  if (network === "Solana") {
    // Solana signatures are base58, typically 87-88 characters.
    return /^[1-9A-HJ-NP-Za-km-z]{85,90}$/.test(hash)
  }
  // EVM tx hashes are 0x-prefixed 32-byte hex.
  return /^0x[0-9a-fA-F]{64}$/.test(hash)
}

// ---------------------------------------------------------------------------
// Solana
// ---------------------------------------------------------------------------

async function verifySolanaTransaction(
  payment: typeof schema.payment.$inferSelect,
  session: typeof schema.checkOutSessions.$inferSelect,
  tokenMint: string,
  decimals: number,
  env: Record<string, string | undefined>,
): Promise<VerificationResult> {
  const rpcUrl = getRpcUrl("Solana", env)
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [payment.txHash, { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 }],
    }),
  })

  const data: any = await response.json()
  const result = data?.result

  if (!result || result.meta?.err) {
    return {
      valid: false,
      failed: result && result.meta?.err !== undefined && result.meta?.err !== null,
      confirmations: 0,
      reason: result?.meta?.err ? "Transaction failed on Solana" : null,
    }
  }

  const buyerAddress = payment.buyerAddress
  if (!buyerAddress) {
    return { valid: false, failed: true, confirmations: 0, reason: "Missing buyer address" }
  }

  // Verify buyer signed the transaction (they authorized the token spends).
  const accountKeys = result.transaction?.message?.accountKeys ?? []
  const buyerIsSigner = accountKeys.some((ak: any) => ak.pubkey === buyerAddress && ak.signer)
  if (!buyerIsSigner) {
    return { valid: false, failed: true, confirmations: 0, reason: "Buyer did not sign the transaction" }
  }

  // Compute balance changes per owner/mint from pre/post token balances.
  const preBalances = new Map<string, bigint>()
  const postBalances = new Map<string, bigint>()

  for (const balance of result.meta?.preTokenBalances ?? []) {
    const key = `${balance.mint}:${balance.owner}`
    preBalances.set(key, BigInt(balance.uiTokenAmount?.amount ?? "0"))
  }
  for (const balance of result.meta?.postTokenBalances ?? []) {
    const key = `${balance.mint}:${balance.owner}`
    postBalances.set(key, BigInt(balance.uiTokenAmount?.amount ?? "0"))
  }

  const expectedMerchant = centsToTokenUnits(session.merchantAmount, decimals)
  const expectedFee = centsToTokenUnits(session.feeAmount, decimals)

  const merchantKey = `${tokenMint}:${session.merchantWalletAddress}`
  const companyKey = `${tokenMint}:${session.companyWalletAddress}`

  const merchantReceived = (postBalances.get(merchantKey) ?? 0n) - (preBalances.get(merchantKey) ?? 0n)
  const companyReceived = (postBalances.get(companyKey) ?? 0n) - (preBalances.get(companyKey) ?? 0n)

  if (merchantReceived !== expectedMerchant || companyReceived !== expectedFee) {
    return {
      valid: false,
      failed: true,
      confirmations: 0,
      reason: "Transaction does not contain the expected merchant and fee token transfers",
    }
  }

  // Solana confirmations from getTransaction are unreliable for finalized txs.
  // We expose them for the status display but the cron separately decides
  // "finalized" via commitment/slot checks later.
  const confirmations = typeof result.meta?.confirmations === "number" ? result.meta.confirmations : 1
  return { valid: true, failed: false, confirmations: Math.max(1, confirmations), reason: null }
}

// ---------------------------------------------------------------------------
// EVM
// ---------------------------------------------------------------------------

// ERC20 Transfer event signature hash
const TRANSFER_EVENT = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

async function verifyEvmTransaction(
  payment: typeof schema.payment.$inferSelect,
  session: typeof schema.checkOutSessions.$inferSelect,
  tokenAddress: string,
  decimals: number,
  env: Record<string, string | undefined>,
): Promise<VerificationResult> {
  const rpcUrl = getRpcUrl(session.network, env)
  const buyerAddress = payment.buyerAddress
  if (!buyerAddress) {
    return { valid: false, failed: true, confirmations: 0, reason: "Missing buyer address" }
  }

  const expectedMerchant = centsToTokenUnits(session.merchantAmount, decimals)
  const expectedFee = centsToTokenUnits(session.feeAmount, decimals)

  // Dual-tx mode: merchant tx in txHash, fee tx in feeTxHash.
  if (payment.feeTxHash) {
    const [merchantResult, feeResult] = await Promise.all([
      verifyEvmTransfer(rpcUrl, payment.txHash, tokenAddress, buyerAddress, session.merchantWalletAddress, expectedMerchant),
      verifyEvmTransfer(rpcUrl, payment.feeTxHash, tokenAddress, buyerAddress, session.companyWalletAddress, expectedFee),
    ])

    if (!merchantResult.found) {
      if (merchantResult.receipt?.status === "0x0") {
        return { valid: false, failed: true, confirmations: 0, reason: "Merchant transaction failed on EVM" }
      }
      return merchantResult.failed
        ? { valid: false, failed: true, confirmations: 0, reason: merchantResult.reason ?? "Merchant transaction verification failed" }
        : { valid: false, failed: false, confirmations: 0, reason: null }
    }
    if (!feeResult.found) {
      if (feeResult.receipt?.status === "0x0") {
        return { valid: false, failed: true, confirmations: 0, reason: "Fee transaction failed on EVM" }
      }
      return feeResult.failed
        ? { valid: false, failed: true, confirmations: 0, reason: feeResult.reason ?? "Fee transaction verification failed" }
        : { valid: false, failed: false, confirmations: 0, reason: null }
    }

    const confirmations = Math.min(
      await getEvmConfirmations(rpcUrl, parseInt(merchantResult.receipt!.blockNumber, 16)),
      await getEvmConfirmations(rpcUrl, parseInt(feeResult.receipt!.blockNumber, 16)),
    )
    return { valid: true, failed: false, confirmations, reason: null }
  }

  // Single-tx mode: atomic splitter contract / Solana-style single transaction.
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
  const receipt = data?.result

  if (!receipt || !receipt.blockHash) {
    return { valid: false, failed: false, confirmations: 0, reason: null }
  }

  if (receipt.status !== "0x1") {
    return { valid: false, failed: true, confirmations: 0, reason: "Transaction failed on EVM" }
  }

  let merchantTransfer = false
  let feeTransfer = false

  for (const log of receipt.logs ?? []) {
    if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) continue
    if (!Array.isArray(log.topics) || log.topics.length < 3) continue
    if (log.topics[0]?.toLowerCase() !== TRANSFER_EVENT.toLowerCase()) continue

    const from = "0x" + log.topics[1].slice(26).toLowerCase()
    const to = "0x" + log.topics[2].slice(26).toLowerCase()
    const value = BigInt(log.data ?? "0")

    if (from === buyerAddress.toLowerCase()) {
      if (to === session.merchantWalletAddress.toLowerCase() && value === expectedMerchant) {
        merchantTransfer = true
      }
      if (to === session.companyWalletAddress.toLowerCase() && value === expectedFee) {
        feeTransfer = true
      }
    }
  }

  if (!merchantTransfer || !feeTransfer) {
    return {
      valid: false,
      failed: true,
      confirmations: 0,
      reason: "Transaction does not contain the expected merchant and fee transfers",
    }
  }

  const confirmations = await getEvmConfirmations(rpcUrl, parseInt(receipt.blockNumber, 16))
  return { valid: true, failed: false, confirmations, reason: null }
}

type TransferCheck =
  | { found: true; receipt: any; failed: false; reason: null }
  | { found: false; receipt?: any; failed: boolean; reason: string | null }

async function verifyEvmTransfer(
  rpcUrl: string,
  txHash: string,
  tokenAddress: string,
  fromAddress: string,
  toAddress: string,
  expectedValue: bigint,
): Promise<TransferCheck> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  })

  const data: any = await response.json()
  const receipt = data?.result

  if (!receipt || !receipt.blockHash) {
    return { found: false, failed: false, reason: null }
  }

  if (receipt.status !== "0x1") {
    return { found: false, receipt, failed: true, reason: "Transaction failed on EVM" }
  }

  for (const log of receipt.logs ?? []) {
    if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) continue
    if (!Array.isArray(log.topics) || log.topics.length < 3) continue
    if (log.topics[0]?.toLowerCase() !== TRANSFER_EVENT.toLowerCase()) continue

    const from = "0x" + log.topics[1].slice(26).toLowerCase()
    const to = "0x" + log.topics[2].slice(26).toLowerCase()
    const value = BigInt(log.data ?? "0")

    if (
      from === fromAddress.toLowerCase() &&
      to === toAddress.toLowerCase() &&
      value === expectedValue
    ) {
      return { found: true, receipt, failed: false, reason: null }
    }
  }

  return { found: false, receipt, failed: true, reason: "Transaction does not contain the expected transfer" }
}

async function getEvmConfirmations(rpcUrl: string, txBlockNumber: number): Promise<number> {
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
  } catch {
    return 0
  }
}
