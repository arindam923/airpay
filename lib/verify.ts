import {
  createPublicClient,
  encodeEventTopics,
  http,
  keccak256,
  numberToHex,
  pad,
  parseEventLogs,
  toBytes,
  type Hex,
} from "viem";
import { rpcUrl, settlementAddress, testnetByKey, type TestnetInfo } from "./chains";
import type { PaymentIntent } from "./db";
import { getKv, setKv } from "./kv";
import { REQUIRED_CONFIRMATIONS } from "./intents";
import { NATIVE_TOKEN, SETTLEMENT_ABI, refFor } from "./settlement/abi";

const clientCache = new Map<string, ReturnType<typeof createPublicClient>>();

function clientFor(info: TestnetInfo) {
  let client = clientCache.get(info.key);
  if (!client) {
    client = createPublicClient({
      chain: info.viemChain,
      // Batch concurrent calls into one JSON-RPC request where possible.
      transport: http(rpcUrl(info), { batch: true }),
    });
    clientCache.set(info.key, client);
  }
  return client;
}

const HEAD_TTL_MS = 1_000;

/**
 * Chain head, shared across isolates via `kv` so a burst of polls costs one
 * RPC round trip instead of one per request.
 */
export async function headBlockNumber(info: TestnetInfo): Promise<bigint> {
  const key = `head:${info.key}`;
  const cached = await getKv(key);
  if (cached) return BigInt(cached);
  const head = await clientFor(info).getBlockNumber();
  await setKv(key, head.toString(), HEAD_TTL_MS);
  return head;
}

export type VerifyOutcome =
  | { kind: "pending" }
  | { kind: "confirming"; confirmations: number; blockNumber: number }
  | { kind: "confirmed"; confirmations: number; blockNumber: number }
  | { kind: "failed"; error: string; blockNumber: number | null };

function isNotMined(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes("could not find transaction") ||
    msg.includes("transaction not found") ||
    msg.includes("not found") ||
    (msg.includes("receipt") && msg.includes("not"))
  );
}

/**
 * Fully re-verify a submitted transaction on-chain. Never trusts the client:
 * checks sender, recipient, exact amount, token contract and receipt status.
 */
export async function verifyIntent(intent: PaymentIntent): Promise<VerifyOutcome> {
  const info = testnetByKey(intent.chain_key);
  if (!info) return { kind: "failed", error: `Unknown chain: ${intent.chain_key}`, blockNumber: null };
  if (!intent.tx_hash) return { kind: "pending" };

  const client = clientFor(info);
  const hash = intent.tx_hash as `0x${string}`;
  const expected = BigInt(intent.expected_units);
  const receiver = intent.receiver.toLowerCase() as `0x${string}`;

  let receipt;
  let tx;
  try {
    [receipt, tx] = await Promise.all([client.getTransactionReceipt({ hash }), client.getTransaction({ hash })]);
  } catch (err) {
    if (isNotMined(err)) return { kind: "pending" };
    throw err;
  }

  if (receipt.status !== "success") {
    return { kind: "failed", error: "Transaction reverted on-chain.", blockNumber: Number(receipt.blockNumber) };
  }

  if (intent.payer && tx.from.toLowerCase() !== intent.payer.toLowerCase()) {
    return {
      kind: "failed",
      error: `Sender ${tx.from} does not match the connected wallet.`,
      blockNumber: Number(receipt.blockNumber),
    };
  }

  // Settlement-routed payments must emit a matching `Settled` event from the
  // contract: same merchant, same intent ref, exact gross, correct token and
  // the payer as sender. This is stronger than trusting tx.to/value alone.
  if (intent.merchant_id) {
    const settled = parseEventLogs({
      abi: SETTLEMENT_ABI,
      logs: receipt.logs,
      eventName: "Settled",
    }).find((log) => {
      if (log.address.toLowerCase() !== receiver) return false;
      if (!log.args) return false;
      const a = log.args;
      const tokenOk =
        intent.token === "ETH"
          ? a.token.toLowerCase() === NATIVE_TOKEN.toLowerCase()
          : a.token.toLowerCase() === info.usdc.toLowerCase();
      return (
        tokenOk &&
        a.merchantId.toLowerCase() === intent.merchant_id!.toLowerCase() &&
        a.ref.toLowerCase() === refFor(intent.id).toLowerCase() &&
        a.gross === expected &&
        a.fee + a.net === a.gross &&
        a.payer.toLowerCase() === tx.from.toLowerCase()
      );
    });
    if (!settled) {
      return {
        kind: "failed",
        error: "Settlement event not found — the payment did not settle through AirPay.",
        blockNumber: Number(receipt.blockNumber),
      };
    }
    const head = await headBlockNumber(info);
    const confirmations = Number(head - receipt.blockNumber + 1n);
    const blockNumber = Number(receipt.blockNumber);
    if (confirmations >= REQUIRED_CONFIRMATIONS) {
      return { kind: "confirmed", confirmations, blockNumber };
    }
    return { kind: "confirming", confirmations, blockNumber };
  }

  if (intent.token === "ETH") {
    if (!tx.to || tx.to.toLowerCase() !== receiver) {
      return { kind: "failed", error: "Funds were not sent to the merchant address.", blockNumber: Number(receipt.blockNumber) };
    }
    if (tx.value !== expected) {
      return { kind: "failed", error: "Sent amount does not match the invoice amount.", blockNumber: Number(receipt.blockNumber) };
    }
  } else {
    const transferTopic = keccak256(toBytes("Transfer(address,address,uint256)"));
    const [rawLogs, head] = await Promise.all([
      client.request({
        method: "eth_getLogs",
        params: [
          {
            address: info.usdc,
            topics: [transferTopic, null, pad(receiver, { size: 32 })],
            fromBlock: numberToHex(receipt.blockNumber),
            toBlock: numberToHex(receipt.blockNumber),
          },
        ],
      }),
      headBlockNumber(info),
    ]);
    const match = rawLogs.find((log) => {
      if (!log.data || log.data === "0x") return false;
      try {
        return BigInt(log.data) === expected;
      } catch {
        return false;
      }
    });
    if (!match) {
      return {
        kind: "failed",
        error: `No ${intent.token} transfer of the exact amount to the merchant was found in this transaction.`,
        blockNumber: Number(receipt.blockNumber),
      };
    }

    const confirmations = Number(head - receipt.blockNumber + 1n);
    const blockNumber = Number(receipt.blockNumber);
    if (confirmations >= REQUIRED_CONFIRMATIONS) {
      return { kind: "confirmed", confirmations, blockNumber };
    }
    return { kind: "confirming", confirmations, blockNumber };
  }

  const head = await headBlockNumber(info);
  const confirmations = Number(head - receipt.blockNumber + 1n);
  const blockNumber = Number(receipt.blockNumber);

  if (confirmations >= REQUIRED_CONFIRMATIONS) {
    return { kind: "confirmed", confirmations, blockNumber };
  }
  return { kind: "confirming", confirmations, blockNumber };
}

