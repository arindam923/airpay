import type { IntentStatus } from "@/lib/api-types";
import type { Environment } from "@/lib/environment";

export type RangeKey = "24H" | "7D" | "30D" | "90D";

export const ranges: RangeKey[] = ["24H", "7D", "30D", "90D"];

export type PaymentStatus = "Confirmed" | "Pending" | "Failed";

/**
 * Dashboard view model for a payment, derived from a real `PublicIntent`.
 * Every field maps to backend data — nothing here is fabricated.
 */
export interface Payment {
  id: string;
  /** Merchant / business the payment belongs to (link or invoice). */
  merchant: string;
  /** On-chain payer address, once a transaction has been submitted. */
  payer: string | null;
  amountUsd: number;
  /** Pre-formatted USD amount for display. */
  amount: string;
  coin: string;
  chain: string;
  chainKey: string;
  status: PaymentStatus;
  statusRaw: IntentStatus;
  time: string;
  createdAt: number;
  confirmedAt: number | null;
  txHash: string | null;
  explorerTx: string | null;
  receiver: string;
  confirmations: number;
  requiredConfirmations: number;
  environment: Environment;
}

/** Brand colors for the coins the platform supports. */
export const coinColors: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#8a94ff",
  SOL: "#9945ff",
  USDC: "#2775ca",
  USDT: "#26a17b",
};

export function coinColor(symbol: string): string {
  return coinColors[symbol] ?? "#6f6f7a";
}
