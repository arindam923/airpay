/** Wire types shared with the AirPay REST API. */

export type Environment = "sandbox" | "production";
export type TokenSymbol = "USDC" | "ETH";
export type PaymentIntentStatus =
  | "requires_payment"
  | "processing"
  | "succeeded"
  | "canceled"
  | "expired";
export type AirPayErrorType =
  | "invalid_request_error"
  | "authentication_error"
  | "permission_error"
  | "rate_limit_error"
  | "idempotency_error"
  | "api_error";

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

export interface Account {
  object: "account";
  id: string;
  workspace_name: string;
  environment: Environment;
  livemode: boolean;
  key: { id: string; kind: string; scope: string };
  capabilities: { sandbox: boolean; production: boolean };
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

export interface ConfirmIntentParams {
  txHash: string;
  payer?: string;
  /** The intent's client secret (server-issued). */
  clientSecret: string;
}

export interface RequestOptions {
  signal?: AbortSignal;
}
