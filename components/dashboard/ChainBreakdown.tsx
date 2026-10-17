"use client";

import { chains } from "./data";

export default function ChainBreakdown() {
  const total = chains.reduce((a, c) => a + parseFloat(c.amount.replace(/[$,]/g, "")), 0);

  const segments = chains.map((c, i) => ({
    ...c,
    offset: 25 - chains.slice(0, i).reduce((a, p) => a + p.pct, 0),
  }));

  return (
    <section className="flex flex-col rounded-2xl border border-d-edge d-card p-5">
      <h2 className="text-[14px] font-medium text-d-ink">Volume by chain</h2>
      <p className="mt-0.5 text-[12px] text-d-muted">Last 30 days</p>

      <div className="flex flex-1 flex-col items-center">
        <div className="relative mt-4 h-32 w-32">
          <svg viewBox="0 0 120 120" className="h-full w-full">
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke="var(--color-d-edge-soft)"
              strokeWidth="12"
            />
            {segments.map((c) => (
              <circle
                key={c.name}
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke={c.color}
                strokeWidth="12"
                strokeLinecap="butt"
                pathLength={100}
                strokeDasharray={`${c.pct} ${100 - c.pct}`}
                strokeDashoffset={c.offset}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-[15px] font-semibold text-d-ink">
              ${total.toLocaleString("en-US")}
            </span>
            <span className="mt-0.5 text-[10px] text-d-muted">Total volume</span>
          </div>
        </div>

        <div className="mt-4 w-full">
          {segments.map((c) => (
            <div key={c.name} className="[&:not(:first-child)]:mt-1.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12.5px] text-d-ink">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </span>
                <span className="font-mono text-[12px] text-d-muted">{c.amount}</span>
              </div>
              <div className="h-0.5 overflow-hidden rounded-full bg-d-edge-soft">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
