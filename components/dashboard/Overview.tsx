"use client";

import { useState } from "react";
import StatsRow from "./StatsRow";
import RevenueChart from "./RevenueChart";
import ChainBreakdown from "./ChainBreakdown";
import PaymentsTable from "./PaymentsTable";
import { useDashboard } from "./DashboardContext";
import { payments } from "./data";
import { downloadCsv } from "./utils";
import type { RangeKey } from "./data";

export default function Overview() {
  const { openPayment } = useDashboard();
  const [range, setRange] = useState<RangeKey>("7D");
  const [query, setQuery] = useState("");

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-[26px] font-medium leading-none tracking-[-0.02em]">
            Overview
          </h1>
          <p className="mt-2 text-[13px] text-d-muted">
            Real-time payment activity across your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 items-center gap-2 rounded-lg border border-d-edge bg-d-panel px-3.5 text-[12.5px] text-d-muted">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M1.5 5.5h11M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Oct 1 — Oct 17, 2026
          </span>
          <button
            onClick={() =>
              downloadCsv("payments.csv", [
                ["Payment", "Customer", "Email", "Amount", "Coin", "Chain", "Status", "Time"],
                ...payments.map((p) => [p.id, p.customer, p.email, p.amount, p.coin, p.chain, p.status, p.time]),
              ])
            }
            className="flex h-9 items-center gap-2 rounded-lg border border-d-edge bg-d-panel px-3.5 text-[12.5px] font-medium text-d-ink transition-colors hover:bg-d-raised"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5v8M7 1.5L4 4.5M7 1.5l3 3M2 9.5v2A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </button>
        </div>
      </div>

      <StatsRow />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart range={range} onRange={setRange} />
        </div>
        <ChainBreakdown />
      </div>

      <div className="mt-4">
        <PaymentsTable query={query} onSearch={setQuery} onRowClick={openPayment} />
      </div>
    </>
  );
}
