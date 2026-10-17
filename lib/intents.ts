import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { usdToUnits } from "./amounts";
import type { IntentStatus, PublicIntent } from "./api-types";
import { testnetByKey, testnetByName } from "./chains";
import { getDb, type PaymentIntent } from "./db";
import { paymentIntents } from "./schema";

export type { IntentStatus, PublicIntent };

export const INTENT_TTL_MS = 15 * 60 * 1000;
export const REQUIRED_CONFIRMATIONS = 2;

export const TERMINAL_STATUSES: IntentStatus[] = ["confirmed", "failed", "expired"];

export interface CreateIntentInput {
  slug: string;
  title: string;
  merchant: string;
  mode: "fixed" | "flex";
  amount: number;
  min: number;
  max: number | null;
  chain: string;
  coin: string;
}

export class IntentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function receiverAddress(): string {
  const addr = process.env.RECEIVER_ADDRESS?.trim();
  if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    throw new IntentError(
      "RECEIVER_ADDRESS is not configured. Set it in .env.local to a testnet EVM address.",
      500
    );
  }
  return addr;
}

export async function createIntent(input: CreateIntentInput): Promise<PaymentIntent> {
  const info = testnetByName(input.chain);
  if (!info) {
    throw new IntentError(`Unsupported network: ${input.chain}. Only EVM testnets are live.`);
  }
  if (input.coin !== "USDC" && input.coin !== "ETH") {
    throw new IntentError(`Unsupported coin: ${input.coin}.`);
  }
  if (input.mode === "fixed") {
    if (!(input.amount > 0)) throw new IntentError("Amount must be greater than zero.");
  } else {
    if (!(input.min > 0)) throw new IntentError("Minimum amount must be greater than zero.");
    if (input.amount < input.min) throw new IntentError("Amount is below the minimum.");
    if (input.max != null && input.amount > input.max) throw new IntentError("Amount is above the maximum.");
  }

  const expectedUnits = usdToUnits(input.amount, input.coin);
  if (expectedUnits <= 0n) throw new IntentError("Amount is too small for on-chain settlement.");

  const now = Date.now();
  const intent: PaymentIntent = {
    id: randomUUID(),
    slug: input.slug,
    title: input.title,
    merchant: input.merchant,
    mode: input.mode,
    amount_usd: input.amount,
    chain_key: info.key,
    token: input.coin,
    expected_units: expectedUnits.toString(),
    receiver: receiverAddress(),
    payer: null,
    tx_hash: null,
    status: "awaiting_payment",
    confirmations: 0,
    block_number: null,
    error: null,
    created_at: now,
    expires_at: now + INTENT_TTL_MS,
    updated_at: now,
    confirmed_at: null,
    next_verify_at: null,
    next_detect_at: null,
  };

  const db = await getDb();
  await db.insert(paymentIntents).values(intent);
  return intent;
}

export async function getIntent(id: string): Promise<PaymentIntent | null> {
  const db = await getDb();
  const rows = await db.select().from(paymentIntents).where(eq(paymentIntents.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listIntentsByStatus(statuses: IntentStatus[]): Promise<PaymentIntent[]> {
  if (statuses.length === 0) return [];
  const db = await getDb();
  return db
    .select()
    .from(paymentIntents)
    .where(inArray(paymentIntents.status, statuses))
    .orderBy(asc(paymentIntents.created_at));
}

export interface SubmitInput {
  intentId: string;
  txHash: string;
  payer?: string | null;
}

export async function attachTx({ intentId, txHash, payer }: SubmitInput): Promise<PaymentIntent> {
  const intent = await getIntent(intentId);
  if (!intent) throw new IntentError("Payment intent not found.", 404);
  if (TERMINAL_STATUSES.includes(intent.status)) {
    throw new IntentError(`This payment is already ${intent.status}.`, 409);
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new IntentError("Invalid transaction hash.");
  }
  if (payer && !/^0x[0-9a-fA-F]{40}$/.test(payer)) {
    throw new IntentError("Invalid payer address.");
  }

  const now = Date.now();
  const db = await getDb();
  // Conditional update keeps concurrent writers (worker / self-heal / cron)
  // from resurrecting a terminal intent.
  const res = await db
    .update(paymentIntents)
    .set({
      status: "submitted",
      tx_hash: txHash.toLowerCase(),
      payer: payer?.toLowerCase() ?? intent.payer,
      updated_at: now,
      next_verify_at: now,
    })
    .where(
      and(
        eq(paymentIntents.id, intentId),
        notInArray(paymentIntents.status, TERMINAL_STATUSES),
      ),
    );

  if (res.rowsAffected === 0) {
    const fresh = await getIntent(intentId);
    if (!fresh) throw new IntentError("Payment intent not found.", 404);
    throw new IntentError(`This payment is already ${fresh.status}.`, 409);
  }
  return (await getIntent(intentId)) ?? intent;
}

export async function markIntent(
  id: string,
  patch: Partial<
    Pick<
      PaymentIntent,
      | "status"
      | "confirmations"
      | "block_number"
      | "error"
      | "tx_hash"
      | "payer"
      | "next_verify_at"
      | "next_detect_at"
    >
  > & { confirmed?: boolean },
): Promise<void> {
  const sets: Partial<typeof paymentIntents.$inferInsert> = { updated_at: Date.now() };
  for (const key of [
    "status",
    "confirmations",
    "block_number",
    "error",
    "tx_hash",
    "payer",
    "next_verify_at",
    "next_detect_at",
  ] as const) {
    if (patch[key] !== undefined) sets[key] = patch[key] as never;
  }
  if (patch.confirmed) sets.confirmed_at = Date.now();

  const db = await getDb();
  await db.update(paymentIntents).set(sets).where(eq(paymentIntents.id, id));
}

export async function expireIntent(
  id: string,
  reason = "Payment expired before it was verified.",
): Promise<void> {
  await markIntent(id, { status: "expired", error: reason });
}

export function toPublic(intent: PaymentIntent): PublicIntent {
  const info = testnetByKey(intent.chain_key);
  return {
    id: intent.id,
    status: intent.status as IntentStatus,
    amountUsd: intent.amount_usd,
    token: intent.token,
    chainKey: intent.chain_key,
    chainName: info?.name ?? intent.chain_key,
    expectedUnits: intent.expected_units,
    receiver: intent.receiver,
    payer: intent.payer,
    txHash: intent.tx_hash,
    confirmations: intent.confirmations,
    requiredConfirmations: REQUIRED_CONFIRMATIONS,
    explorerTx: intent.tx_hash && info ? info.explorerTx(intent.tx_hash) : null,
    expiresAt: intent.expires_at,
    error: intent.error,
    merchant: intent.merchant,
    title: intent.title,
    createdAt: intent.created_at,
    confirmedAt: intent.confirmed_at,
  };
}
