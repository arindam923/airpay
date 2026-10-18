"use client";

import { useQuery } from "@tanstack/react-query";
import PageHeader from "../PageHeader";
import Card from "../ui/Card";
import DataTable, { type Column } from "../ui/DataTable";
import StatusChip from "../ui/StatusChip";
import CopyButton from "../ui/CopyButton";
import { useDashboard } from "../DashboardContext";
import { orpcClient } from "@/lib/orpc/client";
import type { InvoiceStatus, PublicInvoiceDetail } from "@/lib/api-types";

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  paid: "Paid",
  void: "Void",
  overdue: "Overdue",
};

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(ms: number | null): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function invoiceUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/i/${slug}`;
}

export default function InvoicesPage() {
  const { openNewInvoice, openInvoice } = useDashboard();

  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await orpcClient.invoices.list()) as PublicInvoiceDetail[],
  });

  const invoices = data ?? [];

  const columns: Column<PublicInvoiceDetail>[] = [
    {
      header: "Invoice",
      cell: (row) => (
        <div>
          <p className="font-mono text-[13px] font-medium text-d-ink">{row.number}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-d-muted">{row.merchant}</p>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] text-d-ink">{row.customerName}</p>
          {row.customerEmail && (
            <p className="mt-0.5 truncate text-[11.5px] text-d-muted">{row.customerEmail}</p>
          )}
        </div>
      ),
    },
    {
      header: "Total",
      align: "right",
      cell: (row) => <span className="font-mono text-[13px] text-d-ink">{money(row.totalUsd)}</span>,
    },
    { header: "Status", cell: (row) => <StatusChip status={STATUS_LABEL[row.status]} /> },
    {
      header: "Due",
      align: "right",
      cell: (row) => <span className="text-[12.5px] text-d-muted">{formatDate(row.dueAt)}</span>,
    },
    {
      header: "",
      align: "right",
      cell: (row) => (
        <span onClick={(e) => e.stopPropagation()}>
          <CopyButton text={invoiceUrl(row.slug)} ariaLabel="Copy invoice link" copiedChildren="Copied!">
            Copy link
          </CopyButton>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Bill your customers and share a hosted payment page."
        actions={
          <button
            onClick={openNewInvoice}
            className="d-glow flex h-9 items-center gap-1.5 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
          >
            New invoice
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        }
      />

      <Card>
        <DataTable
          items={invoices}
          columns={columns}
          minWidth="min-w-[760px]"
          loading={isLoading}
          onRowClick={(row) => openInvoice(row.id)}
          emptyState={
            <div className="py-2">
              <p className="text-[13px] font-medium text-d-ink">No invoices yet</p>
              <p className="mt-1 text-[12.5px] text-d-muted">
                Create an invoice, then share its link with your customer.
              </p>
            </div>
          }
        />
      </Card>
    </>
  );
}
