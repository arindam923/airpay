/**
 * Platform fee: AirPay charges a percentage on every settled transaction.
 * Configurable via NEXT_PUBLIC_PRODUCT_FEE_PERCENT (e.g. "0.9" for 0.9%).
 */
export const PRODUCT_FEE_PERCENT = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_PRODUCT_FEE_PERCENT);
  return Number.isFinite(raw) && raw >= 0 ? raw : 0.9;
})();

export function feeUsd(amountUsd: number): number {
  return Math.round(amountUsd * (PRODUCT_FEE_PERCENT / 100) * 100) / 100;
}

export function netUsd(amountUsd: number): number {
  return Math.round((amountUsd - feeUsd(amountUsd)) * 100) / 100;
}

export function formatFeePercent(): string {
  return `${PRODUCT_FEE_PERCENT}%`;
}
