import { createHash } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { idempotencyKeys } from "@/lib/schema";
import type { ApiAuthContext } from "@/lib/api-auth";
import { ApiError } from "./errors";

/** How long a completed Idempotency-Key response is replayable. */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_KEY_LENGTH = 255;

export interface IdempotentResult {
  status: number;
  body: unknown;
}

export interface IdempotentOutcome extends IdempotentResult {
  replayed: boolean;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function requestHash(request: Request, body: unknown): string {
  const url = new URL(request.url);
  return createHash("sha256")
    .update(`${request.method} ${url.pathname}\n${stableStringify(body)}`)
    .digest("hex");
}

/**
 * Execute a mutating handler at most once per `Idempotency-Key`.
 *
 * Completed responses are replayed verbatim for 24h. Reusing a key with a
 * different body is a 409, as is retrying while the first call is still in
 * flight. Failed handlers release the key so the caller can retry.
 */
export async function runIdempotent(
  auth: ApiAuthContext,
  request: Request,
  body: unknown,
  run: () => Promise<IdempotentResult>,
): Promise<IdempotentOutcome> {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    const result = await run();
    return { ...result, replayed: false };
  }
  if (key.length > MAX_KEY_LENGTH) {
    throw new ApiError(400, "invalid_idempotency_key", "Idempotency-Key is too long.", "idempotency-key");
  }

  const db = await getDb();
  const now = Date.now();
  const hash = requestHash(request, body);
  const scope = {
    organizationId: auth.organizationId,
    environment: auth.environment,
    key,
  };

  const inserted = await db
    .insert(idempotencyKeys)
    .values({
      ...scope,
      request_hash: hash,
      status: "in_progress",
      created_at: now,
      expires_at: now + IDEMPOTENCY_TTL_MS,
    })
    .onConflictDoNothing({ target: [idempotencyKeys.organizationId, idempotencyKeys.environment, idempotencyKeys.key] })
    .returning({ key: idempotencyKeys.key });

  if (inserted.length > 0) {
    try {
      const result = await run();
      await db
        .update(idempotencyKeys)
        .set({
          status: "completed",
          response_status: result.status,
          response_body: JSON.stringify(result.body),
        })
        .where(
          and(
            eq(idempotencyKeys.organizationId, scope.organizationId),
            eq(idempotencyKeys.environment, scope.environment),
            eq(idempotencyKeys.key, scope.key),
          ),
        );
      return { ...result, replayed: false };
    } catch (err) {
      // Release the key so a legitimate retry can proceed.
      await db
        .delete(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.organizationId, scope.organizationId),
            eq(idempotencyKeys.environment, scope.environment),
            eq(idempotencyKeys.key, scope.key),
          ),
        );
      throw err;
    }
  }

  const rows = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.organizationId, scope.organizationId),
        eq(idempotencyKeys.environment, scope.environment),
        eq(idempotencyKeys.key, scope.key),
      ),
    )
    .limit(1);
  const existing = rows[0];

  if (!existing || existing.expires_at <= now) {
    if (existing) {
      await db
        .delete(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.organizationId, scope.organizationId),
            eq(idempotencyKeys.environment, scope.environment),
            eq(idempotencyKeys.key, scope.key),
          ),
        );
    }
    // Retry once with a fresh row.
    return runIdempotent(auth, request, body, run);
  }

  if (existing.request_hash !== hash) {
    throw new ApiError(
      409,
      "idempotency_key_reused",
      "This Idempotency-Key was already used with different parameters.",
      "idempotency-key",
      "idempotency_error",
    );
  }

  if (existing.status !== "completed" || !existing.response_body) {
    throw new ApiError(
      409,
      "idempotency_key_in_progress",
      "A request with this Idempotency-Key is still in progress. Retry shortly.",
      "idempotency-key",
      "idempotency_error",
    );
  }

  return {
    status: existing.response_status ?? 200,
    body: JSON.parse(existing.response_body),
    replayed: true,
  };
}

/** Housekeeping for the maintenance sweep. */
export async function pruneIdempotencyKeys(now = Date.now()): Promise<number> {
  const db = await getDb();
  const res = await db
    .delete(idempotencyKeys)
    .where(lt(idempotencyKeys.expires_at, now))
    .returning({ key: idempotencyKeys.key });
  return res.length;
}
