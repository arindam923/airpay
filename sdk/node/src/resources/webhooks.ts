import { AirpaySignatureVerificationError } from "../errors.js";
import type { WebhookEvent } from "../types.js";

const SIGNATURE_VERSION = "v1";
const DEFAULT_TOLERANCE_SECONDS = 5 * 60; // 5 minutes

/**
 * Parse and verify a Stripe-style `AirPay-Signature` header.
 *
 * Throws {@link AirpaySignatureVerificationError} if the signature is missing,
 * malformed, invalid, or the timestamp is outside the allowed tolerance.
 */
export async function constructEvent(
  payload: string | Uint8Array,
  signatureHeader: string | null | undefined,
  secret: string,
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): Promise<WebhookEvent> {
  if (!signatureHeader) {
    throw new AirpaySignatureVerificationError("Missing AirPay-Signature header");
  }

  const { timestamp, signature } = parseSignatureHeader(signatureHeader);

  if (toleranceSeconds > 0) {
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > toleranceSeconds) {
      throw new AirpaySignatureVerificationError("Webhook timestamp outside tolerance");
    }
  }

  const expected = await computeSignature(payload, secret, timestamp);
  if (!constantTimeEqual(expected, signature)) {
    throw new AirpaySignatureVerificationError("Invalid webhook signature");
  }

  const parsed = typeof payload === "string" ? payload : new TextDecoder().decode(payload);
  return JSON.parse(parsed) as WebhookEvent;
}

function parseSignatureHeader(header: string): { timestamp: number; signature: string } {
  const parts = header.split(",");
  let timestamp: number | undefined;
  let signature: string | undefined;

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (!value) continue;
    if (key === "t") {
      timestamp = parseInt(value, 10);
    } else if (key === SIGNATURE_VERSION) {
      signature = value;
    }
  }

  if (timestamp === undefined || Number.isNaN(timestamp)) {
    throw new AirpaySignatureVerificationError("Invalid signature timestamp");
  }
  if (!signature) {
    throw new AirpaySignatureVerificationError("Missing v1 signature");
  }

  return { timestamp, signature };
}

async function computeSignature(
  payload: string | Uint8Array,
  secret: string,
  timestamp: number,
): Promise<string> {
  const encoder = new TextEncoder();
  const message = encoder.encode(`${timestamp}.${typeof payload === "string" ? payload : new TextDecoder().decode(payload)}`);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, message);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