const SETTLEMENT_SCAN_WINDOW = 5_000n;

/**
 * Auto-detect a settlement payment by scanning recent `Settled` logs for this
 * intent's merchant + ref. Uses eth_getLogs directly (no API key needed).
 */
async function detectSettlementTx(intent: PaymentIntent, info: TestnetInfo): Promise<string | null> {
  const contract = settlementAddress(info);
  if (!contract || !intent.merchant_id) return null;
  const client = clientFor(info);
  try {
    const head = await client.getBlockNumber();
    const fromBlock = head > SETTLEMENT_SCAN_WINDOW ? head - SETTLEMENT_SCAN_WINDOW : 0n;
    const topics = encodeEventTopics({
      abi: SETTLEMENT_ABI,
      eventName: "Settled",
      args: { merchantId: intent.merchant_id as Hex, ref: refFor(intent.id) },
    });
    const rawLogs = await client.request({
      method: "eth_getLogs",
      params: [
        {
          address: contract,
          topics: topics as Hex[],
          fromBlock: numberToHex(fromBlock),
          toBlock: numberToHex(head),
        },
      ],
    });
    const expected = BigInt(intent.expected_units);
    for (const log of parseEventLogs({ abi: SETTLEMENT_ABI, logs: rawLogs, eventName: "Settled" })) {
      if (!log.args) continue;
      const tokenOk =
        intent.token === "ETH"
          ? log.args.token.toLowerCase() === NATIVE_TOKEN.toLowerCase()
          : log.args.token.toLowerCase() === info.usdc.toLowerCase();
      if (tokenOk && log.args.gross === expected) return log.transactionHash;
    }
  } catch (err) {
    console.warn("[verify] settlement log scan failed:", err);
  }
  return null;
}

const ETHERSCAN_COOLDOWN_KEY = "etherscan:cooldown";

/**
 * Optional auto-detect for QR payments. Settlement intents are found by
 * scanning `Settled` logs; legacy direct transfers use Etherscan
 * (requires ETHERSCAN_API_KEY).
 */
export async function detectIncomingTx(intent: PaymentIntent): Promise<string | null> {
  const info = testnetByKey(intent.chain_key);
  if (!info) return null;

  if (intent.merchant_id) return detectSettlementTx(intent, info);

  const apiKey = process.env.ETHERSCAN_API_KEY?.trim();
  if (!apiKey) return null;

  // Global backoff: 429s freeze further calls until the provider says try again.
  if (await getKv(ETHERSCAN_COOLDOWN_KEY)) return null;

  const expected = BigInt(intent.expected_units);
  const params = new URLSearchParams({
    chainid: String(info.etherscanChainId),
    module: "account",
    action: intent.token === "ETH" ? "txlist" : "tokentx",
    address: intent.receiver,
    page: "1",
    offset: "50",
    sort: "desc",
    apikey: apiKey,
  });

  const res = await fetch(`https://api.etherscan.io/v2/api?${params.toString()}`);
  if (res.status === 429 || res.status === 403) {
    const retryAfter = Math.max(1, Number(res.headers.get("retry-after")) || 15);
    await setKv(ETHERSCAN_COOLDOWN_KEY, "1", retryAfter * 1000);
    console.warn(`[verify] etherscan rate-limited (HTTP ${res.status}); backing off ${retryAfter}s`);
    return null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status?: string;
    message?: string;
    result?: Array<Record<string, string>>;
  };
  if (!Array.isArray(data.result)) return null;

  const since = intent.created_at - 5 * 60 * 1000;

  for (const row of data.result) {
    const ts = Number(row.timeStamp ?? 0) * 1000;
    if (ts < since) continue;
    if ((row.isError ?? "0") !== "0") continue;
    if (row.to?.toLowerCase() !== intent.receiver.toLowerCase()) continue;

    if (intent.token === "ETH") {
      if (BigInt(row.value ?? "0") === expected && row.hash) return row.hash;
    } else {
      if (row.contractAddress?.toLowerCase() !== info.usdc.toLowerCase()) continue;
      if (BigInt(row.value ?? "0") === expected && row.hash) return row.hash;
    }
  }
  return null;
}
