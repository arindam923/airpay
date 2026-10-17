import { and, asc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { getDb, type PaymentIntent } from "./db";
import { attachTx, expireIntent, listIntentsByStatus, markIntent } from "./intents";
import { detectIncomingTx, verifyIntent, type VerifyOutcome } from "./verify";
import { getKv, pruneKv, setKv } from "./kv";
import { paymentIntents } from "./schema";

/** Retry cadence for a submitted tx that is not mined yet. */
export const VERIFY_PENDING_MS = 15_000;
/** Retry cadence once mined but short of REQUIRED_CONFIRMATIONS. */
export const VERIFY_CONFIRMING_MS = 5_000;
/** Per-intent floor between QR detect scans. */
export const DETECT_INTERVAL_MS = 4_000;
/** Negative cache: skip re-scanning a receiver that has no matching transfers. */
const DETECT_RECEIVER_MISS_TTL_MS = 45_000;
const TERMINAL = ["confirmed", "failed", "expired"] as const;

/**
 * Atomically claim the right to run work for an intent. The conditional update
 * is what keeps concurrent serverless isolates (and the worker) from doing the
 * same RPC pass twice.
 */
export async function claimNextRun(
  id: string,
  field: "next_verify_at" | "next_detect_at",
  ttlMs: number,
): Promise<boolean> {
  const db = await getDb();
  const now = Date.now();
  const column = paymentIntents[field];
  const res = await db
    .update(paymentIntents)
    .set({ [field]: now + ttlMs })
    .where(and(eq(paymentIntents.id, id), or(isNull(column), lt(column, now))));
  return res.rowsAffected > 0;
}

/** Run `verifyIntent` and persist the outcome plus the next retry schedule. */
export async function verifyAndMark(intent: PaymentIntent): Promise<VerifyOutcome> {
  const outcome = await verifyIntent(intent);
  const now = Date.now();

  if (outcome.kind === "pending") {
    await markIntent(intent.id, { next_verify_at: now + VERIFY_PENDING_MS });
  } else if (outcome.kind === "confirming") {
    await markIntent(intent.id, {
      status: "confirming",
      confirmations: outcome.confirmations,
      block_number: outcome.blockNumber,
      next_verify_at: now + VERIFY_CONFIRMING_MS,
    });
    console.log(`[verify] intent ${intent.id} confirming (${outcome.confirmations} conf)`);
  } else if (outcome.kind === "confirmed") {
    await markIntent(intent.id, {
      status: "confirmed",
      confirmations: outcome.confirmations,
      block_number: outcome.blockNumber,
      confirmed: true,
      next_verify_at: null,
    });
    console.log(`[verify] intent ${intent.id} CONFIRMED in block ${outcome.blockNumber}`);
  } else {
    await markIntent(intent.id, {
      status: "failed",
      error: outcome.error,
      block_number: outcome.blockNumber,
      next_verify_at: null,
    });
    console.warn(`[verify] intent ${intent.id} failed: ${outcome.error}`);
  }
  return outcome;
}

export interface MaintenanceStats {
  expired: number;
  detected: number;
  verified: number;
  prunedIntents: number;
  prunedKv: number;
}

export async function sweepExpired(): Promise<number> {
  const stale = await listIntentsByStatus(["created", "awaiting_payment"]);
  let expired = 0;
  const now = Date.now();
  for (const intent of stale) {
    if (intent.expires_at <= now) {
      await expireIntent(intent.id);
      expired += 1;
    }
  }
  return expired;
}

/** One Etherscan scan per receiver; negative results are cached to bound API load. */
export async function detectFor(intent: PaymentIntent): Promise<string | null> {
  const key = `detectmiss:${intent.chain_key}:${intent.receiver.toLowerCase()}`;
  if (await getKv(key)) return null;

  const hash = await detectIncomingTx(intent);
  if (hash) return hash;
  await setKv(key, "1", DETECT_RECEIVER_MISS_TTL_MS);
  return null;
}

export async function runVerifySweep(limit: number): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const due = await db
    .select()
    .from(paymentIntents)
    .where(
      and(
        inArray(paymentIntents.status, ["submitted", "confirming"]),
        or(isNull(paymentIntents.next_verify_at), lt(paymentIntents.next_verify_at, now)),
      ),
    )
    .orderBy(asc(paymentIntents.next_verify_at))
    .limit(limit);

  let verified = 0;
  for (const intent of due) {
    if (!(await claimNextRun(intent.id, "next_verify_at", VERIFY_PENDING_MS))) continue;
    try {
      await verifyAndMark(intent);
      verified += 1;
    } catch (err) {
      console.warn(`[verify] intent ${intent.id} will retry:`, err instanceof Error ? err.message : err);
    }
  }
  return verified;
}

export async function runDetectSweep(limit: number): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const due = await db
    .select()
    .from(paymentIntents)
    .where(
      and(
        eq(paymentIntents.status, "awaiting_payment"),
        isNull(paymentIntents.tx_hash),
        or(isNull(paymentIntents.next_detect_at), lt(paymentIntents.next_detect_at, now)),
      ),
    )
    .orderBy(asc(paymentIntents.next_detect_at))
    .limit(limit);

  let detected = 0;
  for (const intent of due) {
    if (!(await claimNextRun(intent.id, "next_detect_at", DETECT_INTERVAL_MS))) continue;
    try {
      const hash = await detectFor(intent);
      if (hash) {
        await attachTx({ intentId: intent.id, txHash: hash });
        detected += 1;
      }
    } catch (err) {
      console.warn(`[detect] intent ${intent.id} will retry:`, err instanceof Error ? err.message : err);
    }
  }
  return detected;
}

/** Delete terminal intents older than `olderThanMs` and stale kv rows. */
export async function prune(olderThanMs: number, kvOlderThanMs: number): Promise<{ intents: number; kv: number }> {
  const db = await getDb();
  const res = await db
    .delete(paymentIntents)
    .where(
      and(
        inArray(paymentIntents.status, [...TERMINAL]),
        lt(paymentIntents.updated_at, Date.now() - olderThanMs),
      ),
    );
  const kvRows = await pruneKv(kvOlderThanMs);
  return { intents: res.rowsAffected, kv: kvRows };
}

export async function runMaintenance(opts: {
  maxDetect?: number;
  maxVerify?: number;
  pruneTerminalOlderThanMs?: number;
}): Promise<MaintenanceStats> {
  const expired = await sweepExpired();
  const detected = await runDetectSweep(opts.maxDetect ?? 20);
  const verified = await runVerifySweep(opts.maxVerify ?? 20);
  const pruned = opts.pruneTerminalOlderThanMs
    ? await prune(opts.pruneTerminalOlderThanMs, 24 * 60 * 60 * 1000)
    : { intents: 0, kv: 0 };
  return {
    expired,
    detected,
    verified,
    prunedIntents: pruned.intents,
    prunedKv: pruned.kv,
  };
}
