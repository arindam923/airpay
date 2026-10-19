import { keccak256, parseAbi, stringToHex, type Address, type Hex } from "viem";

/**
 * AirPay settlement contract ABI. Shared by the server (viem public/wallet
 * clients in `lib/settlement/*`) and the hosted checkout (wagmi writes).
 * Mirrors `contracts/src/AirPaySettlement.sol`.
 */
export const SETTLEMENT_ABI = parseAbi([
  // --- admin ---
  "function registerMerchant(bytes32 merchantId, address payout, uint16 feeBps)",
  "function upsertMerchant(bytes32 merchantId, address payout, uint16 feeBps)",
  "function setMerchantPayout(bytes32 merchantId, address payout)",
  "function setMerchantFee(bytes32 merchantId, uint16 feeBps)",
  "function setMerchantActive(bytes32 merchantId, bool active)",
  "function setTreasury(address newTreasury)",
  "function pause()",
  "function unpause()",
  "function rescue(address token, address to, uint256 amount)",
  "function transferOwnership(address newOwner)",
  "function renounceOwnership()",
  // --- payments ---
  "function payNative(bytes32 merchantId, bytes32 ref) payable",
  "function payToken(bytes32 merchantId, address token, uint256 gross, bytes32 ref)",
  // --- views ---
  "function merchant(bytes32 merchantId) view returns (address payout, uint16 feeBps, bool active)",
  "function isRegistered(bytes32 merchantId) view returns (bool)",
  "function quote(bytes32 merchantId, uint256 gross) view returns (uint256 fee, uint256 net)",
  "function treasury() view returns (address)",
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function DEFAULT_FEE_BPS() view returns (uint16)",
  "function MAX_FEE_BPS() view returns (uint16)",
  "function BPS_DENOMINATOR() view returns (uint16)",
  // --- events ---
  "event TreasuryUpdated(address indexed treasury)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event Paused(address account)",
  "event Unpaused(address account)",
  "event PausedSet(bool paused)",
  "event MerchantRegistered(bytes32 indexed merchantId, address indexed payout, uint16 feeBps)",
  "event MerchantUpdated(bytes32 indexed merchantId, address indexed payout, uint16 feeBps, bool active)",
  "event Settled(bytes32 indexed merchantId, bytes32 indexed ref, address indexed payer, address token, uint256 gross, uint256 fee, uint256 net, address payout)",
  // --- errors ---
  "error ZeroAddress()",
  "error InvalidFee(uint16 feeBps, uint16 max)",
  "error MerchantAlreadyRegistered(bytes32 merchantId)",
  "error MerchantNotRegistered(bytes32 merchantId)",
  "error MerchantNotActive(bytes32 merchantId)",
  "error NothingToSettle()",
  "error NativeTransferFailed()",
] as const);

/** Native-asset sentinel used by the contract (`token == address(0)`). */
export const NATIVE_TOKEN: Address = "0x0000000000000000000000000000000000000000";

/** Basis-point denominator (100% == 10_000), mirrors the contract constant. */
export const SETTLEMENT_BPS_DENOMINATOR = 10_000;

/** Fee applied when a merchant is registered without an explicit rate. */
export const SETTLEMENT_DEFAULT_FEE_BPS = 90;

/** Hard ceiling on any merchant fee. */
export const SETTLEMENT_MAX_FEE_BPS = 1_000;

/** Decoded `Settled` event arguments. */
export interface SettledEventArgs {
  merchantId: Hex;
  ref: Hex;
  payer: Address;
  token: Address;
  gross: bigint;
  fee: bigint;
  net: bigint;
  payout: Address;
}

/**
 * Deterministic on-chain merchant id for an organization. Keccak hashing keeps
 * ids uniform across chains and avoids leaking the raw org id in calldata.
 */
export function merchantIdFor(organizationId: string): Hex {
  return keccak256(stringToHex(organizationId));
}

/**
 * On-chain reconciliation reference for a payment intent. Passed to the
 * contract so verification can match a `Settled` log to an exact intent.
 */
export function refFor(intentId: string): Hex {
  return keccak256(stringToHex(intentId));
}

/** Fee/net split for a gross amount under a fee rate in basis points. */
export function splitFee(gross: bigint, feeBps: number): { fee: bigint; net: bigint } {
  const fee = (gross * BigInt(feeBps)) / BigInt(SETTLEMENT_BPS_DENOMINATOR);
  return { fee, net: gross - fee };
}
