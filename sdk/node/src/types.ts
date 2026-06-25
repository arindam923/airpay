// ===========================================================================
// AirPay API types — derived from sdk/contract/openapi.yaml
// All timestamps are Unix milliseconds (integers).
// All monetary amounts are in cents (integers).
// ===========================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type Currency = "USDC" | "USDT" | "EURC"

export type Network = "Solana" | "Arbitrum" | "Polygon" | "Ethereum"

export type FeeType = "part_of" | "on_top"

export type CheckoutSessionStatus = "pending" | "completed" | "expired"

export type PaymentStatusValue =
  | "pending_confirmation"
  | "completed"
  | "settled"
  | "failed"

export type BlockchainStatus = "pending" | "confirmed" | "finalized" | "failed"

export type WebhookEventType =
  | "payment.confirmed"
  | "payment.failed"
  | "payout.completed"
  | "payment.refunded"

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export interface CheckoutSession {
  id: string
  object: "checkout.session"
  product_name: string
  amount: number
  fee_amount: number
  merchant_amount: number
  currency: Currency
  network: Network
  fee_type: FeeType
  fee_percentage: number
  merchant_wallet_address: string
  company_wallet_address: string
  collect_email: boolean
  status: CheckoutSessionStatus
  expires_at: number
  created_at: number
  metadata: Record<string, string> | null
}

export interface Payment {
  id: string
  object: "payment"
  checkout_session_id: string
  tx_hash: string
  buyer_address: string | null
  amount: number
  fee_amount: number
  merchant_amount: number
  status: PaymentStatusValue
  blockchain_status: BlockchainStatus
  confirmations: number
  retry_count: number
  failure_reason: string | null
  webhook_delivered: boolean
  webhook_delivery_count: number
  product_name: string
  currency: Currency
  network: Network
  buyer_email: string | null
  settled_at: number | null
  created_at: number
  updated_at: number
}

export interface PaymentStatus {
  id: string
  object: "payment.status"
  status: PaymentStatusValue
  blockchain_status: BlockchainStatus
  confirmations: number
  tx_hash: string
  retry_count: number
  failure_reason: string | null
  settled_at: number | null
}

export interface PaymentConfirmation {
  id: string
  object: "payment"
  checkout_session_id: string
  tx_hash: string
  status: "pending_confirmation"
  blockchain_status: "pending"
  message: string
}

export interface PaymentList {
  object: "list"
  data: Payment[]
  limit: number
  offset: number
  has_more: boolean
}

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export interface CreateCheckoutSessionParams {
  product_name: string
  amount: number
  currency: Currency
  network: Network
  collect_email?: boolean
  expires_in?: number
  metadata?: Record<string, string>
}

export interface ConfirmPaymentParams {
  tx_hash: string
  fee_tx_hash?: string
  buyer_address: string
  signature: string
  buyer_email?: string
}

export interface ListPaymentsParams {
  limit?: number
  offset?: number
  network?: Network
  status?: PaymentStatusValue
}

// ---------------------------------------------------------------------------
// Webhook events
// ---------------------------------------------------------------------------

export interface WebhookEvent {
  id: string
  object: "event"
  event: WebhookEventType
  payment_id: string
  checkout_session_id: string
  amount: number
  fee_amount: number
  merchant_amount: number
  currency?: Currency
  network?: Network
  tx_hash: string
  status: PaymentStatusValue
  blockchain_status: BlockchainStatus
  confirmations: number
  created: number
}

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  error: {
    type: ErrorType
    message: string
  }
}

export type ErrorType =
  | "authentication_error"
  | "authorization_error"
  | "invalid_request_error"
  | "not_found_error"
  | "resource_expired"
  | "rate_limit_error"
  | "internal_error"

// ---------------------------------------------------------------------------
// Client config
// ---------------------------------------------------------------------------

export interface AirpayConfig {
  /**
   * API key (secret or publishable). Required.
   * Secret keys: `sk_test_...` or `sk_live_...`
   * Publishable keys: `pk_test_...` or `pk_live_...`
   */
  secretKey?: string

  /**
   * Publishable key. If provided alongside secretKey, both are available
   * via the client but secretKey is used by default for authenticated calls.
   */
  publishableKey?: string

  /**
   * Base URL of the AirPay API.
   * @default "https://airpay-server.arindam92.workers.dev"
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  timeout?: number

  /**
   * Maximum number of retries on 5xx or network errors.
   * @default 3
   */
  maxRetries?: number

  /**
   * Optional custom fetch implementation (e.g. for testing or non-Node runtimes).
   * @default globalThis.fetch
   */
  fetch?: typeof fetch

  /**
   * Extra headers to send with every request.
   */
  defaultHeaders?: Record<string, string>
}
