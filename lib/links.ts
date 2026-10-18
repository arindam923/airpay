import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { paymentLinks, type PaymentLinkRow } from "./schema";
import { testnetByKey } from "./chains";
import type { EnabledPairs } from "./onboarding";

export interface PublicLink {
  id: string;
  slug: string;
  title: string;
  merchant: string;
  mode: "fixed" | "flex";
  amountUsd: number;
  min: number;
  max: number | null;
  chainKey: string;
  chainName: string;
  coin: string;
  receiver: string;
  allowed: EnabledPairs;
  active: boolean;
  createdAt: number;
}

export function toPublicLink(row: PaymentLinkRow): PublicLink {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    merchant: row.merchant,
    mode: row.mode,
    amountUsd: row.amount_usd,
    min: row.min,
    max: row.max,
    chainKey: row.chain_key,
    chainName: testnetByKey(row.chain_key)?.name ?? row.chain_key,
    coin: row.token,
    receiver: row.receiver,
    allowed: row.allowed ?? {},
    active: row.active,
    createdAt: row.created_at,
  };
}

export function newSlug(): string {
  return randomBytes(5).toString("hex");
}

export async function getLinkBySlug(slug: string): Promise<PaymentLinkRow | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}
