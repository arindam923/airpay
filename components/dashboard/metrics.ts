import type { PublicIntent } from "@/lib/api-types";
import type { RangeKey } from "./data";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const SPARK_BUCKETS = 12;

export interface Stat {
  label: string;
  value: string;
  delta?: string;
  good?: boolean;
  direction?: "up" | "down";
  spark: number[];
}

export interface ChainSlice {
  name: string;
  symbol: string;
  color: string;
  usd: number;
}

export interface ChartSeries {
  label: string;
  points: number[];
  volumes: number[];
  xLabels: string[];
}

const RANGE_CONFIG: Record<
  RangeKey,
  { label: string; buckets: number; spanMs: number; labelEvery: number }
> = {
  "24H": { label: "Today", buckets: 24, spanMs: HOUR, labelEvery: 3 },
  "7D": { label: "Last 7 days", buckets: 7, spanMs: DAY, labelEvery: 1 },
  "30D": { label: "Last 30 days", buckets: 30, spanMs: DAY, labelEvery: 5 },
  "90D": { label: "Last 90 days", buckets: 13, spanMs: 7 * DAY, labelEvery: 2 },
};

const CHAIN_META: Record<string, { symbol: string; color: string }> = {
  base: { symbol: "B", color: "#0052ff" },
  ethereum: { symbol: "Ξ", color: "#8a94ff" },
  arbitrum: { symbol: "A", color: "#28a0f0" },
  optimism: { symbol: "O", color: "#ff0420" },
  polygon: { symbol: "P", color: "#8247e5" },
};

const FALLBACK_COLORS = ["#3fb950", "#e3a008", "#f2636b", "#9945ff", "#26a17b"];

const OTHER = { symbol: "+", color: "#8b8b96" };

export function formatUsd(n: number): string {
  const abs = Math.abs(n);
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: abs >= 1000 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatRange(items: PublicIntent[]): string | null {
  if (items.length === 0) return null;
  const times = items.map((p) => p.createdAt);
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times));
  const sameDay = min.toDateString() === max.toDateString();
  const start = min.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const end = max.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return sameDay ? end : `${start} — ${end}`;
}

function dayBucketSeries(
  items: PublicIntent[],
  days: number,
  now: number,
  value: (slice: PublicIntent[]) => number
): number[] {
  const start = now - days * DAY;
  const buckets: PublicIntent[][] = Array.from({ length: days }, () => []);
  for (const p of items) {
    if (p.createdAt < start) continue;
    const idx = Math.min(days - 1, Math.floor((p.createdAt - start) / DAY));
    buckets[idx].push(p);
  }
  return buckets.map(value);
}

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function period(items: PublicIntent[], fromMs: number, toMs: number) {
  const slice = items.filter((p) => p.createdAt >= fromMs && p.createdAt < toMs);
  const confirmed = slice.filter((p) => p.status === "confirmed");
  const failed = slice.filter((p) => p.status === "failed");
  const attempted = confirmed.length + failed.length;
  return {
    count: slice.length,
    volume: confirmed.reduce((sum, p) => sum + p.amountUsd, 0),
    successRate: attempted ? (confirmed.length / attempted) * 100 : 0,
    avgConfirm: avgConfirmSeconds(confirmed),
  };
}

function avgConfirmSeconds(confirmed: PublicIntent[]): number {
  const spans = confirmed
    .filter((p) => p.confirmedAt != null)
    .map((p) => (p.confirmedAt! - p.createdAt) / 1000)
    .filter((s) => s >= 0);
  if (spans.length === 0) return 0;
  return spans.reduce((a, b) => a + b, 0) / spans.length;
}

function fmtPercentDelta(delta: number | null): Pick<Stat, "delta" | "good" | "direction"> {
  if (delta == null) return {};
  const up = delta >= 0;
  return {
    delta: `${up ? "+" : "-"}${Math.abs(delta).toFixed(1)}%`,
    good: up,
    direction: up ? "up" : "down",
  };
}

function fmtSecondsDelta(delta: number | null): Pick<Stat, "delta" | "good" | "direction"> {
  if (delta == null) return {};
  const faster = delta <= 0;
  return {
    delta: `${faster ? "-" : "+"}${Math.abs(delta).toFixed(2)}s`,
    good: faster,
    direction: faster ? "down" : "up",
  };
}

