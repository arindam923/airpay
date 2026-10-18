import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { workspaceSettings } from "./schema";
import {
  DEFAULT_APPEARANCE,
  normalizeAppearance,
  type CheckoutAppearance,
} from "./checkout-appearance";

/** Resolves the hosted-checkout theme for an org, falling back to AirPay Classic. */
export async function getCheckoutAppearance(
  organizationId?: string | null,
): Promise<CheckoutAppearance> {
  if (!organizationId) return DEFAULT_APPEARANCE;
  const db = await getDb();
  const rows = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.organizationId, organizationId))
    .limit(1);
  return normalizeAppearance(rows[0]?.checkoutAppearance ?? null);
}
