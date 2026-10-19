import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workspaceSettings } from "@/lib/schema";
import { isProductionReady } from "@/lib/environment";
import type { ApiAuthContext } from "@/lib/api-auth";
import { ApiError } from "./errors";

/**
 * Public-API counterpart of `assertEnvironmentEnabled` (which throws oRPC
 * errors). Sandbox always works; production requires mainnet to be deployed
 * and the organization to have flipped the dashboard switch.
 */
export async function assertApiProductionEnabled(auth: ApiAuthContext): Promise<void> {
  if (auth.environment !== "production") return;

  if (!isProductionReady()) {
    throw new ApiError(
      400,
      "production_unavailable",
      "Production isn't available yet — mainnet is coming soon. Use a test key to build and test.",
    );
  }

  const db = await getDb();
  const rows = await db
    .select({ productionEnabled: workspaceSettings.productionEnabled })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.organizationId, auth.organizationId))
    .limit(1);

  if (!rows[0]?.productionEnabled) {
    throw new ApiError(
      403,
      "production_not_enabled",
      "Production is not enabled for this account. Turn it on in Settings → Go live once you've finished testing in Sandbox.",
      undefined,
      "permission_error",
    );
  }
}
