import { HttpClient } from "./client.js";
import { CheckoutSessions } from "./resources/checkout-sessions.js";
import { Payments } from "./resources/payments.js";
import { constructEvent } from "./resources/webhooks.js";
import type { AirpayConfig, WebhookEvent } from "./types.js";

/**
 * The official AirPay Node.js SDK client.
 *
 * ```ts
 * const airpay = new AirpayClient({ secretKey: process.env.AIRPAY_SECRET_KEY });
 * const session = await airpay.checkoutSessions.create({
 *   product_name: "Pro Plan",
 *   amount: 4999,
 *   currency: "USDC",
 *   network: "Solana",
 * });
 * ```
 */
export class AirpayClient {
  private readonly httpClient: HttpClient;

  readonly checkoutSessions: CheckoutSessions;
  readonly payments: Payments;

  constructor(config: AirpayConfig = {}) {
    this.httpClient = new HttpClient(config);
    this.checkoutSessions = new CheckoutSessions(this.httpClient);
    this.payments = new Payments(this.httpClient);
  }

  /**
   * Verify the signature of an incoming webhook event and parse the payload.
   *
   * @param payload - Raw request body (string or Uint8Array).
   * @param signatureHeader - Value of the `AirPay-Signature` header.
   * @param secret - Merchant webhook signing key (`whsec_...`).
   * @param toleranceSeconds - Maximum age of the webhook timestamp (default 300s).
   */
  constructEvent(
    payload: string | Uint8Array,
    signatureHeader: string | null | undefined,
    secret: string,
    toleranceSeconds?: number,
  ): Promise<WebhookEvent> {
    return constructEvent(payload, signatureHeader, secret, toleranceSeconds);
  }
}
