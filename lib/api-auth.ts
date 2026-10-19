import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { apiKeys } from "./schema";
import type { ApiKeyKind } from "./api-types";
import type { Environment } from "./environment";
import { ApiError } from "./api/errors";

/**
 * Bearer authentication for the public API.
 *
 * Token families:
 *  - `ap_test_…` / `ap_live_…`  secret keys (server to server, full access)
 *  - `pk_test_…` / `pk_live_…`  publishable keys (browser-safe, limited)
 *
 * The key itself selects the environment: a test key can never read or write
 * production rows, regardless of request headers.
 */

export interface ApiAuthContext {
  keyId: string;
  organizationId: string;
  environment: Environment;
  kind: ApiKeyKind;
  /** `full` or `readonly`; publishable keys are always read-limited by kind. */
  scope: string;
}

export type ApiCapability = "config:read" | "payment_intent:read" | "payment_intent:confirm";

/** Capabilities a publishable key may exercise (all browser-safe). */
const PUBLISHABLE_CAPABILITIES = new Set<ApiCapability>([
  "config:read",
  "payment_intent:read",
  "payment_intent:confirm",
]);

const LAST_USED_THROTTLE_MS = 60_000;

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function apiKeyKindFromToken(token: string): ApiKeyKind | null {
  if (token.startsWith("pk_")) return "publishable";
  if (token.startsWith("ap_")) return "secret";
  return null;
}

export function bearerToken(headers: Headers): string | null {
  const raw = headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match?.[1]?.trim() || null;
}

/** True when a request carries a publishable key (used to attach CORS). */
export function isBrowserRequest(headers: Headers): boolean {
  const token = bearerToken(headers);
  return !!token && token.startsWith("pk_");
}

export async function authenticateApiKey(headers: Headers): Promise<ApiAuthContext> {
  const token = bearerToken(headers);
  if (!token) {
    throw new ApiError(
      401,
      "missing_api_key",
      "No API key provided. Pass `Authorization: Bearer <key>`.",
      undefined,
      "authentication_error",
    );
  }

  const kind = apiKeyKindFromToken(token);
  if (!kind) {
    throw new ApiError(
      401,
      "invalid_api_key",
      "The provided API key is not valid.",
      undefined,
      "authentication_error",
    );
  }

  const db = await getDb();
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.hashedSecret, hashApiKey(token)), eq(apiKeys.revoked, false)))
    .limit(1);
  const row = rows[0];

  if (!row || row.kind !== kind) {
    throw new ApiError(
      401,
      "invalid_api_key",
      "The provided API key is not valid.",
      undefined,
      "authentication_error",
    );
  }

  const now = Date.now();
  if (!row.lastUsedAt || now - row.lastUsedAt > LAST_USED_THROTTLE_MS) {
    await db.update(apiKeys).set({ lastUsedAt: now }).where(eq(apiKeys.id, row.id));
  }

  return {
    keyId: row.id,
    organizationId: row.organizationId,
    environment: row.environment,
    kind,
    scope: row.scope,
  };
}

export function assertSecretKey(auth: ApiAuthContext): void {
  if (auth.kind !== "secret") {
    throw new ApiError(
      403,
      "secret_key_required",
      "This endpoint requires a secret key.",
      undefined,
      "permission_error",
    );
  }
}

/** Read-only secret keys cannot perform mutations. */
export function assertWriteAccess(auth: ApiAuthContext): void {
  assertSecretKey(auth);
  if (auth.scope === "readonly") {
    throw new ApiError(
      403,
      "insufficient_scope",
      "This API key is read only.",
      undefined,
      "permission_error",
    );
  }
}

export function assertCapability(auth: ApiAuthContext, capability: ApiCapability): void {
  if (auth.kind === "secret") return;
  if (!PUBLISHABLE_CAPABILITIES.has(capability)) {
    throw new ApiError(
      403,
      "insufficient_scope",
      `This publishable key cannot perform \`${capability}\`.`,
      undefined,
      "permission_error",
    );
  }
}
