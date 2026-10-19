import { ORPCError, os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workspaceSettings } from "@/lib/schema";
import { isOnboarded } from "@/lib/onboarding";
import { isProductionReady, type Environment } from "@/lib/environment";
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

/**
 * Blocks writes to production until both gates are satisfied:
 *
 *  1. mainnet is deployed platform-wide (`PRODUCTION_READY`), and
 *  2. the organization has switched production on from the dashboard.
 *
 * Sandbox is always allowed.
 */
export async function assertEnvironmentEnabled(
  environment: Environment,
  organizationId: string | null,
): Promise<void> {
  if (environment !== "production") return;

  if (!isProductionReady()) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message:
        "Production isn't available yet — mainnet is coming soon. Switch to Sandbox to create and test resources.",
    });
  }

  if (!organizationId) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Finish setting up your account before using production.",
    });
  }

  const db = await getDb();
  const rows = await db
    .select({ productionEnabled: workspaceSettings.productionEnabled })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.organizationId, organizationId))
    .limit(1);

  if (!rows[0]?.productionEnabled) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message:
        "Production is not enabled for this account. Turn it on in Settings → Go live once you've finished testing in Sandbox.",
    });
  }
}
