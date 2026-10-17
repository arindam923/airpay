"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";
import { payouts } from "../data";
import { Card, CardHeader } from "../ui/Card";
import DataTable from "../ui/DataTable";
import StatusChip from "../ui/StatusChip";
import Segmented from "../ui/Segmented";
import ExportButton from "../ui/ExportButton";

const filterOptions = ["All", "Paid", "Processing", "Scheduled"] as const;

export default function PayoutsPage() {
  const [filter, setFilter] = useState<(typeof filterOptions)[number]>("All");
  const rows = payouts.filter((p) => filter === "All" || p.status === filter);

  const paid = payouts.filter((p) => p.status === "Paid").length;
  const scheduled = payouts.filter((p) => p.status === "Scheduled").length;

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Scheduled and completed settlements to your treasury wallets."
        actions={
          <ExportButton
            filename="payouts.csv"
            title="CSV"
            rows={[
              ["Payout", "Date", "Amount", "Destination", "Status"],
              ...payouts.map((p) => [p.id, p.date, p.amount, p.destination, p.status]),
            ]}
          />
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Paid this month", value: "$25,270.50", sub: `${paid} payouts` },
          { label: "Processing", value: "$6,380.00", sub: "arrives today" },
          { label: "Scheduled", value: "$18,210.00", sub: `${scheduled} upcoming` },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-d-edge d-card p-5">
            <p className="text-[12px] text-d-muted">{card.label}</p>
            <p className="mt-2 font-sans text-[24px] font-medium tracking-[-0.02em] text-d-ink">
              {card.value}
            </p>
            <p className="mt-1 text-[11.5px] text-d-muted/80">{card.sub}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader
          title="All payouts"
          actions={<Segmented options={filterOptions} value={filter} onChange={setFilter} />}
        />
        <DataTable
          items={rows}
          minWidth="min-w-[620px]"
          columns={[
            {
              header: "Payout",
              cell: (p) => <span className="font-mono text-[12.5px] text-d-ink">{p.id}</span>,
            },
            {
              header: "Date",
              cell: (p) => <span className="text-[13px] text-d-muted">{p.date}</span>,
            },
            {
              header: "Amount",
              cell: (p) => (
                <span className="font-mono text-[13px] font-medium text-d-ink">{p.amount}</span>
              ),
            },
            {
              header: "Destination",
              cell: (p) => <span className="font-mono text-[12px] text-d-muted">{p.destination}</span>,
            },
            {
              header: "Status",
              align: "right",
              cell: (p) => <StatusChip status={p.status} />,
            },
          ]}
        />
      </Card>
    </>
  );
}
