import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  settlementMerchants,
  type SettlementMerchantRow,
} from "@/lib/schema";
import type { Environment } from "@/lib/environment";

export async function getSettlementMerchant(
  organizationId: string,
  chainKey: string,
): Promise<SettlementMerchantRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(settlementMerchants)
    .where(
      and(
        eq(settlementMerchants.organizationId, organizationId),
        eq(settlementMerchants.chainKey, chainKey),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listSettlementMerchants(
  organizationId: string,
): Promise<SettlementMerchantRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(settlementMerchants)
    .where(eq(settlementMerchants.organizationId, organizationId));
}

export interface UpsertSettlementMerchantInput {
  organizationId: string;
  chainKey: string;
  merchantId: string;
  contractAddress: string;
  payoutAddress: string;
  feeBps: number;
  status: "pending" | "active" | "failed";
  environment?: Environment;
  registerTxHash?: string | null;
  error?: string | null;
}

/** Insert or update the (org, chain) settlement registration row. */
export async function upsertSettlementMerchant(
  input: UpsertSettlementMerchantInput,
): Promise<SettlementMerchantRow> {
  const db = await getDb();
  const now = Date.now();
  const values = {
    organizationId: input.organizationId,
    chainKey: input.chainKey,
    merchantId: input.merchantId,
    contractAddress: input.contractAddress,
    payoutAddress: input.payoutAddress,
    feeBps: input.feeBps,
    status: input.status,
    environment: input.environment ?? "sandbox",
    registerTxHash: input.registerTxHash ?? null,
    error: input.error ?? null,
    updatedAt: now,
  };
  const rows = await db
    .insert(settlementMerchants)
    .values({ ...values, createdAt: now })
    .onConflictDoUpdate({
      target: [settlementMerchants.organizationId, settlementMerchants.chainKey],
      set: values,
    })
    .returning();
  return rows[0]!;
}
