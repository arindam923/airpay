import { createPublicClient, encodeFunctionData, formatEther, http, parseAbi } from "viem";
import type { TestnetInfo } from "./chains";
import { friendlyTxError } from "./errors";

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
]);

export type PreflightResult = { ok: true } | { ok: false; error: string };

function fmt(coin: "ETH" | "USDC", units: bigint): string {
  if (coin === "ETH") return `${formatEther(units)} ETH`;
  return `${Number(units) / 1e6} USDC`;
}

/** Only verdict-type failures should block; RPC hiccups must not. */
function isVerdictFailure(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.message} ${String((err as { details?: string }).details ?? "")}` : String(err);
  return /execution reverted|insufficient funds|exceeds balance|transfer amount/i.test(msg);
}

/**
 * Verify a payment can actually be executed BEFORE opening the wallet:
 * balances, gas affordability and an on-chain gas estimation (which reverts
 * exactly like the wallet simulation would). Prevents MetaMask's
 * "failed to simulate / you could lose all funds" flow.
 */
export async function preflightPayment(params: {
  net: TestnetInfo;
  account: `0x${string}`;
  receiver: `0x${string}`;
  token: "ETH" | "USDC";
  units: bigint;
}): Promise<PreflightResult> {
  const { net, account, receiver, token, units } = params;
  if (units <= 0n) return { ok: false, error: "Enter a valid amount to continue." };

  const client = createPublicClient({ chain: net.viemChain, transport: http() });

  let nativeBal: bigint | null = null;
  try {
    nativeBal = await client.getBalance({ address: account });
  } catch (err) {
    console.warn("[preflight] balance read failed, skipping native check:", err);
  }

  if (nativeBal != null && token === "ETH" && nativeBal < units) {
    return {
      ok: false,
      error: `Insufficient ETH: you need ${fmt("ETH", units)} plus gas, but your wallet has ${fmt(
        "ETH",
        nativeBal
      )}. Top up from a testnet faucet.`,
    };
  }

  if (token === "USDC") {
    try {
      const usdcBal = (await client.readContract({
        address: net.usdc,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account],
      })) as bigint;
      if (usdcBal < units) {
        return {
          ok: false,
          error: `Insufficient USDC: you need ${fmt("USDC", units)}, but your wallet has ${fmt(
            "USDC",
            usdcBal
          )}. Get free testnet USDC at faucet.circle.com.`,
        };
      }
    } catch (err) {
      if (isVerdictFailure(err)) {
        return { ok: false, error: friendlyTxError(err, "preflight-usdc") };
      }
      console.warn("[preflight] USDC balance read failed, skipping:", err);
    }
  }

  // Gas estimation — reverts for the same reasons the wallet simulation does.
  try {
    const data =
      token === "USDC"
        ? encodeFunctionData({ abi: ERC20_ABI, functionName: "transfer", args: [receiver, units] })
        : undefined;
    const gas = await client.estimateGas(
      data ? { account, to: net.usdc, data } : { account, to: receiver, value: units }
    );

    try {
      const gasPrice = await client.getGasPrice();
      const gasCost = (gas * gasPrice * 130n) / 100n;
      const neededNative = (token === "ETH" ? units : 0n) + gasCost;
      if (nativeBal != null && nativeBal < neededNative) {
        return {
          ok: false,
          error:
            token === "ETH"
              ? `Insufficient ETH for payment + gas (needs ≈ ${fmt("ETH", neededNative)}, you have ${fmt("ETH", nativeBal)}).`
              : `Not enough ETH for gas (needs ≈ ${fmt("ETH", gasCost)}, you have ${fmt("ETH", nativeBal)}). Get testnet gas from a faucet.`,
        };
      }
    } catch (err) {
      console.warn("[preflight] gas price read failed, skipping affordability check:", err);
    }
  } catch (err) {
    if (isVerdictFailure(err)) {
      return { ok: false, error: friendlyTxError(err, "preflight-estimate") };
    }
    console.warn("[preflight] estimate failed (non-verdict), continuing:", err);
  }

  return { ok: true };
}
