import { TESTNETS, settlementAddress, testnetByKey, type TestnetKey } from "./chains";
import { coinAvailableOnTestnet } from "./tokens";
import type { WorkspaceSettingsRow } from "./schema";

/** Minimal payout-routing fields, satisfied by `workspace_settings` rows. */
export interface PayoutSettings {
  payoutMode?: "all" | "per_network" | null;
  payoutWallet?: string | null;
  payoutAddresses?: Record<string, string> | null;
}

/** Chain key -> enabled coin symbols, clamped to real testnets/coins. */
export type EnabledPairs = Record<string, string[]>;

export function isOnboarded(settings: WorkspaceSettingsRow | null | undefined): boolean {
  if (!settings) return false;
  return (
    settings.onboardedAt != null &&
    !!settings.payoutWallet &&
    (settings.enabledChains?.length ?? 0) > 0
  );
}

export function enabledPairs(
  settings: WorkspaceSettingsRow | null | undefined,
): EnabledPairs {
  const out: EnabledPairs = {};
  if (!settings) return out;
  const assets = settings.enabledAssets ?? {};
  for (const chain of settings.enabledChains ?? []) {
    if (!(chain in TESTNETS)) continue;
    const coins = (assets[chain] ?? []).filter(coinAvailableOnTestnet);
    if (coins.length === 0) continue;
    out[chain] = coins;
  }
  return out;
}

/** Default (chain, coin) pair for prefilling forms; null when nothing enabled. */
export function defaultPair(
  settings: WorkspaceSettingsRow | null | undefined,
): { chain: string; coin: string } | null {
  const pairs = enabledPairs(settings);
  for (const chain of Object.keys(pairs)) {
    return { chain, coin: pairs[chain][0] };
  }
  return null;
}

export function isValidTestnetKey(key: string): key is TestnetKey {
  return key in TESTNETS;
}

/**
 * Merchant payout wallet for `chainKey`.
 * 'all' routes every network to `payoutWallet`; 'per_network' uses the
 * per-chain override, falling back to `payoutWallet` if one is missing.
 */
export function resolvePayoutWallet(
  settings: PayoutSettings | null | undefined,
  chainKey: string,
): string {
  if (!settings) return "";
  if (settings.payoutMode === "per_network") {
    const addr = settings.payoutAddresses?.[chainKey]?.trim();
    if (addr) return addr;
  }
  return settings.payoutWallet?.trim() ?? "";
}

/**
 * On-chain destination for a new payment link / invoice on `chainKey`. Routes
 * through the AirPay settlement contract when one is deployed for the chain;
 * otherwise falls back to the merchant payout wallet (legacy direct transfer).
 * Rows snapshot their receiver, so later settings edits never rewrite history.
 */
export function resolveReceiver(
  settings: PayoutSettings | null | undefined,
  chainKey: string,
): string {
  const info = testnetByKey(chainKey);
  const contract = info ? settlementAddress(info) : null;
  if (contract) return contract;
  return resolvePayoutWallet(settings, chainKey);
}
