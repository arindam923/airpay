import { testnetByName, TESTNET_LIST, type TestnetKey } from "@/lib/chains";
import { tokenMeta, TOKENS } from "@/lib/tokens";

export type AmountMode = "fixed" | "flex";

export interface ChainInfo {
  key: TestnetKey;
  name: string;
  color: string;
  glyph: string;
  coins: string[];
}

export const CHAINS: ChainInfo[] = [
  { key: "base", name: "Base", color: "#0052ff", glyph: "B", coins: ["USDC", "ETH"] },
  { key: "ethereum", name: "Ethereum", color: "#6d7ce0", glyph: "Ξ", coins: ["USDC", "ETH"] },
  { key: "arbitrum", name: "Arbitrum", color: "#28a0f0", glyph: "A", coins: ["USDC", "ETH"] },
  { key: "polygon", name: "Polygon", color: "#8247e5", glyph: "P", coins: ["USDC"] },
  { key: "optimism", name: "Optimism", color: "#ff0420", glyph: "O", coins: ["USDC", "ETH"] },
];

export const COIN_META: Record<string, { color: string; rate: number }> = TOKENS;

export function chainInfo(name: string): ChainInfo {
  return CHAINS.find((c) => c.name === name) ?? CHAINS[0];
}

export function coinsForChain(name: string): string[] {
  return chainInfo(name).coins;
}

/** Chains supported by the real (testnet) payment flow. */
export function testnetChainNames(): string[] {
  return TESTNET_LIST.map((t) => t.name);
}

export interface CheckoutConfig {
  slug: string;
  title: string;
  merchant: string;
  mode: AmountMode;
  amount: number;
  min: number;
  max: number | null;
  chain: string;
  coin: string;
}

export interface NewLinkInput {
  title: string;
  merchant: string;
  mode: AmountMode;
  amount: number;
  min: number;
  max: number | null;
  chain: string;
  coin: string;
}

export function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCoinAmount(usd: number, coin: string): string {
  const meta = tokenMeta(coin);
  const amt = usd / meta.rate;
  if (meta.rate === 1) {
    return amt.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  const dp = coin === "ETH" ? 5 : 4;
  return amt.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: dp,
  });
}

export function buildCheckoutUrl(origin: string, slug: string, input: NewLinkInput): string {
  const p = new URLSearchParams();
  p.set("t", input.title);
  p.set("m", input.merchant);
  p.set("mode", input.mode);
  if (input.mode === "fixed") {
    p.set("amt", String(input.amount));
  } else {
    p.set("min", String(input.min));
    p.set("sugg", String(input.amount));
    if (input.max != null) p.set("max", String(input.max));
  }
  p.set("chain", input.chain);
  p.set("coin", input.coin);
  return `${origin}/pay/${slug}?${p.toString()}`;
}

export function demoConfig(slug: string): CheckoutConfig {
  return {
    slug,
    title: "Demo payment link — invoice #1042",
    merchant: "Lattice Studio",
    mode: "fixed",
    amount: 10,
    min: 0,
    max: null,
    chain: "Base",
    coin: "USDC",
  };
}

function num(v: string | null): number | null {
  if (v == null || v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function parseCheckoutConfig(pathname: string, search: string): CheckoutConfig | null {
  try {
    const params = new URLSearchParams(search);
    const title = (params.get("t") ?? "").trim();
    if (!title) return null;

    const parts = pathname.split("/").filter(Boolean);
    const slug = parts.length > 0 && parts[parts.length - 1] !== "pay" ? parts[parts.length - 1] : "";

    const merchant = (params.get("m") ?? "").trim() || "Merchant";
    const mode: AmountMode = params.get("mode") === "flex" ? "flex" : "fixed";

    const requestedChain = params.get("chain") ?? "";
    const info = testnetByName(requestedChain);
    const chain = info ? info.name : CHAINS[0].name;
    const coins = coinsForChain(chain);
    let coin = params.get("coin") ?? "";
    if (!coins.includes(coin)) coin = coins[0];

    if (mode === "fixed") {
      const amt = num(params.get("amt"));
      if (amt == null || amt <= 0) return null;
      return { slug, title, merchant, mode, amount: amt, min: 0, max: null, chain, coin };
    }

    const min = num(params.get("min")) ?? 1;
    if (min <= 0) return null;
    const maxRaw = num(params.get("max"));
    const max = maxRaw != null && maxRaw > min ? maxRaw : null;
    let sugg = num(params.get("sugg")) ?? min;
    sugg = Math.min(Math.max(sugg, min), max ?? Number.POSITIVE_INFINITY);
    return { slug, title, merchant, mode, amount: sugg, min, max, chain, coin };
  } catch {
    return null;
  }
}

export function receiveAddress(receiver: string): string {
  return receiver;
}

function coinUnits(usd: number, coin: string): { units: string; dp: number } {
  const meta = tokenMeta(coin);
  const amt = usd / meta.rate;
  const dp = meta.rate === 1 ? 6 : 8;
  let s = amt.toFixed(dp);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return { units: s, dp };
}

export function paymentUri(chain: string, coin: string, usd: number, receiver: string): string {
  const addr = receiveAddress(receiver);
  const info = testnetByName(chain);
  const chainId = info?.chainId ?? 84532;
  const { units, dp } = coinUnits(usd, coin);

  if (coin === "ETH") {
    const wei = BigInt(Math.round((usd / tokenMeta("ETH").rate) * 1e18));
    return `ethereum:${addr}@${chainId}?value=${wei}`;
  }
  const raw = BigInt(Math.max(1, Math.round(parseFloat(units) * 10 ** dp)));
  const token = info?.usdc ?? "";
  return `ethereum:${token}@${chainId}/transfer?address=${addr}&uint256=${raw}`;
}

export function amountChips(cfg: CheckoutConfig): number[] {
  const inBounds = (n: number) => n >= cfg.min && (cfg.max == null || n <= cfg.max);
  const nice = [10, 25, 50, 100, 250, 500, 1000];
  const set = new Set<number>();
  if (cfg.amount >= cfg.min && inBounds(cfg.amount)) set.add(cfg.amount);
  for (const n of nice) {
    if (inBounds(n)) set.add(n);
    if (set.size >= 4) break;
  }
  if (set.size < 3 && inBounds(cfg.min)) set.add(cfg.min);
  if (cfg.max != null && set.size < 4 && inBounds(cfg.max)) set.add(cfg.max);
  return [...set].sort((a, b) => a - b).slice(0, 4);
}
