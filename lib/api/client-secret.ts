import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Per-payment-intent client secret handed to a browser SDK.
 *
 * A publishable key identifies the account, but only this secret authorizes
 * reads/confirms for one specific intent. Only the SHA-256 hash is persisted
 * (`payment_intents.client_secret_hash`); the plain value is returned once at
 * creation time.
 */
export function generateClientSecret(intentId: string): string {
  const id = intentId.replace(/-/g, "");
  return `pi_${id}_secret_${randomBytes(24).toString("base64url")}`;
}

export function hashClientSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function clientSecretMatches(
  provided: string | null | undefined,
  storedHash: string | null | undefined,
): boolean {
  if (!provided || !storedHash) return false;
  const providedHash = Buffer.from(hashClientSecret(provided), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (providedHash.length !== expected.length) return false;
  return timingSafeEqual(providedHash, expected);
}
