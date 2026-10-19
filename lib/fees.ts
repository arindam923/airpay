import {
  SETTLEMENT_BPS_DENOMINATOR,
  SETTLEMENT_DEFAULT_FEE_BPS,
  SETTLEMENT_MAX_FEE_BPS,
} from "./settlement/abi";

export const MAX_FEE_BPS = SETTLEMENT_MAX_FEE_BPS;
export { SETTLEMENT_BPS_DENOMINATOR as BPS_DENOMINATOR };

/**
 * Legacy platform-fee percent config. Kept as the fallback for merchants whose
 * fee isn't known (or is unset). New flows read the per-merchant bps stored in
 * `settlement_merchants` / `payment_intents`.
 */
export const PRODUCT_FEE_PERCENT = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_PRODUCT_FEE_PERCENT);
  return Number.isFinite(raw) && raw >= 0 ? raw : SETTLEMENT_DEFAULT_FEE_BPS / 100;
})();

/** Fallback fee in basis points (90 bps == 0.90%) used when none is supplied. */
export const DEFAULT_FEE_BPS = (() => {
  const bps = Math.round(PRODUCT_FEE_PERCENT * 100);
  return bps >= 0 && bps <= MAX_FEE_BPS ? bps : SETTLEMENT_DEFAULT_FEE_BPS;
})();

/** Clamp an arbitrary fee into the valid basis-point range. */
export function normalizeFeeBps(feeBps?: number | null): number {
  if (feeBps != null && Number.isFinite(feeBps) && feeBps >= 0 && feeBps <= MAX_FEE_BPS) {
    return Math.round(feeBps);
  }
  return DEFAULT_FEE_BPS;
}

/** Platform fee (USD) for a gross amount at the given rate (bps). */
export function feeUsd(amountUsd: number, feeBps?: number | null): number {
  const bps = normalizeFeeBps(feeBps);
  return Math.round(amountUsd * (bps / SETTLEMENT_BPS_DENOMINATOR) * 100) / 100;
}

/** Merchant net (USD) after the platform fee for the given rate (bps). */
export function netUsd(amountUsd: number, feeBps?: number | null): number {
  return Math.round((amountUsd - feeUsd(amountUsd, feeBps)) * 100) / 100;
}

/** Human label for a fee rate, e.g. 90 -> "0.9%", 100 -> "1%". */
export function formatFeePercent(feeBps?: number | null): string {
  const pct = normalizeFeeBps(feeBps) / 100;
  return `${Number(pct.toFixed(2))}%`;
}
