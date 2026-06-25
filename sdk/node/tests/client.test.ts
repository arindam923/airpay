import { describe, expect, it } from "vitest";
import { AirpayClient } from "../src/index.js";
import type { CheckoutSession, Payment, PaymentConfirmation, PaymentList, PaymentStatus } from "../src/types.js";

function mockFetch(response: unknown, status = 200, headers?: Record<string, string>): typeof fetch {
  return (async () =>
    new Response(response === undefined ? undefined : JSON.stringify(response), {
      status,
      headers: headers ?? { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

const checkoutSession: CheckoutSession = {
  id: "cs_123",
  object: "checkout.session",
  product_name: "Pro Plan",
  amount: 4999,
  fee_amount: 100,
  merchant_amount: 4899,
  currency: "USDC",
  network: "Solana",
  fee_type: "part_of",
  fee_percentage: 200,
  merchant_wallet_address: "merchant1111",
  company_wallet_address: "company1111",
  collect_email: false,
  status: "pending",
  expires_at: 1_000_000,
  created_at: 900_000,
  metadata: null,
};

describe("AirpayClient", () => {
  it("creates a checkout session", async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      captured = { url: url.toString(), init: init ?? {} };
      return new Response(JSON.stringify(checkoutSession), { status: 201, headers: { "Content-Type": "application/json" } });
    }) as unknown as typeof fetch;

    const client = new AirpayClient({ secretKey: "sk_test_123", fetch: fetchFn });
    const result = await client.checkoutSessions.create({
      product_name: "Pro Plan",
      amount: 4999,
      currency: "USDC",
      network: "Solana",
    });

    expect(result).toEqual(checkoutSession);
    expect(captured?.url).toBe("https://airpay-server.arindam92.workers.dev/api/v1/checkout/sessions");
    expect(captured?.init.method).toBe("POST");
    expect(captured?.init.headers).toMatchObject({ Authorization: "Bearer sk_test_123" });
  });

  it("retrieves a checkout session with publishable key", async () => {
    const client = new AirpayClient({
      publishableKey: "pk_test_123",
      fetch: mockFetch(checkoutSession),
    });

    const result = await client.checkoutSessions.retrieve("cs_123");
    expect(result).toEqual(checkoutSession);
  });

  it("confirms a payment without auth", async () => {
    const confirmation: PaymentConfirmation = {
      id: "pay_123",
      object: "payment",
      checkout_session_id: "cs_123",
      tx_hash: "txhash",
      status: "pending_confirmation",
      blockchain_status: "pending",
      message: "Payment recorded",
    };

    let authHeader: string | null = null;
    const fetchFn = (async (_url: string | URL | Request, init?: RequestInit) => {
      authHeader = ((init?.headers as Record<string, string> | undefined)?.Authorization as string | null) ?? null;
      return new Response(JSON.stringify(confirmation), { status: 201, headers: { "Content-Type": "application/json" } });
    }) as unknown as typeof fetch;

    const client = new AirpayClient({ fetch: fetchFn });
    const result = await client.checkoutSessions.confirm("cs_123", {
      tx_hash: "txhash",
      buyer_address: "buyer1111",
      signature: "sig",
    });

    expect(result).toEqual(confirmation);
    expect(authHeader).toBeNull();
  });

  it("gets payment status", async () => {
    const status: PaymentStatus = {
      id: "pay_123",
      object: "payment.status",
      status: "completed",
      blockchain_status: "finalized",
      confirmations: 12,
      tx_hash: "txhash",
      retry_count: 0,
      failure_reason: null,
      settled_at: 1_000_000,
    };

    const client = new AirpayClient({
      publishableKey: "pk_test_123",
      fetch: mockFetch(status),
    });

    const result = await client.payments.status("pay_123");
    expect(result).toEqual(status);
  });

  it("retrieves a payment with secret key", async () => {
    const payment: Payment = {
      id: "pay_123",
      object: "payment",
      checkout_session_id: "cs_123",
      tx_hash: "txhash",
      buyer_address: "buyer1111",
      amount: 4999,
      fee_amount: 100,
      merchant_amount: 4899,
      status: "completed",
      blockchain_status: "finalized",
      confirmations: 12,
      retry_count: 0,
      failure_reason: null,
      webhook_delivered: true,
      webhook_delivery_count: 1,
      product_name: "Pro Plan",
      currency: "USDC",
      network: "Solana",
      buyer_email: null,
      settled_at: 1_000_000,
      created_at: 900_000,
      updated_at: 950_000,
    };

    const client = new AirpayClient({
      secretKey: "sk_test_123",
      fetch: mockFetch(payment),
    });

    const result = await client.payments.retrieve("pay_123");
    expect(result).toEqual(payment);
  });

  it("lists payments with query params", async () => {
    const list: PaymentList = {
      object: "list",
      data: [],
      limit: 10,
      offset: 0,
      has_more: false,
    };

    let url = "";
    const fetchFn = (async (requestUrl: string | URL | Request) => {
      url = requestUrl.toString();
      return new Response(JSON.stringify(list), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as unknown as typeof fetch;

    const client = new AirpayClient({ secretKey: "sk_test_123", fetch: fetchFn });
    const result = await client.payments.list({ limit: 10, network: "Solana" });

    expect(result).toEqual(list);
    expect(url).toContain("limit=10");
    expect(url).toContain("network=Solana");
  });
});
