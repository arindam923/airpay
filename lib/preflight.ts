import { createPublicClient, encodeFunctionData, formatEther, http, parseAbi, type Hex } from "viem";
import type { TestnetInfo } from "./chains";
import { friendlyTxError } from "./errors";
import { SETTLEMENT_ABI } from "./settlement/abi";

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
]);

export type PreflightResult = { ok: true } | { ok: false; error: string };

/** Settlement routing info, when the intent settles through the contract. */
export interface SettlementCall {
  merchantId: Hex;
  ref: Hex;
}

function fmt(coin: "ETH" | "USDC", units: bigint): string {
  if (coin === "ETH") return `${formatEther(units)} ETH`;
  return `${Number(units) / 1e6} USDC`;
}

/** Only verdict-type failures should block; RPC hiccups must not. */
function isVerdictFailure(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? `${err.message} ${String((err as { details?: string }).details ?? "")}`
      : String(err);
  return /execution reverted|insufficient funds|exceeds balance|transfer amount/i.test(msg);
}

async function checkGasAffordability(
  client: ReturnType<typeof createPublicClient>,
  account: `0x${string}`,
  nativeBal: bigint | null,
  token: "ETH" | "USDC",
  units: bigint,
  gas: bigint,
): Promise<PreflightResult> {
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
  return { ok: true };
}

/**
 * Verify a payment can actually be executed BEFORE opening the wallet:
 * balances, gas affordability and an on-chain gas estimation (which reverts
 * exactly like the wallet simulation would). Prevents MetaMask's
 * "failed to simulate / you could lose all funds" flow.
 *
 * When `settlement` is present the destination is the AirPay settlement
 * contract and we simulate the `payNative`/`payToken` call instead of a plain
 * transfer. USDC settlement needs an `approve` before `payToken`, so only the
 * approval is estimated (the pay call simulates cleanly once approved).
 */
export async function preflightPayment(params: {
  net: TestnetInfo;
  account: `0x${string}`;
  receiver: `0x${string}`;
  token: "ETH" | "USDC";
  units: bigint;
  settlement?: SettlementCall | null;
}): Promise<PreflightResult> {
  const { net, account, receiver, token, units, settlement } = params;
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
        nativeBal,
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
            usdcBal,
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
    let data: `0x${string}` | undefined;
    let to = receiver;

    if (settlement && token === "ETH") {
      data = encodeFunctionData({
        abi: SETTLEMENT_ABI,
        functionName: "payNative",
        args: [settlement.merchantId, settlement.ref],
      });
    } else if (settlement) {
      // USDC → approve(contract) then payToken. Estimate whichever step is next.
      const allowance = (await client.readContract({
        address: net.usdc,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [account, receiver],
      })) as bigint;
      if (allowance < units) {
        data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [receiver, units],
        });
      } else {
        data = encodeFunctionData({
          abi: SETTLEMENT_ABI,
          functionName: "payToken",
          args: [settlement.merchantId, net.usdc, units, settlement.ref],
        });
      }
      to = net.usdc;
    } else if (token === "USDC") {
      data = encodeFunctionData({ abi: ERC20_ABI, functionName: "transfer", args: [receiver, units] });
      to = net.usdc;
    }

    const gas = settlement
      ? await client.estimateGas({ account, to, data, value: token === "ETH" ? units : undefined })
      : await client.estimateGas(data ? { account, to, data } : { account, to, value: units });

    const afford = await checkGasAffordability(client, account, nativeBal, token, units, gas);
    if (!afford.ok) return afford;
  } catch (err) {
    if (isVerdictFailure(err)) {
      return { ok: false, error: friendlyTxError(err, "preflight-estimate") };
    }
    console.warn("[preflight] estimate failed (non-verdict), continuing:", err);
  }

  return { ok: true };
}
