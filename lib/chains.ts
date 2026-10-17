import { arbitrumSepolia, baseSepolia, optimismSepolia, polygonAmoy, sepolia } from "viem/chains";
import type { Chain } from "viem";

export type TestnetKey = "base" | "ethereum" | "arbitrum" | "optimism" | "polygon";

/** Literal union so wagmi's typed `switchChain`/`sendTransaction` accept our ids. */
export type SupportedChainId = 84532 | 11155111 | 421614 | 11155420 | 80002;

export interface TestnetInfo {
  key: TestnetKey;
  /** Display name used across the checkout UI. */
  name: string;
  chainId: SupportedChainId;
  viemChain: Chain;
  /** Env var that can override the default RPC. */
  rpcEnv: string;
  defaultRpc: string;
  /** Circle-issued USDC on this testnet (6 decimals). */
  usdc: `0x${string}`;
  nativeSymbol: string;
  explorerTx: (hash: string) => string;
  explorerAddress: (address: string) => string;
  /** Etherscan v2 chain id for the multichain API. */
  etherscanChainId: number;
}

export const TESTNETS: Record<TestnetKey, TestnetInfo> = {
  base: {
    key: "base",
    name: "Base",
    chainId: baseSepolia.id as SupportedChainId,
    viemChain: baseSepolia,
    rpcEnv: "RPC_BASE_SEPOLIA",
    defaultRpc: "https://sepolia.base.org",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    nativeSymbol: "ETH",
    explorerTx: (hash) => `https://sepolia.basescan.org/tx/${hash}`,
    explorerAddress: (a) => `https://sepolia.basescan.org/address/${a}`,
    etherscanChainId: baseSepolia.id,
  },
  ethereum: {
    key: "ethereum",
    name: "Ethereum",
    chainId: sepolia.id as SupportedChainId,
    viemChain: sepolia,
    rpcEnv: "RPC_ETHEREUM_SEPOLIA",
    defaultRpc: "https://ethereum-sepolia-rpc.publicnode.com",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    nativeSymbol: "ETH",
    explorerTx: (hash) => `https://sepolia.etherscan.io/tx/${hash}`,
    explorerAddress: (a) => `https://sepolia.etherscan.io/address/${a}`,
    etherscanChainId: sepolia.id,
  },
  arbitrum: {
    key: "arbitrum",
    name: "Arbitrum",
    chainId: arbitrumSepolia.id as SupportedChainId,
    viemChain: arbitrumSepolia,
    rpcEnv: "RPC_ARBITRUM_SEPOLIA",
    defaultRpc: "https://sepolia-rollup.arbitrum.io/rpc",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    nativeSymbol: "ETH",
    explorerTx: (hash) => `https://sepolia.arbiscan.io/tx/${hash}`,
    explorerAddress: (a) => `https://sepolia.arbiscan.io/address/${a}`,
    etherscanChainId: arbitrumSepolia.id,
  },
  optimism: {
    key: "optimism",
    name: "Optimism",
    chainId: optimismSepolia.id as SupportedChainId,
    viemChain: optimismSepolia,
    rpcEnv: "RPC_OPTIMISM_SEPOLIA",
    defaultRpc: "https://sepolia.optimism.io",
    usdc: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
    nativeSymbol: "ETH",
    explorerTx: (hash) => `https://sepolia-optimism.etherscan.io/tx/${hash}`,
    explorerAddress: (a) => `https://sepolia-optimism.etherscan.io/address/${a}`,
    etherscanChainId: optimismSepolia.id,
  },
  polygon: {
    key: "polygon",
    name: "Polygon",
    chainId: polygonAmoy.id as SupportedChainId,
    viemChain: polygonAmoy,
    rpcEnv: "RPC_POLYGON_AMOY",
    defaultRpc: "https://rpc-amoy.polygon.technology",
    usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    nativeSymbol: "POL",
    explorerTx: (hash) => `https://amoy.polygonscan.com/tx/${hash}`,
    explorerAddress: (a) => `https://amoy.polygonscan.com/address/${a}`,
    etherscanChainId: polygonAmoy.id,
  },
};

export const TESTNET_LIST: TestnetInfo[] = Object.values(TESTNETS);

/** Lookup by checkout display name ("Base", "Ethereum", …). */
export function testnetByName(name: string): TestnetInfo | null {
  return TESTNET_LIST.find((t) => t.name === name) ?? null;
}

export function testnetByChainId(chainId: number): TestnetInfo | null {
  return TESTNET_LIST.find((t) => t.chainId === chainId) ?? null;
}

export function testnetByKey(key: string): TestnetInfo | null {
  return TESTNETS[key as TestnetKey] ?? null;
}

/** Server-side RPC resolution with per-chain env override. */
export function rpcUrl(info: TestnetInfo): string {
  const override = process.env[info.rpcEnv];
  return override && override.trim() !== "" ? override.trim() : info.defaultRpc;
}
