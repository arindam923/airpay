import { createPublicClient, createWalletClient, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { rpcUrl, settlementAddress, testnetByKey, type TestnetInfo } from "@/lib/chains";
import { resolvePayoutWallet, type PayoutSettings } from "@/lib/onboarding";
import type { Environment } from "@/lib/environment";
import type { SettlementMerchantRow } from "@/lib/schema";
import { SETTLEMENT_ABI, SETTLEMENT_DEFAULT_FEE_BPS, merchantIdFor } from "./abi";
import {
  getSettlementMerchant,
  listSettlementMerchants,
  upsertSettlementMerchant,
} from "./merchants";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export class SettlementError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** Whether a platform admin key is available to sign registrations. */
export function settlementAdminConfigured(): boolean {
  return !!process.env.SETTLEMENT_ADMIN_PRIVATE_KEY?.trim();
}

let cachedAccount: ReturnType<typeof privateKeyToAccount> | null = null;

function adminAccount() {
  const raw = process.env.SETTLEMENT_ADMIN_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new SettlementError("SETTLEMENT_ADMIN_PRIVATE_KEY is not configured.", 500);
  }
  if (!cachedAccount) {
    cachedAccount = privateKeyToAccount((raw.startsWith("0x") ? raw : `0x${raw}`) as Hex);
  }
  return cachedAccount;
}

function clientsFor(info: TestnetInfo) {
  const transport = http(rpcUrl(info));
  return {
    publicClient: createPublicClient({ chain: info.viemChain, transport }),
    walletClient: createWalletClient({ account: adminAccount(), chain: info.viemChain, transport }),
  };
}

export interface EnsureMerchantInput {
  organizationId: string;
  chainKey: string;
  payoutAddress: string;
  /** Overrides the stored/default fee. Omit to preserve the existing rate. */
  feeBps?: number;
  environment?: Environment;
}

/**
 * Register (or update) a merchant on the settlement contract and mirror the
 * result into `settlement_merchants`. Idempotent: reads on-chain state first and
 * only sends a transaction when the payout, fee or active flag actually differ.
 */
export async function ensureMerchantRegistered(
  input: EnsureMerchantInput,
): Promise<SettlementMerchantRow> {
  const info = testnetByKey(input.chainKey);
  if (!info) throw new SettlementError(`Unsupported network: ${input.chainKey}.`);

  const contract = settlementAddress(info);
  if (!contract) {
    throw new SettlementError(`Settlement isn't deployed on ${info.name} yet.`, 409);
  }

  const payout = input.payoutAddress?.trim() ?? "";
  if (!EVM_ADDRESS_RE.test(payout)) {
    throw new SettlementError("A valid payout wallet is required to register settlement.");
  }

  const existing = await getSettlementMerchant(input.organizationId, input.chainKey);
  const feeBps = input.feeBps ?? existing?.feeBps ?? SETTLEMENT_DEFAULT_FEE_BPS;
  const merchantId = merchantIdFor(input.organizationId);
  const { publicClient, walletClient } = clientsFor(info);

  let txHash: Hex | null = (existing?.registerTxHash as Hex | null) ?? null;
  try {
    const [onChainPayout, onChainFee, active] = (await publicClient.readContract({
      address: contract,
      abi: SETTLEMENT_ABI,
      functionName: "merchant",
      args: [merchantId],
    })) as readonly [Address, number, boolean];

    const needsWrite =
      onChainPayout === ZERO_ADDRESS ||
      onChainPayout.toLowerCase() !== payout.toLowerCase() ||
      Number(onChainFee) !== feeBps ||
      !active;

    if (needsWrite) {
      txHash = await walletClient.writeContract({
        address: contract,
        abi: SETTLEMENT_ABI,
        functionName: "upsertMerchant",
        args: [merchantId, payout as Address, feeBps],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    }

    return await upsertSettlementMerchant({
      organizationId: input.organizationId,
      chainKey: input.chainKey,
      merchantId,
      contractAddress: contract,
      payoutAddress: payout,
      feeBps,
      status: "active",
      environment: input.environment,
      registerTxHash: txHash,
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "On-chain registration failed.";
    await upsertSettlementMerchant({
      organizationId: input.organizationId,
      chainKey: input.chainKey,
      merchantId,
      contractAddress: contract,
      payoutAddress: payout,
      feeBps,
      status: "failed",
      environment: input.environment,
      registerTxHash: txHash,
      error: message,
    });
    throw new SettlementError(message, 502);
  }
}

export interface SettlementSyncSettings extends PayoutSettings {
  organizationId: string;
  enabledChains?: string[] | null;
}

/** Chains the org has enabled that have a deployed settlement contract. */
export function settlementTargets(
  settings: SettlementSyncSettings | null | undefined,
): { chainKey: string; payoutAddress: string }[] {
  if (!settings) return [];
  const out: { chainKey: string; payoutAddress: string }[] = [];
  for (const chainKey of settings.enabledChains ?? []) {
    const info = testnetByKey(chainKey);
    if (!info || !settlementAddress(info)) continue;
    const payoutAddress = resolvePayoutWallet(settings, chainKey);
    if (!EVM_ADDRESS_RE.test(payoutAddress)) continue;
    out.push({ chainKey, payoutAddress });
  }
  return out;
}

/**
 * Best-effort sync of every enabled, settlement-capable chain. Never throws:
 * failures are recorded on the row (status `failed`) and logged, so a settings
 * save is never blocked by an RPC hiccup.
 */
export async function syncOrgMerchants(
  settings: SettlementSyncSettings | null | undefined,
  opts?: { environment?: Environment },
): Promise<SettlementMerchantRow[]> {
  if (!settings?.organizationId || !settlementAdminConfigured()) return [];
  const results: SettlementMerchantRow[] = [];
  for (const target of settlementTargets(settings)) {
    try {
      results.push(
        await ensureMerchantRegistered({
          organizationId: settings.organizationId,
          chainKey: target.chainKey,
          payoutAddress: target.payoutAddress,
          environment: opts?.environment,
        }),
      );
    } catch (err) {
      console.error(
        `[settlement] register ${target.chainKey} for ${settings.organizationId} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return results;
}

export { listSettlementMerchants };
