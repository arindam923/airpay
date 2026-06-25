import type { HttpClient } from "../client.js";
import type {
  CheckoutSession,
  ConfirmPaymentParams,
  CreateCheckoutSessionParams,
  PaymentConfirmation,
} from "../types.js";

export class CheckoutSessions {
  constructor(private readonly client: HttpClient) {}

  /**
   * Create a new checkout session.
   * Requires a secret key.
   */
  create(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    return this.client.request<CheckoutSession>("POST", "/api/v1/checkout/sessions", {
      keyType: "secret",
      body: params,
    });
  }

  /**
   * Retrieve a checkout session by ID.
   * Accepts a secret or publishable key.
   */
  retrieve(id: string): Promise<CheckoutSession> {
    return this.client.request<CheckoutSession>("GET", `/api/v1/checkout/sessions/${encodeURIComponent(id)}`, {
      keyType: "auto",
    });
  }

  /**
   * Confirm a payment for a checkout session (buyer-side).
   * This endpoint is unauthenticated.
   */
  confirm(id: string, params: ConfirmPaymentParams): Promise<PaymentConfirmation> {
    return this.client.request<PaymentConfirmation>("POST", `/api/v1/checkout/sessions/${encodeURIComponent(id)}/confirm`, {
      keyType: "none",
      body: params,
    });
  }
}
