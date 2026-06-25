import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { verifyPaymentTransaction, centsToTokenUnits, getTokenAddress, getTokenDecimals } from "./verify"
import type * as schema from "../db/schema"

const buyerAddress = "0x1111111111111111111111111111111111111111"
const merchantWallet = "0x2222222222222222222222222222222222222222"
const companyWallet = "0x3333333333333333333333333333333333333333"

const baseSession = {
  id: "cs_123",
  network: "Ethereum",
  currency: "USDC",
  merchantWalletAddress: merchantWallet,
  companyWalletAddress: companyWallet,
  merchantAmount: 4899, // $48.99 in cents
  feeAmount: 100,       // $1.00 in cents
  amount: 4999,
} as unknown as typeof schema.checkOutSessions.$inferSelect

const basePayment = {
  id: "pay_123",
  checkoutSessionId: "cs_123",
  txHash: "0x" + "a1".repeat(32),
  buyerAddress,
} as unknown as typeof schema.payment.$inferSelect

const decimals = getTokenDecimals(baseSession.network, baseSession.currency)

function makeEvmReceipt(
  status: string,
  logs: Array<{ address: string; topics: string[]; data: string }>,
  blockNumber = "0x1234",
) {
  return {
    blockHash: "0xabc",
    blockNumber,
    status,
    logs,
  }
}

function transferLog(from: string, to: string, value: bigint) {
  return {
    address: getTokenAddress("Ethereum", "USDC")!,
    topics: [
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      "0x000000000000000000000000" + from.slice(2),
      "0x000000000000000000000000" + to.slice(2),
    ],
    data: "0x" + value.toString(16).padStart(64, "0"),
  }
}

function evmTxHash(prefix = "aa"): string {
  return "0x" + prefix.repeat(32)
}

describe("verifyPaymentTransaction", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("accepts a valid atomic EVM transaction with both transfers", async () => {
    const fetchMock = vi.mocked(globalThis.fetch)
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: makeEvmReceipt("0x1", [
            transferLog(buyerAddress, merchantWallet, centsToTokenUnits(4899, decimals)),
            transferLog(buyerAddress, companyWallet, centsToTokenUnits(100, decimals)),
          ]),
        }),
        { status: 200 },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1240" }), { status: 200 }),
    )

    const result = await verifyPaymentTransaction(basePayment, baseSession, {})
    expect(result.valid).toBe(true)
    expect(result.failed).toBe(false)
    expect(result.confirmations).toBe(12)
  })

  it("rejects EVM transaction with mismatched amounts", async () => {
    const fetchMock = vi.mocked(globalThis.fetch)
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: makeEvmReceipt("0x1", [
            transferLog(buyerAddress, merchantWallet, centsToTokenUnits(1000, decimals)),
            transferLog(buyerAddress, companyWallet, centsToTokenUnits(100, decimals)),
          ]),
        }),
        { status: 200 },
      ),
    )

    const result = await verifyPaymentTransaction(basePayment, baseSession, {})
    expect(result.valid).toBe(false)
    expect(result.failed).toBe(true)
    expect(result.reason).toContain("expected merchant and fee transfers")
  })

  it("rejects a failed EVM transaction", async () => {
    const fetchMock = vi.mocked(globalThis.fetch)
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: makeEvmReceipt("0x0", []),
        }),
        { status: 200 },
      ),
    )

    const result = await verifyPaymentTransaction(basePayment, baseSession, {})
    expect(result.valid).toBe(false)
    expect(result.failed).toBe(true)
    expect(result.reason).toBe("Transaction failed on EVM")
  })

  it("accepts dual-tx EVM mode when feeTxHash is provided", async () => {
    const payment = { ...basePayment, feeTxHash: evmTxHash("bb") } as typeof basePayment
    const fetchMock = vi.mocked(globalThis.fetch)

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: makeEvmReceipt("0x1", [
              transferLog(buyerAddress, merchantWallet, centsToTokenUnits(4899, decimals)),
            ]),
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: makeEvmReceipt("0x1", [
              transferLog(buyerAddress, companyWallet, centsToTokenUnits(100, decimals)),
            ]),
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1240" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1240" }), { status: 200 }),
      )

    const result = await verifyPaymentTransaction(payment, baseSession, {})
    expect(result.valid).toBe(true)
    expect(result.failed).toBe(false)
  })

  it("rejects dual-tx EVM mode when fee tx is missing", async () => {
    const payment = { ...basePayment, feeTxHash: evmTxHash("bb") } as typeof basePayment
    const fetchMock = vi.mocked(globalThis.fetch)

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: makeEvmReceipt("0x1", [
              transferLog(buyerAddress, merchantWallet, centsToTokenUnits(4899, decimals)),
            ]),
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            result: makeEvmReceipt("0x1", []),
          }),
          { status: 200 },
        ),
      )

    const result = await verifyPaymentTransaction(payment, baseSession, {})
    expect(result.valid).toBe(false)
    expect(result.failed).toBe(true)
    expect(result.reason).toContain("expected transfer")
  })

  it("accepts a valid Solana transaction", async () => {
    const solSession = { ...baseSession, network: "Solana" } as typeof baseSession
    const solPayment = { ...basePayment, txHash: "A".repeat(88) } as typeof basePayment
    const fetchMock = vi.mocked(globalThis.fetch)

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            meta: {
              err: null,
              confirmations: 15,
              preTokenBalances: [
                { mint: getTokenAddress("Solana", "USDC"), owner: buyerAddress, uiTokenAmount: { amount: "100000000" } },
                { mint: getTokenAddress("Solana", "USDC"), owner: merchantWallet, uiTokenAmount: { amount: "0" } },
                { mint: getTokenAddress("Solana", "USDC"), owner: companyWallet, uiTokenAmount: { amount: "0" } },
              ],
              postTokenBalances: [
                { mint: getTokenAddress("Solana", "USDC"), owner: buyerAddress, uiTokenAmount: { amount: "51010000" } },
                { mint: getTokenAddress("Solana", "USDC"), owner: merchantWallet, uiTokenAmount: { amount: "48990000" } },
                { mint: getTokenAddress("Solana", "USDC"), owner: companyWallet, uiTokenAmount: { amount: "1000000" } },
              ],
            },
            transaction: {
              message: {
                accountKeys: [{ pubkey: buyerAddress, signer: true }],
              },
            },
          },
        }),
        { status: 200 },
      ),
    )

    const result = await verifyPaymentTransaction(solPayment, solSession, {})
    expect(result.valid).toBe(true)
    expect(result.failed).toBe(false)
    expect(result.confirmations).toBe(15)
  })

  it("rejects Solana transaction with wrong buyer signer", async () => {
    const solSession = { ...baseSession, network: "Solana" } as typeof baseSession
    const solPayment = { ...basePayment, txHash: "A".repeat(88) } as typeof basePayment
    const fetchMock = vi.mocked(globalThis.fetch)

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            meta: {
              err: null,
              confirmations: 15,
              preTokenBalances: [],
              postTokenBalances: [],
            },
            transaction: {
              message: {
                accountKeys: [{ pubkey: "someoneElse", signer: true }],
              },
            },
          },
        }),
        { status: 200 },
      ),
    )

    const result = await verifyPaymentTransaction(solPayment, solSession, {})
    expect(result.valid).toBe(false)
    expect(result.failed).toBe(true)
    expect(result.reason).toBe("Buyer did not sign the transaction")
  })
})
