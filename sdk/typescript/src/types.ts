/**
 * Wire-level types for the AirPay API.
 *
 * Field names mirror the JSON payloads exactly (snake_case) so values can be
 * used without translation. All timestamps are Unix seconds unless a field name
 * says `ms`; all amounts are integers in the smallest currency unit (cents).
 */

export type Environment = "sandbox" | "production";

export type TokenSymbol = "USDC" | "ETH";

export type ApiKeyKind = "secret" | "publishable";

export type AirPayErrorType =
  | "invalid_request_error"
  | "authentication_error"
  | "permission_error"
  | "rate_limit_error"
  | "idempotency_error"
  | "api_error";

export type PaymentIntentStatus =
  | "requires_payment"
  | "processing"
  | "succeeded"
  | "canceled"
  | "expired";

export type CheckoutSessionStatus = "open" | "complete" | "expired";

export type WebhookEventType =
  | "payment.created"
  | "payment.submitted"
  | "payment.confirmed"
  | "payment.failed"
  | "payment.expired"
  | "checkout.session.completed"
  | "checkout.session.expired"
  | "invoice.created"
  | "invoice.sent"
  | "invoice.viewed"
  | "invoice.paid"
  | "invoice.void"
  | "link.created"
  | "link.revoked"
  | "webhook.test";

export interface AccountKey {
  id: string;
  kind: ApiKeyKind;
  scope: "full" | "readonly" | "publishable";
}

export interface AccountCapabilities {
  sandbox: boolean;
  production: boolean;
}

export interface Account {
  object: "account";
  id: string;
  workspace_name: string;
  environment: Environment;
  livemode: boolean;
  key: AccountKey;
  capabilities: AccountCapabilities;
}

export interface TokenInfo {
  symbol: TokenSymbol;
  decimals: number;
}

export interface Chain {
  key: string;
  name: string;
  chain_id: number;
  native_symbol: string;
  settlement_address: string;
  tokens: TokenInfo[];
}

export interface AirPayConfig {
  object: "config";
  environment: Environment;
  livemode: boolean;
  chains: Chain[];
}

export interface PaymentIntent {
  id: string;
  object: "payment_intent";
  created: number;
  status: PaymentIntentStatus;
  amount: number;
  currency: "usd";
  chain: string;
  token: TokenSymbol;
  expected_units: string;
  receiver: string;
  /** Present only on the create response. */
  client_secret?: string;
  metadata: Record<string, string>;
  payer: string | null;
  tx_hash: string | null;
  confirmations: number;
  required_confirmations: number;
  invoice_id: string | null;
  expires_at: number;
  confirmed_at: number | null;
  last_payment_error: { message: string } | null;
  environment: Environment;
  livemode: boolean;
}

export interface CheckoutSession {
  id: string;
  object: "checkout.session";
  status: CheckoutSessionStatus;
  url: string;
  payment_intent: string;
  success_url: string | null;
  cancel_url: string | null;
  client_reference_id: string | null;
  metadata: Record<string, string>;
  created: number;
  expires_at: number;
  completed_at: number | null;
  environment: Environment;
  livemode: boolean;
}

export interface AirPayList<T> {
  object: "list";
  url: string;
  has_more: boolean;
  data: T[];
}

export type PaymentIntentList = AirPayList<PaymentIntent>;
export type CheckoutSessionList = AirPayList<CheckoutSession>;

export interface WebhookEvent<TData = Record<string, unknown>> {
  id: string;
  type: WebhookEventType;
  /** Unix timestamp in milliseconds. */
  createdAt: number;
  environment: Environment;
  data: TData;
}

export interface RequestOptions {
  /** Makes the request safely retryable. */
  idempotencyKey?: string;
  /** Required to read/confirm an intent with a publishable key. */
  clientSecret?: string;
  signal?: AbortSignal;
}

export interface ListParams {
  /** 1–100, defaults to 10. */
  limit?: number;
  startingAfter?: string;
}

export interface PaymentIntentCreateParams {
  /** Amount in minor units (cents). */
  amount: number;
  chain: string;
  currency?: "usd";
  token?: TokenSymbol;
  title?: string;
  merchant?: string;
  description?: string;
  metadata?: Record<string, string>;
  receiver?: string;
}

export interface PaymentIntentRetrieveParams {
  clientSecret?: string;
}

export interface PaymentIntentConfirmParams {
  txHash: string;
  payer?: string;
  clientSecret?: string;
}

export interface CheckoutSessionCreateParams {
  /** Amount in minor units (cents). */
  amount: number;
  chain: string;
  currency?: "usd";
  token?: TokenSymbol;
  successUrl?: string;
  cancelUrl?: string;
  clientReferenceId?: string;
  metadata?: Record<string, string>;
  title?: string;
  merchant?: string;
}
