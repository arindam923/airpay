import { describe, expect, it } from "vitest";
import { AirpayClient } from "../src/index.js";
import type { CheckoutSession, Payment, PaymentConfirmation, PaymentList, PaymentStatus } from "../src/types.js";
import checkoutSessionFixture from "../../contract/examples/create_checkout_session_response.json" with { type: "json" };
import confirmPaymentFixture from "../../contract/examples/confirm_payment_response.json" with { type: "json" };
import paymentStatusFixture from "../../contract/examples/payment_status_response.json" with { type: "json" };
import paymentDetailFixture from "../../contract/examples/payment_detail_response.json" with { type: "json" };
import paymentListFixture from "../../contract/examples/payment_list_response.json" with { type: "json" };

function mockFetch(response: unknown, status = 200, headers?: Record<string, string>): typeof fetch {
  return (async () =>
    new Response(response === undefined ? undefined : JSON.stringify(response), {
      status,
      headers: headers ?? { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

describe("AirpayClient", () => {
  it("creates a checkout session", async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fetchFn = (async (url: string | URL | Request, init?: RequestInit) => {
      captured = { url: url.toString(), init: init ?? {} };
      return new Response(JSON.stringify(checkoutSessionFixture), { status: 201, headers: { "Content-Type": "application/json" } });
    }) as unknown as typeof fetch;

    const client = new AirpayClient({ secretKey: "sk_test_123", fetch: fetchFn });
    const result = await client.checkoutSessions.create({
      product_name: "Pro Plan — Annual",
      amount: 4999,
      currency: "USDC",
      network: "Solana",
    });

    expect(result).toEqual(checkoutSessionFixture);
    expect(captured?.url).toBe("https://airpay-server.arindam92.workers.dev/api/v1/checkout/sessions");
    expect(captured?.init.method).toBe("POST");
    expect(captured?.init.headers).toMatchObject({ Authorization: "Bearer sk_test_123" });
  });

  it("retrieves a checkout session with publishable key", async () => {
    const client = new AirpayClient({
      publishableKey: "pk_test_123",
      fetch: mockFetch(checkoutSessionFixture),
    });

    const result = await client.checkoutSessions.retrieve(checkoutSessionFixture.id);
    expect(result).toEqual(checkoutSessionFixture);
  });

  it("confirms a payment without auth", async () => {
    let authHeader: string | null = null;
    const fetchFn = (async (_url: string | URL | Request, init?: RequestInit) => {
      authHeader = ((init?.headers as Record<string, string> | undefined)?.Authorization as string | null) ?? null;
      return new Response(JSON.stringify(confirmPaymentFixture), { status: 201, headers: { "Content-Type": "application/json" } });
    }) as unknown as typeof fetch;

    const client = new AirpayClient({ fetch: fetchFn });
    const result = await client.checkoutSessions.confirm(checkoutSessionFixture.id, {
      tx_hash: "5as...long_hash...abc",
      buyer_address: "buyer1111",
      signature: "sig",
    });

    expect(result).toEqual(confirmPaymentFixture);
    expect(authHeader).toBeNull();
  });

  it("gets payment status", async () => {
    const client = new AirpayClient({
      publishableKey: "pk_test_123",
      fetch: mockFetch(paymentStatusFixture),
    });

    const result = await client.payments.status(paymentStatusFixture.id);
    expect(result).toEqual(paymentStatusFixture);
  });

  it("retrieves a payment with secret key", async () => {
    const client = new AirpayClient({
      secretKey: "sk_test_123",
      fetch: mockFetch(paymentDetailFixture),
    });

    const result = await client.payments.retrieve(paymentDetailFixture.id);
    expect(result).toEqual(paymentDetailFixture);
  });

  it("lists payments with query params", async () => {
    let url = "";
    const fetchFn = (async (requestUrl: string | URL | Request) => {
      url = requestUrl.toString();
      return new Response(JSON.stringify(paymentListFixture), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as unknown as typeof fetch;

    const client = new AirpayClient({ secretKey: "sk_test_123", fetch: fetchFn });
    const result = await client.payments.list({ limit: 20, network: "Solana" });

    expect(result).toEqual(paymentListFixture);
    expect(url).toContain("limit=20");
    expect(url).toContain("network=Solana");
  });
});
