"use client";

import { useState } from "react";
import Avatar from "./ui/Avatar";
import { Card, CardHeader } from "./ui/Card";
import DataTable, { type Column } from "./ui/DataTable";
import SearchInput from "./ui/SearchInput";
import Segmented from "./ui/Segmented";
import StatusChip from "./ui/StatusChip";
import { coinColor, type Payment, type PaymentStatus } from "./data";
import { shortWallet } from "./utils";
import { feeUsd, netUsd } from "@/lib/fees";

type Filter = "All" | PaymentStatus;

const FILTERS = ["All", "Confirmed", "Pending", "Failed"] as const;

const columns: Column<Payment>[] = [
  {
    header: "Transaction",
    cell: (p) => (
      <span className="font-mono text-[12.5px] text-d-ink group-hover:text-d-accent">{p.id}</span>
    ),
  },
  {
    header: "Payer",
    cell: (p) => (
      <div className="flex items-center gap-2.5">
        <Avatar name={p.payer ?? p.merchant} size={28} />
        <div className="min-w-0">
          <p className="truncate text-[13px] leading-tight text-d-ink">
            {p.payer ? shortWallet(p.payer) : "Awaiting payment"}
          </p>
          <p className="truncate text-[11px] leading-tight text-d-muted/70">{p.merchant}</p>
        </div>
      </div>
    ),
  },
  {
    header: "Gross",
    align: "right",
    cell: (p) => (
      <div className="flex items-center justify-end gap-2">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: coinColor(p.coin) }}
        >
          {p.coin[0]}
        </span>
        <span className="font-mono text-[13px] font-medium text-d-ink">{p.amount}</span>
      </div>
    ),
  },
  {
    header: "Fee",
    align: "right",
    cell: (p) => (
      <span className="font-mono text-[12.5px] text-d-muted">
        -${(p.feeUsd ?? feeUsd(p.amountUsd, p.feeBps)).toFixed(2)}
      </span>
    ),
  },
  {
    header: "Net",
    align: "right",
    cell: (p) => (
      <span className="font-mono text-[13px] font-semibold text-d-success">
        ${(p.netUsd ?? netUsd(p.amountUsd, p.feeBps)).toFixed(2)}
      </span>
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
    header: "Tx hash",
    cell: (p) => (
      <span className="font-mono text-[11.5px] text-d-muted">
        {p.txHash ? `${p.txHash.slice(0, 10)}…${p.txHash.slice(-6)}` : "—"}
      </span>
    ),
  },
  {
    header: "Confirmations",
    align: "right",
    cell: (p) => (
      <span className="font-mono text-[12px] text-d-muted">
        {p.confirmations}/{p.requiredConfirmations}
      </span>
    ),
  },
  {
    header: "Time",
    align: "right",
    cell: (p) => <span className="text-[12px] text-d-muted">{p.time}</span>,
  },
];

export default function TransactionsTable({
  query = "",
  onSearch,
  onRowClick,
  items,
  loading = false,
}: {
  query?: string;
  onSearch?: (q: string) => void;
  onRowClick?: (p: Payment) => void;
  items: Payment[];
  loading?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("All");

  const q = query.trim().toLowerCase();
  const source = items;
  const rows = source.filter((p) => {
    const matchesFilter = filter === "All" || p.status === filter;
    const matchesQuery =
      !q ||
      p.id.toLowerCase().includes(q) ||
      (p.payer ?? "").toLowerCase().includes(q) ||
      p.merchant.toLowerCase().includes(q) ||
      p.coin.toLowerCase().includes(q) ||
      p.chain.toLowerCase().includes(q) ||
      (p.txHash ?? "").toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  return (
    <Card>
      <CardHeader
        title="All transactions"
        description={loading ? "Loading…" : `${rows.length} of ${source.length} transactions`}
        actions={
          <>
            {onSearch && (
              <SearchInput
                value={query}
                onChange={onSearch}
                placeholder="Filter transactions…"
                ariaLabel="Filter transactions"
              />
            )}
            <Segmented options={FILTERS} value={filter} onChange={setFilter} />
          </>
        }
      />
      <DataTable
        items={rows}
        columns={columns}
        minWidth="min-w-[1180px]"
        loading={loading}
        onRowClick={onRowClick}
        emptyState={
          source.length === 0 && !q
            ? "No transactions yet. They'll appear here once a payment is confirmed."
            : <>No transactions match {query ? `“${query}”` : "this filter"}.</>
        }
      />
    </Card>
  );
}
