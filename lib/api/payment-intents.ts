import { z } from "zod";
import { eq } from "drizzle-orm";
import type { PaymentIntent } from "@/lib/db";
import { getDb } from "@/lib/db";
import type { IntentStatus } from "@/lib/api-types";
import type { Environment } from "@/lib/environment";
import type { WorkspaceSettingsRow } from "@/lib/schema";
import { paymentIntents } from "@/lib/schema";
import { testnetByName, testnetByKey } from "@/lib/chains";
import { createIntent, REQUIRED_CONFIRMATIONS } from "@/lib/intents";
import { enabledPairs } from "@/lib/onboarding";
import { emitEvent } from "@/lib/webhooks";
import { ApiError } from "./errors";
import { generateClientSecret, hashClientSecret } from "./client-secret";

/** Public status vocabulary (Stripe-compatible) mapped from internal states. */
const STATUS_MAP: Record<IntentStatus, string> = {
  created: "requires_payment",
  awaiting_payment: "requires_payment",
  submitted: "processing",
  confirming: "processing",
  confirmed: "succeeded",
  failed: "canceled",
  expired: "expired",
};

export const createPaymentIntentApiSchema = z.object({
  /** Amount in minor units (cents). 125000 = $1,250.00. */
  amount: z.number().int().positive(),
  currency: z.literal("usd").default("usd"),
  chain: z.string().min(1),
  token: z.enum(["USDC", "ETH"]).default("USDC"),
  title: z.string().min(1).max(200).optional(),
  merchant: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  receiver: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
});

export type CreatePaymentIntentApiInput = z.infer<typeof createPaymentIntentApiSchema>;

/** Accepts either a chain key (`base`) or display name (`Base`). */
export function resolveChain(value: string) {
  const info = testnetByKey(value) ?? testnetByName(value);
  if (!info) {
    throw new ApiError(400, "unsupported_chain", `Unsupported chain: ${value}.`, "chain");
  }
  return info;
}

export function toApiPaymentIntent(
  intent: PaymentIntent,
  opts?: { clientSecret?: string },
): Record<string, unknown> {
  return {
    id: intent.id,
    object: "payment_intent",
    created: Math.floor(intent.created_at / 1000),
    status: STATUS_MAP[intent.status] ?? intent.status,
    amount: Math.round(intent.amount_usd * 100),
    currency: "usd",
    chain: intent.chain_key,
    token: intent.token,
    expected_units: intent.expected_units,
    receiver: intent.receiver,
    ...(opts?.clientSecret ? { client_secret: opts.clientSecret } : {}),
    metadata: intent.metadata ?? {},
    payer: intent.payer,
    tx_hash: intent.tx_hash,
    confirmations: intent.confirmations,
    required_confirmations: REQUIRED_CONFIRMATIONS,
    invoice_id: intent.invoice_id,
    expires_at: Math.floor(intent.expires_at / 1000),
    confirmed_at: intent.confirmed_at ? Math.floor(intent.confirmed_at / 1000) : null,
    last_payment_error: intent.error ? { message: intent.error } : null,
    environment: intent.environment,
    livemode: intent.environment === "production",
  };
}

export interface PaymentIntentList {
  object: "list";
  url: string;
  has_more: boolean;
  data: Record<string, unknown>[];
}

export interface CreateApiIntentParams {
  organizationId: string;
  environment: Environment;
  /** Minor units (cents). */
  amountMinor: number;
  chain: string;
  token: "USDC" | "ETH";
  title?: string;
  merchant?: string;
  metadata?: Record<string, string> | null;
  receiver?: string | null;
  settings: WorkspaceSettingsRow | null;
  /** Only headless intents need a browser client secret. */
  withClientSecret: boolean;
}

export interface CreatedApiIntent {
  intent: PaymentIntent;
  payload: Record<string, unknown>;
  clientSecret?: string;
}

/**
 * Shared creation path for `POST /v1/payment_intents` and
 * `POST /v1/checkout/sessions`, so both resources validate and emit
 * identically.
 */
export async function createApiIntent(params: CreateApiIntentParams): Promise<CreatedApiIntent> {
  const info = resolveChain(params.chain);
  const pairs = enabledPairs(params.settings);
  if (!pairs[info.key]?.includes(params.token)) {
    throw new ApiError(
      400,
      "unsupported_asset",
      `${params.token} is not enabled on ${info.name} for this account.`,
      "token",
    );
  }

  const intent = await createIntent({
    organizationId: params.organizationId,
    createdBy: null,
    slug: "checkout",
    title: params.title ?? "Payment",
    merchant: params.merchant ?? params.settings?.workspaceName ?? "Merchant",
    mode: "fixed",
    amount: params.amountMinor / 100,
    min: 0,
    max: null,
    chain: info.name,
    coin: params.token,
    environment: params.environment,
    receiver: params.receiver ?? null,
    metadata: params.metadata ?? null,
  });

  let clientSecret: string | undefined;
  let fresh = intent;

  if (params.withClientSecret) {
    clientSecret = generateClientSecret(intent.id);
    const clientSecretHash = hashClientSecret(clientSecret);
    const db = await getDb();
    await db
      .update(paymentIntents)
      .set({ client_secret_hash: clientSecretHash })
      .where(eq(paymentIntents.id, intent.id));
    fresh = { ...intent, client_secret_hash: clientSecretHash };
  }

  const payload = toApiPaymentIntent(fresh, { clientSecret });
  await emitEvent({
    organizationId: params.organizationId,
    environment: params.environment,
    type: "payment.created",
    data: { payment_intent: payload },
    dedupeKey: `payment.created:${intent.id}`,
  });

  return { intent: fresh, payload, clientSecret };
}
