import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookEvent, WebhookEventType } from "./types.js";

/**
 * Verify `Airpay-Signature` headers and parse webhook payloads.
 *
 * AirPay signs each delivery with `t=<unix seconds>,v1=<hex HMAC-SHA256>` over
 * the string `"<t>.<raw request body>"`. Always verify against the **raw** body
 * (before JSON parsing) so the bytes match what was signed.
 */

export const DEFAULT_TOLERANCE_SECONDS = 300;

export type WebhookPayload = string | Buffer | Uint8Array;

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
    Object.setPrototypeOf(this, WebhookSignatureError.prototype);
  }
}

export interface VerifyOptions {
  /** Max age of the signed timestamp in seconds. Set to 0 to disable. Defaults to 300. */
  tolerance?: number;
  /** Override the current time (unix seconds), for tests. */
  now?: number;
}

export interface ParsedSignature {
  timestamp: number;
  signatures: string[];
}

export function computeSignature(
  secret: string,
  timestamp: number,
  payload: WebhookPayload,
): string {
  return createHmac("sha256", secret).update(`${timestamp}.${toString(payload)}`).digest("hex");
}

export function parseSignatureHeader(header: string): ParsedSignature {
  const signatures: string[] = [];
  let timestamp: number | null = null;

  for (const part of header.split(",")) {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (!key || !value) continue;
    if (key === "t") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new WebhookSignatureError("Invalid `t` value in signature header.");
      }
      timestamp = parsed;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (timestamp === null) throw new WebhookSignatureError("Missing `t` in signature header.");
  if (signatures.length === 0) throw new WebhookSignatureError("Missing `v1` in signature header.");
  return { timestamp, signatures };
}

export function verifyWebhookSignature(
  payload: WebhookPayload,
  signatureHeader: string,
  secret: string,
  options: VerifyOptions = {},
): boolean {
  if (!signatureHeader) return false;

  let parsed: ParsedSignature;
  try {
    parsed = parseSignatureHeader(signatureHeader);
  } catch {
    return false;
  }

  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE_SECONDS;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (tolerance > 0 && Math.abs(now - parsed.timestamp) > tolerance) return false;

  const expected = Buffer.from(computeSignature(secret, parsed.timestamp, payload), "hex");
  return parsed.signatures.some((signature) => {
    const candidate = Buffer.from(signature, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

const KNOWN_EVENT_TYPES = new Set<string>([
  "payment.created",
  "payment.submitted",
  "payment.confirmed",
  "payment.failed",
  "payment.expired",
  "checkout.session.completed",
  "checkout.session.expired",
  "invoice.created",
  "invoice.sent",
  "invoice.viewed",
  "invoice.paid",
  "invoice.void",
  "link.created",
  "link.revoked",
  "webhook.test",
]);

export function constructEvent<TData = Record<string, unknown>>(
  payload: WebhookPayload,
  signatureHeader: string,
  secret: string,
  options: VerifyOptions = {},
): WebhookEvent<TData> {
  const body = toString(payload);
  if (!verifyWebhookSignature(body, signatureHeader, secret, options)) {
    throw new WebhookSignatureError("Webhook signature verification failed.");
  }

  let event: unknown;
  try {
    event = JSON.parse(body);
  } catch {
    throw new WebhookSignatureError("Webhook payload is not valid JSON.");
  }

  if (!event || typeof event !== "object" || typeof (event as WebhookEvent).type !== "string") {
    throw new WebhookSignatureError("Webhook payload is missing a `type`.");
  }
  const type = (event as WebhookEvent).type;
  if (!KNOWN_EVENT_TYPES.has(type)) {
    throw new WebhookSignatureError(`Unknown webhook event type: ${type}.`);
  }

  return event as WebhookEvent<TData>;
}

export function isWebhookEventType(value: string): value is WebhookEventType {
  return KNOWN_EVENT_TYPES.has(value);
}

function toString(payload: WebhookPayload): string {
  return typeof payload === "string" ? payload : Buffer.from(payload).toString("utf8");
}
