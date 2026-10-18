import { TESTNETS, type TestnetKey } from "./chains";
import { coinAvailableOnTestnet } from "./tokens";
import type { WorkspaceSettingsRow } from "./schema";

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
