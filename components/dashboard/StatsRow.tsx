"use client";

import { stats } from "./data";

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 96},${28 - ((v - min) / span) * 24}`)
    .join(" ");
  return (
    <svg viewBox="0 0 96 32" className="h-8 w-24" fill="none">
      <polyline points={pts} stroke="var(--color-d-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx="96" cy={28 - ((data[data.length - 1] - min) / span) * 24} r="3" fill="var(--color-d-success)" />
    </svg>
  );
}

export default function StatsRow() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-d-edge bg-d-panel p-4 transition-colors hover:border-d-muted/40"
        >
          <div className="flex items-start justify-between">
            <p className="text-[12px] font-medium text-d-muted">{s.label}</p>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                s.up
                  ? "bg-d-success/10 text-d-success"
                  : "bg-d-failed/10 text-d-failed"
              }`}
            >
              {s.delta}
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="font-sans text-[26px] font-medium leading-none tracking-[-0.02em] text-d-ink">
              {s.value}
            </p>
            <Sparkline data={s.spark} />
          </div>
          <p className="mt-2 text-[11px] text-d-muted/70">vs. previous period</p>
        </div>
      ))}
    </div>
  );
}
