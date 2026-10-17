import { formatUnits, parseUnits } from "viem";
import { tokenMeta } from "./tokens";

/**
 * Convert a USD amount into on-chain token units using the static demo FX
 * table. USD amounts are rounded to cents before conversion so the server
 * and client always agree on the exact integer amount.
 */
export function usdToUnits(usd: number, coin: string): bigint {
  const meta = tokenMeta(coin);
  const tokenAmount = usd / meta.rate;
  const rounded = tokenAmount.toFixed(Math.min(meta.decimals, 8));
  return parseUnits(rounded, meta.decimals);
}

/** Format on-chain units back to a human token amount string. */
export function unitsToTokenString(units: bigint, coin: string): string {
  const meta = tokenMeta(coin);
  return formatUnits(units, meta.decimals);
}
