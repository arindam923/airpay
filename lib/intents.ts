import { randomUUID } from "node:crypto";
import { usdToUnits } from "./amounts";
import type { IntentStatus, PublicIntent } from "./api-types";
import { testnetByName, testnetByKey } from "./chains";
import { getDb, type PaymentIntent } from "./db";

export type { IntentStatus, PublicIntent };

export const INTENT_TTL_MS = 15 * 60 * 1000;
export const REQUIRED_CONFIRMATIONS = 2;

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

export function createIntent(input: CreateIntentInput): PaymentIntent {
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
  };

  getDb()
    .prepare(
      `INSERT INTO payment_intents
       (id, slug, title, merchant, mode, amount_usd, chain_key, token, expected_units, receiver,
        payer, tx_hash, status, confirmations, block_number, error, created_at, expires_at, updated_at, confirmed_at)
       VALUES
       (@id, @slug, @title, @merchant, @mode, @amount_usd, @chain_key, @token, @expected_units, @receiver,
        @payer, @tx_hash, @status, @confirmations, @block_number, @error, @created_at, @expires_at, @updated_at, @confirmed_at)`
    )
    .run(intent);

  return intent;
}

export function getIntent(id: string): PaymentIntent | null {
  return (
    (getDb().prepare("SELECT * FROM payment_intents WHERE id = ?").get(id) as
      | PaymentIntent
      | undefined) ?? null
  );
}

export function listIntentsByStatus(statuses: IntentStatus[]): PaymentIntent[] {
  const placeholders = statuses.map(() => "?").join(",");
  return getDb()
    .prepare(`SELECT * FROM payment_intents WHERE status IN (${placeholders}) ORDER BY created_at ASC`)
    .all(...statuses) as PaymentIntent[];
}

export interface SubmitInput {
  intentId: string;
  txHash: string;
  payer?: string | null;
}

export function attachTx({ intentId, txHash, payer }: SubmitInput): PaymentIntent {
  const intent = getIntent(intentId);
  if (!intent) throw new IntentError("Payment intent not found.", 404);
  if (intent.status === "confirmed" || intent.status === "failed" || intent.status === "expired") {
    throw new IntentError(`This payment is already ${intent.status}.`, 409);
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new IntentError("Invalid transaction hash.");
  }
  if (payer && !/^0x[0-9a-fA-F]{40}$/.test(payer)) {
    throw new IntentError("Invalid payer address.");
  }

  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE payment_intents
       SET status = 'submitted', tx_hash = ?, payer = COALESCE(?, payer), updated_at = ?
       WHERE id = ?`
    )
    .run(txHash.toLowerCase(), payer?.toLowerCase() ?? null, now, intentId);

  return getIntent(intentId)!;
}

export function markIntent(
  id: string,
  patch: Partial<
    Pick<PaymentIntent, "status" | "confirmations" | "block_number" | "error" | "tx_hash" | "payer">
  > & { confirmed?: boolean }
): void {
  const sets: string[] = ["updated_at = @updated_at"];
  const params: Record<string, unknown> = { id, updated_at: Date.now() };

  for (const key of ["status", "confirmations", "block_number", "error", "tx_hash", "payer"] as const) {
    if (patch[key] !== undefined) {
      sets.push(`${key} = @${key}`);
      params[key] = patch[key];
    }
  }
  if (patch.confirmed) {
    sets.push("confirmed_at = @confirmed_at");
    params.confirmed_at = Date.now();
  }

  getDb()
    .prepare(`UPDATE payment_intents SET ${sets.join(", ")} WHERE id = @id`)
    .run(params);
}

export function expireIntent(id: string, reason = "Payment expired before it was verified."): void {
  markIntent(id, { status: "expired", error: reason });
}

export function toPublic(intent: PaymentIntent): PublicIntent {
  const info = testnetByKey(intent.chain_key);
  return {
    id: intent.id,
    status: intent.status,
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
