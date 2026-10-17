"use client";

import { chains } from "./data";

export default function ChainBreakdown() {
  const total = chains.reduce((a, c) => a + parseFloat(c.amount.replace(/[$,]/g, "")), 0);

  return (
    <section className="flex flex-col rounded-xl border border-d-edge bg-d-panel p-5">
      <h2 className="text-[14px] font-medium text-d-ink">Volume by chain</h2>
      <p className="mt-0.5 text-[12px] text-d-muted">Last 30 days</p>

      <div className="mt-5 flex flex-1 flex-col justify-center gap-4">
        {chains.map((c) => (
          <div key={c.name}>
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-2 text-d-ink">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold"
                  style={{ backgroundColor: `${c.color}22`, color: c.color }}
                >
                  {c.symbol}
                </span>
                {c.name}
              </span>
              <span className="font-mono text-d-muted">{c.amount}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-d-edge-soft">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${c.pct}%`, backgroundColor: c.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-d-edge-soft pt-4">
        <span className="text-[12px] text-d-muted">Total volume</span>
        <span className="font-mono text-[14px] font-semibold text-d-ink">
          ${total.toLocaleString("en-US")}
        </span>
      </div>
    </section>
  );
}
