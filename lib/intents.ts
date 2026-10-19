import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, notInArray } from "drizzle-orm";
import { usdToUnits } from "./amounts";
import type { IntentStatus, PublicIntent } from "./api-types";
import { settlementAddress, testnetByKey, testnetByName } from "./chains";
import { DEFAULT_ENVIRONMENT, isProductionReady, type Environment } from "./environment";
import { getDb, type PaymentIntent } from "./db";
import { paymentIntents } from "./schema";
import { splitFee } from "./settlement/abi";
import { getSettlementMerchant } from "./settlement/merchants";
import { feeUsd, netUsd } from "./fees";
import { emitEvent } from "./webhooks";

export type { IntentStatus, PublicIntent };

export const INTENT_TTL_MS = 15 * 60 * 1000;
export const REQUIRED_CONFIRMATIONS = 2;

export const TERMINAL_STATUSES: IntentStatus[] = ["confirmed", "failed", "expired"];

export interface CreateIntentInput {
  organizationId?: string | null;
  createdBy?: string | null;
  slug: string;
  title: string;
  merchant: string;
  mode: "fixed" | "flex";
  amount: number;
  min: number;
  max: number | null;
  chain: string;
  coin: string;
  /** Which environment the intent belongs to; defaults to sandbox. */
  environment?: Environment;
  /** Overrides the global RECEIVER_ADDRESS (e.g. the org's payout wallet). */
  receiver?: string | null;
  /** Links the intent back to an invoice so confirmation can mark it paid. */
  invoiceId?: string | null;
  /** SHA-256 of the public API client secret (never the plain value). */
  clientSecretHash?: string | null;
  /** Merchant metadata echoed on API reads and webhook payloads. */
  metadata?: Record<string, string> | null;
}

export class IntentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "IntentError";
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
  const environment = input.environment ?? DEFAULT_ENVIRONMENT;
  if (environment === "production" && !isProductionReady()) {
    throw new IntentError(
      "Production isn't available yet — mainnet is coming soon. Use a Sandbox link instead.",
      409
    );
  }
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

  const requestedReceiver = input.receiver?.trim() || null;
  if (requestedReceiver && !/^0x[0-9a-fA-F]{40}$/.test(requestedReceiver)) {
    throw new IntentError("Invalid receiver address.", 500);
  }

  // Route through the settlement contract when one is deployed for the chain
  // and the org is registered. Links/invoices snapshot the contract as their
  // receiver, so an explicit contract receiver is the settlement signal; a
  // missing receiver (dashboard-created intents) also opts into settlement.
  const settlementContract = settlementAddress(info);
  const explicitContract =
    !!settlementContract &&
    !!requestedReceiver &&
    requestedReceiver.toLowerCase() === settlementContract.toLowerCase();

  let receiver = requestedReceiver;
  let merchantId: string | null = null;
  let feeBps: number | null = null;

  if (settlementContract && (requestedReceiver == null || explicitContract) && input.organizationId) {
    const merchant = await getSettlementMerchant(input.organizationId, info.key);
    if (
      merchant &&
      merchant.status === "active" &&
      merchant.contractAddress.toLowerCase() === settlementContract.toLowerCase()
    ) {
      merchantId = merchant.merchantId;
      feeBps = merchant.feeBps;
      receiver = settlementContract;
    } else if (explicitContract) {
      throw new IntentError(
        "Settlement isn't ready for this network yet — the merchant needs to finish setup.",
        409,
      );
    }
  }

  if (!receiver) receiver = receiverAddress();

  let feeUnits: string | null = null;
  let netUnits: string | null = null;
  if (merchantId && feeBps != null) {
    const split = splitFee(expectedUnits, feeBps);
    feeUnits = split.fee.toString();
    netUnits = split.net.toString();
  }

  const now = Date.now();
  const intent: PaymentIntent = {
    id: randomUUID(),
    organizationId: input.organizationId ?? null,
    createdBy: input.createdBy ?? null,
    slug: input.slug,
    title: input.title,
    merchant: input.merchant,
    mode: input.mode,
    amount_usd: input.amount,
    chain_key: info.key,
    token: input.coin,
    environment,
    expected_units: expectedUnits.toString(),
    receiver,
    merchant_id: merchantId,
    fee_bps: feeBps,
    fee_units: feeUnits,
    net_units: netUnits,
    invoice_id: input.invoiceId ?? null,
    client_secret_hash: input.clientSecretHash ?? null,
    metadata: input.metadata ?? null,
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
    )
    .returning({ id: paymentIntents.id });

  if (res.length === 0) {
    const fresh = await getIntent(intentId);
    if (!fresh) throw new IntentError("Payment intent not found.", 404);
    throw new IntentError(`This payment is already ${fresh.status}.`, 409);
  }
  const fresh = (await getIntent(intentId)) ?? intent;
  await emitEvent({
    organizationId: fresh.organizationId,
    environment: fresh.environment,
    type: "payment.submitted",
    data: { intent: toPublic(fresh) },
    dedupeKey: `payment.submitted:${fresh.id}`,
  });
  return fresh;
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
  const intent = await getIntent(id);
  if (intent) {
    await emitEvent({
      organizationId: intent.organizationId,
      environment: intent.environment,
      type: "payment.expired",
      data: { intent: toPublic(intent) },
      dedupeKey: `payment.expired:${id}`,
    });
  }
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
    merchantId: intent.merchant_id,
    feeBps: intent.fee_bps,
    feeUnits: intent.fee_units,
    netUnits: intent.net_units,
    feeUsd: intent.fee_bps != null ? feeUsd(intent.amount_usd, intent.fee_bps) : null,
    netUsd: intent.fee_bps != null ? netUsd(intent.amount_usd, intent.fee_bps) : null,
    payer: intent.payer,
    txHash: intent.tx_hash,
    confirmations: intent.confirmations,
    requiredConfirmations: REQUIRED_CONFIRMATIONS,
    explorerTx: intent.tx_hash && info ? info.explorerTx(intent.tx_hash) : null,
    expiresAt: intent.expires_at,
    error: intent.error,
    merchant: intent.merchant,
    title: intent.title,
    environment: intent.environment,
    invoiceId: intent.invoice_id,
    metadata: intent.metadata ?? null,
    createdAt: intent.created_at,
    confirmedAt: intent.confirmed_at,
  };
}
