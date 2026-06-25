import type { HttpClient } from "../client.js";
import type { ListPaymentsParams, Payment, PaymentList, PaymentStatus } from "../types.js";

export class Payments {
  constructor(private readonly client: HttpClient) {}

  /**
   * Get the lightweight status of a payment.
   * Accepts a secret or publishable key.
   */
  status(id: string): Promise<PaymentStatus> {
    return this.client.request<PaymentStatus>("GET", `/api/v1/payments/${encodeURIComponent(id)}/status`, {
      keyType: "auto",
    });
  }

  /**
   * Retrieve the full payment record.
   * Requires a secret key.
   */
  retrieve(id: string): Promise<Payment> {
    return this.client.request<Payment>("GET", `/api/v1/payments/${encodeURIComponent(id)}`, {
      keyType: "secret",
    });
  }

  /**
   * List payments for the authenticated merchant.
   * Requires a secret key.
   */
  list(params: ListPaymentsParams = {}): Promise<PaymentList> {
    return this.client.request<PaymentList>("GET", "/api/v1/payments", {
      keyType: "secret",
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }
}
