"use client";

import { useState } from "react";
import StatsRow from "./StatsRow";
import RevenueChart from "./RevenueChart";
import ChainBreakdown from "./ChainBreakdown";
import PaymentsTable from "./PaymentsTable";
import { useDashboard } from "./DashboardContext";
import { payments } from "./data";
import type { RangeKey } from "./data";
import PageHeader from "./PageHeader";
import ExportButton from "./ui/ExportButton";

export default function Overview() {
  const { openPayment } = useDashboard();
  const [range, setRange] = useState<RangeKey>("7D");
  const [query, setQuery] = useState("");

  return (
    <>
      <PageHeader
        title="Overview"
        description="Real-time payment activity across your workspace."
        actions={
          <>
            <span className="flex h-9 items-center gap-2 rounded-lg border border-d-edge bg-d-panel px-3.5 text-[12.5px] text-d-muted">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M1.5 5.5h11M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Oct 1 — Oct 17, 2026
            </span>
            <ExportButton
              filename="payments.csv"
              title="CSV"
              rows={[
                ["Payment", "Customer", "Email", "Amount", "Coin", "Chain", "Status", "Time"],
                ...payments.map((p) => [p.id, p.customer, p.email, p.amount, p.coin, p.chain, p.status, p.time]),
              ]}
            />
          </>
        }
      />

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
