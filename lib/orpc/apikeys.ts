import { randomBytes, createHash } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { apiKeys } from "@/lib/schema";
import { orgScoped, adminOnly, onboarded, assertEnvironmentEnabled } from "./base";
import { createApiKeySchema, revokeApiKeySchema } from "@/lib/schemas/apikeys";
import type { ApiKeyKind } from "@/lib/api-types";
import type { Environment } from "@/lib/environment";
import { ORPCError } from "@orpc/server";

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Secret keys use `ap_*`; publishable keys use `pk_*`. The environment is
 * encoded in the prefix so a key can never cross the sandbox/production line.
 */
function keyPrefix(environment: Environment, kind: ApiKeyKind) {
  if (kind === "publishable") {
    return environment === "production" ? "pk_live" : "pk_test";
  }
  return environment === "production" ? "ap_live" : "ap_test";
}

function generateKey(environment: Environment, kind: ApiKeyKind) {
  const body = randomBytes(20).toString("hex").slice(0, 20);
  return `${keyPrefix(environment, kind)}_${body}`;
}

export const apiKeysRouter = {
  list: orgScoped.handler(async ({ context }) => {
    const db = await getDb();
    return db
      .select({
        id: apiKeys.id,
        label: apiKeys.label,
        prefix: apiKeys.prefix,
        lastFour: apiKeys.lastFour,
        kind: apiKeys.kind,
        // Safe only because publishable keys are public by design.
        publicValue: apiKeys.publicValue,
        scope: apiKeys.scope,
        environment: apiKeys.environment,
        revoked: apiKeys.revoked,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
      })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.organizationId, context.organizationId!),
          eq(apiKeys.environment, context.environment),
        ),
      )
      .orderBy(desc(apiKeys.createdAt));
  }),

  create: onboarded
    .input(createApiKeySchema)
    .handler(async ({ input, context }) => {
      await assertEnvironmentEnabled(context.environment, context.organizationId);
      const db = await getDb();
      const kind = input.kind;
      const prefix = keyPrefix(context.environment, kind);
      const secret = generateKey(context.environment, kind);
      const id = `key_${randomBytes(6).toString("hex")}`;
      const now = Date.now();
      await db.insert(apiKeys).values({
        id,
        organizationId: context.organizationId!,
        label: input.label,
        prefix,
        hashedSecret: hashSecret(secret),
        lastFour: secret.slice(-4),
        kind,
        publicValue: kind === "publishable" ? secret : null,
        scope: input.scope,
        environment: context.environment,
        revoked: false,
        createdAt: now,
        lastUsedAt: null,
      });
      return { id, secret, kind };
    }),

  /**
   * Return the active publishable key for the environment, creating one on
   * first use. Publishable keys are safe to display and reuse in browsers.
   */
  ensurePublishable: onboarded.handler(async ({ context }) => {
    await assertEnvironmentEnabled(context.environment, context.organizationId);
    const db = await getDb();

    const existing = await db
      .select({ id: apiKeys.id, publicValue: apiKeys.publicValue })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.organizationId, context.organizationId!),
          eq(apiKeys.environment, context.environment),
          eq(apiKeys.kind, "publishable"),
          eq(apiKeys.revoked, false),
        ),
      )
      .orderBy(desc(apiKeys.createdAt))
      .limit(1);

    if (existing[0]?.publicValue) {
      return { id: existing[0].id, publicKey: existing[0].publicValue };
    }

    const secret = generateKey(context.environment, "publishable");
    const id = `key_${randomBytes(6).toString("hex")}`;
    const now = Date.now();
    await db.insert(apiKeys).values({
      id,
      organizationId: context.organizationId!,
      label: "Publishable key",
      prefix: keyPrefix(context.environment, "publishable"),
      hashedSecret: hashSecret(secret),
      lastFour: secret.slice(-4),
      kind: "publishable",
      publicValue: secret,
      scope: "full",
      environment: context.environment,
      revoked: false,
      createdAt: now,
      lastUsedAt: null,
    });
    return { id, publicKey: secret };
  }),

  revoke: adminOnly
    .input(revokeApiKeySchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      const res = await db
        .update(apiKeys)
        .set({ revoked: true })
        .where(
          and(
            eq(apiKeys.id, input.id),
            eq(apiKeys.organizationId, context.organizationId!),
            eq(apiKeys.environment, context.environment),
          ),
        )
        .returning({ id: apiKeys.id });
      if (!res[0]) throw new ORPCError("NOT_FOUND");
      return { ok: true };
    }),
};
