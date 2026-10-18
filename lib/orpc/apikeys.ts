import { randomBytes, createHash } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { apiKeys } from "@/lib/schema";
import { orgScoped, adminOnly, onboarded, assertEnvironmentEnabled } from "./base";
import { createApiKeySchema, revokeApiKeySchema } from "@/lib/schemas/apikeys";

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

/** Sandbox keys are clearly test-only; production keys carry the live prefix. */
function keyPrefix(environment: "sandbox" | "production") {
  return environment === "production" ? "ap_live" : "ap_test";
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
      assertEnvironmentEnabled(context.environment);
      const db = await getDb();
      const prefix = keyPrefix(context.environment);
      const body = randomBytes(20).toString("hex").slice(0, 20);
      const secret = `${prefix}_${body}`;
      const id = `key_${randomBytes(6).toString("hex")}`;
      const now = Date.now();
      await db.insert(apiKeys).values({
        id,
        organizationId: context.organizationId!,
        label: input.label,
        prefix,
        hashedSecret: hashSecret(secret),
        lastFour: secret.slice(-4),
        scope: input.scope,
        environment: context.environment,
        revoked: false,
        createdAt: now,
        lastUsedAt: null,
      });
      return { id, secret };
    }),

  revoke: adminOnly
    .input(revokeApiKeySchema)
    .handler(async ({ input, context }) => {
      const db = await getDb();
      await db
        .update(apiKeys)
        .set({ revoked: true })
        .where(
          and(
            eq(apiKeys.id, input.id),
            eq(apiKeys.organizationId, context.organizationId!),
            eq(apiKeys.environment, context.environment),
          ),
        );
      return { ok: true };
    }),
};
