"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";
import PaymentsTable from "../PaymentsTable";
import { useDashboard } from "../DashboardContext";
import { payments } from "../data";
import { downloadCsv } from "../utils";

export default function PaymentsPage() {
  const { openPayment, openNewLink } = useDashboard();
  const [query, setQuery] = useState("");

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment flowing through your AirPay account."
        actions={
          <>
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
              Export CSV
            </button>
            <button
              onClick={openNewLink}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-d-accent-deep"
            >
              New payment link
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </>
        }
      />
      <PaymentsTable query={query} onSearch={setQuery} onRowClick={openPayment} />
    </>
  );
}
