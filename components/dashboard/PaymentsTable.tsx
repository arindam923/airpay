"use client";

import { useState } from "react";
import Avatar from "./ui/Avatar";
import { Card, CardHeader } from "./ui/Card";
import DataTable, { type Column } from "./ui/DataTable";
import SearchInput from "./ui/SearchInput";
import Segmented from "./ui/Segmented";
import StatusChip from "./ui/StatusChip";
import { coinColors, payments, type Payment, type PaymentStatus } from "./data";

type Filter = "All" | PaymentStatus;

const FILTERS = ["All", "Confirmed", "Pending", "Failed"] as const;

const columns: Column<Payment>[] = [
  {
    header: "Payment",
    cell: (p) => (
      <span className="font-mono text-[12.5px] text-d-ink group-hover:text-d-accent">{p.id}</span>
    ),
  },
  {
    header: "Customer",
    cell: (p) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={p.customer} size={28} />
        <div>
          <p className="text-[13px] leading-tight text-d-ink">{p.customer}</p>
          <p className="text-[11px] leading-tight text-d-muted/70">{p.email}</p>
        </div>
      </div>
    ),
  },
  {
    header: "Amount",
    cell: (p) => (
      <div className="flex items-center gap-2">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: coinColors[p.coin] }}
        >
          {p.coin[0]}
        </span>
        <span className="font-mono text-[13px] font-medium text-d-ink">{p.amount}</span>
        <span className="text-[11px] text-d-muted">{p.coin}</span>
      </div>
    ),
  },
  {
    header: "Chain",
    cell: (p) => (
      <span className="rounded-md border border-d-edge bg-d-raised px-2 py-1 text-[11.5px] text-d-muted">
        {p.chain}
      </span>
    ),
  },
  {
    header: "Status",
    cell: (p) => <StatusChip status={p.status} />,
  },
  {
    header: "Time",
    align: "right",
    cell: (p) => <span className="text-[12px] text-d-muted">{p.time}</span>,
  },
];

export default function PaymentsTable({
  query = "",
  onSearch,
  onRowClick,
}: {
  query?: string;
  onSearch?: (q: string) => void;
  onRowClick?: (p: Payment) => void;
}) {
  const [filter, setFilter] = useState<Filter>("All");

  const q = query.trim().toLowerCase();
  const rows = payments.filter((p) => {
    const matchesFilter = filter === "All" || p.status === filter;
    const matchesQuery =
      !q ||
      p.id.toLowerCase().includes(q) ||
      p.customer.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.coin.toLowerCase().includes(q) ||
      p.chain.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  return (
    <Card>
      <CardHeader
        title="Recent payments"
        description={`${rows.length} of ${payments.length} payments`}
        actions={
          <>
            {onSearch && (
              <SearchInput
                value={query}
                onChange={onSearch}
                placeholder="Filter payments…"
                ariaLabel="Filter payments"
              />
            )}
            <Segmented options={FILTERS} value={filter} onChange={setFilter} />
          </>
        }
      />
      <DataTable
        items={rows}
        columns={columns}
        minWidth="min-w-[720px]"
        onRowClick={onRowClick}
        emptyState={<>No payments match {query ? `“${query}”` : "this filter"}.</>}
      />
    </Card>
  );
}
