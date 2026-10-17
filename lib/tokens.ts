export type TokenKind = "native" | "erc20";

export interface TokenMeta {
  color: string;
  /** Static demo FX rate: USD per 1 token. */
  rate: number;
  decimals: number;
  kind: TokenKind;
}

export const TOKENS: Record<string, TokenMeta> = {
  USDC: { color: "#2775ca", rate: 1, decimals: 6, kind: "erc20" },
  ETH: { color: "#8a94ff", rate: 3420, decimals: 18, kind: "native" },
};

export function tokenMeta(coin: string): TokenMeta {
  return TOKENS[coin] ?? TOKENS.USDC;
}

/** Coins available on EVM testnets (USDT has no reliable testnet deployment). */
export const TESTNET_COINS = ["USDC", "ETH"] as const;

export function coinAvailableOnTestnet(coin: string): boolean {
  return (TESTNET_COINS as readonly string[]).includes(coin);
}
