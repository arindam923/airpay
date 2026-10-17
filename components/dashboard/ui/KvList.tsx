import type { ReactNode } from "react";

export default function KvList({
  items,
}: {
  items: [string, ReactNode][];
}) {
  return (
    <div className="rounded-xl border border-d-edge bg-d-raised/60">
      {items.map(([k, v], i) => (
        <div
          key={k + String(i)}
          className="flex items-center justify-between border-b border-d-edge-soft px-4 py-2.5 text-[13px] last:border-0"
        >
          <span className="text-d-muted">{k}</span>
          <span className="text-d-ink">{v}</span>
        </div>
      ))}
    </div>
  );
}
