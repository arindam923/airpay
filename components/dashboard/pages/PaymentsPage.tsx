"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";
import PaymentsTable from "../PaymentsTable";
import ExportButton from "../ui/ExportButton";
import { useDashboard } from "../DashboardContext";
import { payments } from "../data";

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
            <ExportButton
              filename="payments.csv"
              title="CSV"
              rows={[
                ["Payment", "Customer", "Email", "Amount", "Coin", "Chain", "Status", "Time"],
                ...payments.map((p) => [p.id, p.customer, p.email, p.amount, p.coin, p.chain, p.status, p.time]),
              ]}
            />
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
