"use client";

import { useId, useMemo, useState } from "react";
import { chartData, ranges, xLabels, type RangeKey } from "./data";

const W = 720;
const H = 260;
const PAD_LEFT = 44;
const PAD_RIGHT = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PLOT_W = W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;
const BAR_W_RATIO = 0.55;
const BAR_ZONE_RATIO = 0.34;

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function RevenueChart({
  range,
  onRange,
}: {
  range: RangeKey;
  onRange: (r: RangeKey) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();

  const selectRange = (r: RangeKey) => {
    setHover(null);
    onRange(r);
  };

  const { line, area, pts, max, min, bars, step } = useMemo(() => {
    const data = chartData[range].points;
    const vols = chartData[range].volumes;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const span = max - min || 1;
    const volMax = Math.max(...vols) || 1;
    const pts = data.map((v, i) => ({
      x: PAD_LEFT + (i / (data.length - 1)) * PLOT_W,
      y: PAD_TOP + (1 - (v - min) / span) * PLOT_H,
    }));
    const line = smoothPath(pts);
    const area = `${line} L ${pts[pts.length - 1].x} ${H - PAD_BOTTOM} L ${pts[0].x} ${H - PAD_BOTTOM} Z`;
    const step = PLOT_W / (data.length - 1);
    const barW = (PLOT_W / data.length) * BAR_W_RATIO;
    const barZone = PLOT_H * BAR_ZONE_RATIO;
    const bars = vols.map((v, i) => {
      const h = (v / volMax) * barZone;
      return { x: pts[i].x - barW / 2, y: H - PAD_BOTTOM - h, w: barW, h };
    });
    return { line, area, pts, max, min, bars, step };
  }, [range]);

  const gridYs = [0, 1, 2, 3].map((i) => PAD_TOP + (i / 3) * PLOT_H);
  const fmt = (v: number) => `$${(v / 10).toFixed(1)}k`;

  return (
    <section className="rounded-2xl border border-d-edge d-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-medium text-d-ink">Revenue</h2>
          <p className="mt-0.5 text-[12px] text-d-muted">
            {chartData[range].label} · {fmt(min)} — {fmt(max)}
          </p>
        </div>
        <div className="flex gap-0.5 rounded-lg border border-d-edge bg-d-raised p-0.5">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => selectRange(r)}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                range === r
                  ? "bg-d-accent text-white"
                  : "text-d-muted hover:text-d-ink"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * W;
            let best = 0;
            let bestDist = Infinity;
            pts.forEach((p, i) => {
              const d = Math.abs(p.x - x);
              if (d < bestDist) {
                bestDist = d;
                best = i;
              }
            });
            setHover(best);
          }}
        >
          <defs>
            <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-d-accent)" stopOpacity="0.38" />
              <stop offset="100%" stopColor="var(--color-d-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridYs.map((y, i) => (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={W - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--color-d-edge)"
                strokeWidth="1"
                strokeDasharray={i === 3 ? "" : "3 4"}
              />
              <text
                x={PAD_LEFT - 4}
                y={y}
                dy="3"
                textAnchor="end"
                fontSize="10"
                fill="var(--color-d-muted)"
                opacity="0.7"
              >
                {fmt(max - (i / 3) * (max - min))}
              </text>
            </g>
          ))}

          <g key={range} className="animate-rise" style={{ animationDuration: "0.5s" }}>
            {bars.map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx="2"
                fill="var(--color-d-accent)"
                opacity="0.14"
              />
            ))}
          </g>

          <path
            key={range}
            d={area}
            fill={`url(#${gid}-fill)`}
            className="animate-rise"
            style={{ animationDuration: "0.5s" }}
          />
          <path
            key={`${range}-line`}
            d={line}
            fill="none"
            stroke="var(--color-d-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            className="animate-draw"
            style={{ filter: "drop-shadow(0 0 6px var(--color-d-accent-glow))" }}
          />

          {hover !== null && (
            <g>
              <rect
                x={pts[hover].x - step / 2}
                y={PAD_TOP}
                width={step}
                height={PLOT_H}
                fill="#fff"
                opacity="0.03"
              />
              <line
                x1={pts[hover].x}
                x2={pts[hover].x}
                y1={PAD_TOP - 4}
                y2={H - PAD_BOTTOM}
                stroke="var(--color-d-muted)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <circle
                cx={pts[hover].x}
                cy={pts[hover].y}
                r="5"
                fill="var(--color-d-accent)"
                stroke="var(--color-d-panel)"
                strokeWidth="2.5"
              />
            </g>
          )}

          {xLabels[range].map((l, i, arr) => {
            const x = PAD_LEFT + (i / (arr.length - 1)) * PLOT_W;
            const anchor = i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle";
            return (
              <text key={l} x={x} y={H - 8} textAnchor={anchor} fontSize="10" fill="var(--color-d-muted)" opacity="0.8">
                {l}
              </text>
            );
          })}
        </svg>

        {hover !== null && (
          <div
            className="d-glass pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl border border-d-edge px-3 py-2"
            style={{ left: `${(pts[hover].x / W) * 100}%` }}
          >
            <p className="font-mono text-[12px] font-semibold text-d-ink">
              ${(chartData[range].points[hover] * 100).toLocaleString("en-US")}
            </p>
            <p className="text-[10px] text-d-muted">
              {chartData[range].volumes[hover]} txns
            </p>
            <p className="text-[9px] text-d-muted opacity-80">
              {xLabels[range][Math.round((hover / (chartData[range].points.length - 1)) * (xLabels[range].length - 1))]}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
