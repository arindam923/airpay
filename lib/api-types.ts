export type IntentStatus =
  | "created"
  | "awaiting_payment"
  | "submitted"
  | "confirming"
  | "confirmed"
  | "failed"
  | "expired";

export interface PublicIntent {
  id: string;
  status: IntentStatus;
  amountUsd: number;
  token: string;
  chainKey: string;
  chainName: string;
  expectedUnits: string;
  receiver: string;
  payer: string | null;
  txHash: string | null;
  confirmations: number;
  requiredConfirmations: number;
  explorerTx: string | null;
  expiresAt: number;
  error: string | null;
  merchant: string;
  title: string;
  createdAt: number;
  confirmedAt: number | null;
}
