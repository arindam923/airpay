import { createPublicClient, http, keccak256, numberToHex, pad, toBytes } from "viem";
import { rpcUrl, testnetByKey, type TestnetInfo } from "./chains";
import type { PaymentIntent } from "./db";
import { REQUIRED_CONFIRMATIONS } from "./intents";

const clientCache = new Map<string, ReturnType<typeof createPublicClient>>();

function clientFor(info: TestnetInfo) {
  let client = clientCache.get(info.key);
  if (!client) {
    client = createPublicClient({
      chain: info.viemChain,
      transport: http(rpcUrl(info)),
    });
    clientCache.set(info.key, client);
  }
  return client;
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
  try {
    receipt = await client.getTransactionReceipt({ hash });
  } catch (err) {
    if (isNotMined(err)) return { kind: "pending" };
    throw err;
  }

  if (receipt.status !== "success") {
    return { kind: "failed", error: "Transaction reverted on-chain.", blockNumber: Number(receipt.blockNumber) };
  }

  let tx;
  try {
    tx = await client.getTransaction({ hash });
  } catch (err) {
    if (isNotMined(err)) return { kind: "pending" };
    throw err;
  }

  if (intent.payer && tx.from.toLowerCase() !== intent.payer.toLowerCase()) {
    return {
      kind: "failed",
      error: `Sender ${tx.from} does not match the connected wallet.`,
      blockNumber: Number(receipt.blockNumber),
    };
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
    const rawLogs = await client.request({
      method: "eth_getLogs",
      params: [
        {
          address: info.usdc,
          topics: [transferTopic, null, pad(receiver, { size: 32 })],
          fromBlock: numberToHex(receipt.blockNumber),
          toBlock: numberToHex(receipt.blockNumber),
        },
      ],
    });
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
  }

  const head = await client.getBlockNumber();
  const confirmations = Number(head - receipt.blockNumber + 1n);
  const blockNumber = Number(receipt.blockNumber);

  if (confirmations >= REQUIRED_CONFIRMATIONS) {
    return { kind: "confirmed", confirmations, blockNumber };
  }
  return { kind: "confirming", confirmations, blockNumber };
}

/**
 * Optional QR auto-detect: look for an incoming transfer to the merchant
 * matching the invoice amount (requires ETHERSCAN_API_KEY).
 */
export async function detectIncomingTx(intent: PaymentIntent): Promise<string | null> {
  const apiKey = process.env.ETHERSCAN_API_KEY?.trim();
  if (!apiKey) return null;

  const info = testnetByKey(intent.chain_key);
  if (!info) return null;

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
