import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AirpayClient, AirpaySignatureVerificationError, constructEvent } from "../src/index.js";
import type { WebhookEvent } from "../src/types.js";

const webhookSecret = "whsec_test_secret";

function signPayload(payload: string, timestamp: number, secret: string): string {
  const signed = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signed}`;
}

const payload: WebhookEvent = {
  id: "evt_123",
  object: "event",
  event: "payment.confirmed",
  payment_id: "pay_123",
  checkout_session_id: "cs_123",
  amount: 4999,
  fee_amount: 100,
  merchant_amount: 4899,
  currency: "USDC",
  network: "Solana",
  tx_hash: "txhash",
  status: "completed",
  blockchain_status: "finalized",
  confirmations: 12,
  created: 1_000_000,
};

const payloadString = JSON.stringify(payload);

describe("constructEvent", () => {
  it("verifies a valid webhook signature", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signPayload(payloadString, timestamp, webhookSecret);

    const event = await constructEvent(payloadString, signature, webhookSecret);
    expect(event).toEqual(payload);
  });

  it("verifies via AirpayClient", async () => {
    const client = new AirpayClient();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signPayload(payloadString, timestamp, webhookSecret);

    const event = await client.constructEvent(payloadString, signature, webhookSecret);
    expect(event).toEqual(payload);
  });

  it("rejects a missing signature header", async () => {
    await expect(constructEvent(payloadString, undefined, webhookSecret)).rejects.toThrow(
      AirpaySignatureVerificationError,
    );
  });

  it("rejects an invalid signature", async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = `t=${timestamp},v1=deadbeef`;

    await expect(constructEvent(payloadString, signature, webhookSecret)).rejects.toThrow(
      "Invalid webhook signature",
    );
  });

  it("rejects an old timestamp outside tolerance", async () => {
    const timestamp = Math.floor(Date.now() / 1000) - 10 * 60; // 10 minutes ago
    const signature = signPayload(payloadString, timestamp, webhookSecret);

    await expect(constructEvent(payloadString, signature, webhookSecret)).rejects.toThrow(
      "outside tolerance",
    );
  });

  it("accepts an old timestamp when tolerance is disabled", async () => {
    const timestamp = Math.floor(Date.now() / 1000) - 10 * 60;
    const signature = signPayload(payloadString, timestamp, webhookSecret);

    const event = await constructEvent(payloadString, signature, webhookSecret, 0);
    expect(event).toEqual(payload);
  });

  it("rejects a malformed signature header", async () => {
    await expect(constructEvent(payloadString, "malformed", webhookSecret)).rejects.toThrow(
      AirpaySignatureVerificationError,
    );
  });
});
