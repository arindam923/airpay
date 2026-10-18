"use client";

import { useDashboard } from "./DashboardContext";
import { setEnvironment } from "@/lib/env-store";

export default function ProductionBanner() {
  const { productionLocked } = useDashboard();

  if (!productionLocked) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 7V5.5a4 4 0 018 0V7M3.5 7h9v6.5h-9z"
              stroke="#fbbf24"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <p className="text-[13px] font-medium text-d-ink">Production is locked</p>
          <p className="text-[12px] text-d-muted">
            Mainnet isn&apos;t enabled yet. Switch to Sandbox to create and test payment links,
            invoices and API keys on testnets.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setEnvironment("sandbox")}
        className="flex h-9 items-center rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
      >
        Switch to Sandbox
      </button>
    </div>
  );
}
