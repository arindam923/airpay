"use client";

import { useId } from "react";
import { stats } from "./data";

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const gradientId = useId();
  const color = up ? "var(--color-d-success)" : "var(--color-d-failed)";
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map(
    (v, i) => `${(i / (data.length - 1)) * 96},${28 - ((v - min) / span) * 24}`
  );
  const lastY = 28 - ((data[data.length - 1] - min) / span) * 24;
  return (
    <svg viewBox="0 0 96 32" className="h-8 w-24" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M${pts.join(" L ")} L 96,32 L 0,32 Z`} fill={`url(#${gradientId})`} stroke="none" />
      <polyline
        points={pts.join(" ")}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx="96" cy={lastY} r="3" fill={color} />
    </svg>
  );
}

export default function StatsRow() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl border border-d-edge d-card p-4 transition-colors hover:border-d-muted/40"
        >
          <div className="flex items-start justify-between">
            <p className="text-[12px] font-medium text-d-muted">{s.label}</p>
            <span
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                s.up
                  ? "bg-d-success/10 text-d-success"
                  : "bg-d-failed/10 text-d-failed"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                {s.up ? (
                  <path
                    d="M7 11.5V2.5M7 2.5L3.5 6M7 2.5l3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M7 2.5v9M7 11.5L3.5 8M7 11.5l3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
              {s.delta}
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="font-sans text-[26px] font-medium leading-none tracking-[-0.02em] text-d-ink">
              {s.value}
            </p>
            <Sparkline data={s.spark} up={s.up} />
          </div>
          <p className="mt-2 text-[11px] text-d-muted/70">vs. previous period</p>
        </div>
      ))}
    </div>
  );
}