export function deriveStats(items: PublicIntent[], now: number): Stat[] {
  const week = 7 * DAY;
  const current = period(items, now - week, now);
  const previous = period(items, now - 2 * week, now - week);

  let runningRate = 100;
  const rateSeries = dayBucketSeries(items, SPARK_BUCKETS, now, (slice) => {
    const c = slice.filter((p) => p.status === "confirmed").length;
    const f = slice.filter((p) => p.status === "failed").length;
    if (c + f === 0) return runningRate;
    runningRate = (c / (c + f)) * 100;
    return runningRate;
  });

  let runningConfirm = 0;
  const confirmSeries = dayBucketSeries(items, SPARK_BUCKETS, now, (slice) => {
    const avg = avgConfirmSeconds(slice.filter((p) => p.status === "confirmed"));
    if (avg > 0) runningConfirm = avg;
    return runningConfirm;
  });

  return [
    {
      label: "Total volume",
      value: formatUsd(current.volume),
      spark: dayBucketSeries(items, SPARK_BUCKETS, now, (slice) =>
        slice
          .filter((p) => p.status === "confirmed")
          .reduce((sum, p) => sum + p.amountUsd, 0)
      ),
      ...fmtPercentDelta(pctDelta(current.volume, previous.volume)),
    },
    {
      label: "Payments",
      value: current.count.toLocaleString("en-US"),
      spark: dayBucketSeries(items, SPARK_BUCKETS, now, (slice) => slice.length),
      ...fmtPercentDelta(pctDelta(current.count, previous.count)),
    },
    {
      label: "Success rate",
      value: `${current.successRate.toFixed(1)}%`,
      spark: rateSeries,
      ...(previous.successRate > 0
        ? fmtPercentDelta(current.successRate - previous.successRate)
        : {}),
    },
    {
      label: "Avg. confirmation",
      value: `${current.avgConfirm.toFixed(2)}s`,
      spark: confirmSeries,
      ...(previous.avgConfirm > 0
        ? fmtSecondsDelta(current.avgConfirm - previous.avgConfirm)
        : {}),
    },
  ];
}

export function deriveChart(items: PublicIntent[], range: RangeKey, now: number): ChartSeries {
  const { label, buckets, spanMs, labelEvery } = RANGE_CONFIG[range];
  const windowMs = buckets * spanMs;
  const start = now - windowMs;

  const points = Array.from({ length: buckets }, () => 0);
  const volumes = Array.from({ length: buckets }, () => 0);

  for (const p of items) {
    if (p.createdAt < start) continue;
    const idx = Math.min(buckets - 1, Math.floor((p.createdAt - start) / spanMs));
    volumes[idx] += 1;
    if (p.status === "confirmed") points[idx] += p.amountUsd;
  }

  const xLabels: string[] = [];
  for (let i = 0; i < buckets; i += labelEvery) {
    const at = new Date(start + i * spanMs);
    if (range === "24H") {
      const h = at.getHours();
      xLabels.push(`${h % 12 || 12}${h < 12 ? "am" : "pm"}`);
    } else if (range === "7D") {
      xLabels.push(at.toLocaleDateString("en-US", { weekday: "short" }));
    } else {
      xLabels.push(at.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    }
  }

  return { label, points, volumes, xLabels };
}

export function deriveChains(items: PublicIntent[]): ChainSlice[] {
  const byChain = new Map<string, ChainSlice>();
  const confirmed = items.filter((p) => p.status === "confirmed");
  const source = confirmed.length > 0 ? confirmed : items;

  for (const p of source) {
    const existing = byChain.get(p.chainKey);
    if (existing) {
      existing.usd += p.amountUsd;
      continue;
    }
    const meta = CHAIN_META[p.chainKey] ?? {
      symbol: p.chainName?.[0]?.toUpperCase() ?? "•",
      color: FALLBACK_COLORS[byChain.size % FALLBACK_COLORS.length],
    };
    byChain.set(p.chainKey, {
      name: p.chainName,
      symbol: meta.symbol,
      color: meta.color,
      usd: p.amountUsd,
    });
  }

  const sorted = [...byChain.values()]
    .filter((c) => c.usd > 0)
    .sort((a, b) => b.usd - a.usd);

  const total = sorted.reduce((sum, c) => sum + c.usd, 0);
  if (total <= 0) return [];

  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  if (rest.length > 0) {
    top.push({
      name: "Other chains",
      symbol: OTHER.symbol,
      color: OTHER.color,
      usd: rest.reduce((sum, c) => sum + c.usd, 0),
    });
  }

  return top;
}
