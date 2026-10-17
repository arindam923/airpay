/**
 * RPC probe: verifies what the env-configured RPCs actually return.
 *
 *   npx tsx scripts/check-rpc.ts                 # probe every chain + latest DB intent
 *   npx tsx scripts/check-rpc.ts <txhash>        # also verify one specific tx
 *   npx tsx scripts/check-rpc.ts ethereum        # probe only one chain
 */
import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  http,
  keccak256,
  numberToHex,
  pad,
  toBytes,
  type Address,
  type Hash,
} from "viem";
import { desc } from "drizzle-orm";
import { REQUIRED_CONFIRMATIONS } from "../lib/intents";
import { rpcUrl, TESTNET_LIST, type TestnetInfo } from "../lib/chains";
import { getDb } from "../lib/db";
import { paymentIntents } from "../lib/schema";
import { detectIncomingTx, verifyIntent } from "../lib/verify";
import { getIntent } from "../lib/intents";

const PAYER = "0x62ab3f58dce3aa4a973418551021098bee8db06d" as Address;
const TRANSFER_TOPIC = keccak256(toBytes("Transfer(address,address,uint256)"));
const LOG_WINDOW_BLOCKS = 5_000n;

function loadDotEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const raw of fs.readFileSync(p, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

type Row = { label: string; ok: boolean; detail: string };

const rows: Row[] = [];
let scope = "";
function record(label: string, ok: boolean, detail: string): void {
  const full = scope ? `${scope}: ${label}` : label;
  rows.push({ label: full, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}\n        ${detail}`);
}

async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t0 = performance.now();
  const out = await fn();
  return [out, Math.round(performance.now() - t0)];
}

async function probeChain(info: TestnetInfo): Promise<void> {
  const url = rpcUrl(info);
  console.log(`\n=== ${info.name} (chainId ${info.chainId}) — ${url}`);
  scope = info.name;
  const client = createPublicClient({ chain: info.viemChain, transport: http(url) });

  try {
    const [chainId, ms] = await timed(() => client.getChainId());
    record("eth_chainId", chainId === info.chainId, `returned ${chainId} in ${ms}ms`);
  } catch (err) {
    record("eth_chainId", false, String(err));
    scope = "";
    return;
  }

  try {
    const [head, ms] = await timed(() => client.getBlockNumber());
    record("eth_blockNumber", head > 0n, `#${head} in ${ms}ms`);
    await probeContract(client, info, head);
  } catch (err) {
    record("eth_blockNumber", false, String(err));
  }
  scope = "";
}

async function probeContract(
  client: ReturnType<typeof createPublicClient>,
  info: TestnetInfo,
  head: bigint,
): Promise<void> {
  const receiver = process.env.RECEIVER_ADDRESS?.trim() as Address | undefined;

  try {
    const [code, ms] = await timed(() => client.getCode({ address: info.usdc }));
    record("eth_getCode(USDC)", !!code && code !== "0x", `${(code ?? "0x").length} chars in ${ms}ms`);
  } catch (err) {
    record("eth_getCode(USDC)", false, String(err));
  }

  for (const [label, addr] of [
    ["payer", PAYER],
    ["receiver", receiver ?? PAYER],
  ] as const) {
    try {
      const [bal, ms] = await timed(async () => {
        const raw = await client.request({
          method: "eth_call",
          params: [{ to: info.usdc, data: `0x70a08231${addr.slice(2).padStart(64, "0")}` }, "latest"],
        });
        return raw === "0x" ? 0n : BigInt(raw);
      });
      record(`USDC balanceOf(${label})`, true, `${bal} raw (${Number(bal) / 1e6} USDC) in ${ms}ms`);
    } catch (err) {
      record(`USDC balanceOf(${label})`, false, String(err));
    }
  }

  try {
    const [nonce, ms] = await timed(() => client.getTransactionCount({ address: PAYER }));
    record("eth_getTransactionCount(payer)", true, `${nonce} txs in ${ms}ms`);
  } catch (err) {
    record("eth_getTransactionCount(payer)", false, String(err));
  }

  const fromBlock = numberToHex(head > LOG_WINDOW_BLOCKS ? head - LOG_WINDOW_BLOCKS : 0n);
  const toBlock = numberToHex(head);

  const logQueries: Array<[string, unknown[]]> = [
    ["eth_getLogs USDC sent-by payer", [TRANSFER_TOPIC, pad(PAYER, { size: 32 }), null]],
    ["eth_getLogs USDC received-by payer", [TRANSFER_TOPIC, null, pad(PAYER, { size: 32 })]],
  ];
  if (receiver) {
    logQueries.push([
      "eth_getLogs USDC received-by receiver (verify.ts query)",
      [TRANSFER_TOPIC, null, pad(receiver, { size: 32 })],
    ]);
  }

  for (const [label, topics] of logQueries) {
    const call = (from: string) =>
      client.request({
        method: "eth_getLogs",
        params: [{ address: info.usdc, topics: topics as never, fromBlock: from, toBlock }],
      });
    try {
      const [logs, ms] = await timed(() => call(fromBlock));
      record(label, true, `${logs.length} logs over last ${LOG_WINDOW_BLOCKS} blocks in ${ms}ms`);
    } catch (err) {
      // Some RPCs cap the block range (e.g. sepolia.base.org: 200). Retry narrow.
      try {
        const narrow = numberToHex(head > 200n ? head - 200n : 0n);
        const [logs, ms] = await timed(() => call(narrow));
        record(
          label,
          true,
          `${logs.length} logs over last 200 blocks in ${ms}ms (wide query rejected: ${String(err).split("\n")[0]})`,
        );
      } catch (err2) {
        record(label, false, String(err2));
      }
    }
  }
}

async function probeTx(hash: Hash): Promise<void> {
  console.log(`\n=== Transaction ${hash}`);
  const info = TESTNET_LIST[0];
  const target = process.argv[3] ? TESTNET_LIST.find((t) => t.key === process.argv[3]) : null;
  const chain = target ?? info;
  scope = chain.name;
  const client = createPublicClient({ chain: chain.viemChain, transport: http(rpcUrl(chain)) });

  try {
    const [receipt, ms] = await timed(() => client.getTransactionReceipt({ hash }));
    record("eth_getTransactionReceipt", true, `block ${receipt.blockNumber} status=${receipt.status} in ${ms}ms`);
    console.log(`        from=${receipt.from}\n        to=${receipt.to}\n        logs=${receipt.logs.length}`);

    const fromBlock = numberToHex(receipt.blockNumber);
    const toBlock = numberToHex(receipt.blockNumber);
    for (const [label, topics] of [
      ["receipt-block logs to receiver", [TRANSFER_TOPIC, null, pad(process.env.RECEIVER_ADDRESS!.trim() as Address, { size: 32 })]],
      ["receipt-block logs from payer", [TRANSFER_TOPIC, pad(receipt.from, { size: 32 }), null]],
    ] as Array<[string, unknown[]]>) {
      try {
        const logs = await client.request({
          method: "eth_getLogs",
          params: [{ address: chain.usdc, topics: topics as never, fromBlock, toBlock }],
        });
        record(label, true, `${logs.length} logs`);
        for (const l of logs as Array<{ data: string }>) {
          console.log(`          data=${l.data} -> ${l.data === "0x" ? "?" : Number(BigInt(l.data)) / 1e6} USDC`);
        }
      } catch (err) {
        record(label, false, String(err));
      }
    }

    const [head, headMs] = await timed(() => client.getBlockNumber());
    console.log(`        head=${head} confirmations=${head - receipt.blockNumber + 1n} (need ${REQUIRED_CONFIRMATIONS}) in ${headMs}ms`);
  } catch (err) {
    record("eth_getTransactionReceipt", false, String(err));
  }
  scope = "";
}

async function probeDbIntent(txArg?: string): Promise<void> {
  const id = process.env.PROBE_INTENT_ID;
  let intent: import("../lib/db").PaymentIntent | null = null;
  if (id) {
    intent = await getIntent(id);
  } else {
    const db = await getDb();
    const rows = await db
      .select()
      .from(paymentIntents)
      .orderBy(desc(paymentIntents.created_at))
      .limit(1);
    intent = rows[0] ?? null;
  }

  if (!intent) {
    console.log("\n=== DB: no payment intents found");
    return;
  }
  const it = intent;
  console.log(`\n=== Latest intent ${it.id}`);
  console.log(
    `        status=${it.status} chain=${it.chain_key} token=${it.token} expected=${it.expected_units} payer=${it.payer} tx=${it.tx_hash}`,
  );

  const hash = (txArg ?? it.tx_hash) as Hash | null;
  scope = `intent/${it.chain_key}`;
  if (!hash) {
    scope = "";
    console.log("        no tx hash attached yet — nothing to verify");
    return;
  }

  try {
    const outcome = await verifyIntent({ ...it, tx_hash: hash });
    console.log(`        verifyIntent -> ${JSON.stringify(outcome)}`);
    if (outcome.kind === "failed" || outcome.kind === "pending") {
      record("verifyIntent", false, JSON.stringify(outcome));
    } else {
      record("verifyIntent", true, JSON.stringify(outcome));
    }
  } catch (err) {
    record("verifyIntent", false, String(err));
  }

  try {
    const detected = await detectIncomingTx({ ...it, tx_hash: hash });
    record("detectIncomingTx (etherscan)", true, detected ? `found ${detected}` : "no match returned");
  } catch (err) {
    record("detectIncomingTx (etherscan)", false, String(err));
  }
  scope = "";
}

async function main(): Promise<void> {
  loadDotEnv();
  console.log(`RECEIVER_ADDRESS=${process.env.RECEIVER_ADDRESS}`);
  console.log(`ETHERSCAN_API_KEY=${process.env.ETHERSCAN_API_KEY ? "set" : "missing"}`);

  const args = process.argv.slice(2).filter((a) => a.startsWith("0x") && a.length === 66);
  const chainFilter = process.argv.slice(2).find((a) => TESTNET_LIST.some((t) => t.key === a));

  for (const info of TESTNET_LIST) {
    if (chainFilter && info.key !== chainFilter) continue;
    try {
      await probeChain(info);
    } catch (err) {
      record(`${info.name} probe`, false, String(err));
    }
  }

  const txHash = args[0];
  if (txHash) await probeTx(txHash as Hash);
  await probeDbIntent(txHash);

  const failed = rows.filter((r) => !r.ok);
  scope = "";
  console.log(`\n${"-".repeat(60)}`);
  console.log(`${rows.length - failed.length}/${rows.length} checks passed`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.label}: ${f.detail}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
