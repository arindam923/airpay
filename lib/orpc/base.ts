import { ORPCError, os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workspaceSettings } from "@/lib/schema";
import { isOnboarded } from "@/lib/onboarding";
import type { ORPCContext } from "./context";

export const base = os.$context<ORPCContext>();

export const authed = base.use(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({ context });
});

export const orgScoped = authed.use(async ({ context, next }) => {
  if (!context.organizationId) {
    throw new ORPCError("BAD_REQUEST", { message: "No active organization." });
  }
  return next({ context });
});

export const adminOnly = orgScoped.use(async ({ context, next }) => {
  if (context.role !== "owner" && context.role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }
  return next({ context });
});

/** Blocks the request until the organization has finished onboarding. */
export const onboarded = adminOnly.use(async ({ context, next }) => {
  const db = await getDb();
  const rows = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.organizationId, context.organizationId!))
    .limit(1);
  if (!isOnboarded(rows[0] ?? null)) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Finish setting up your account before creating payment links or API keys.",
    });
  }
  return next({ context });
});
