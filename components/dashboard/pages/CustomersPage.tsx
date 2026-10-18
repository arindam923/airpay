"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../PageHeader";
import { useDashboard } from "../DashboardContext";
import { orpcClient } from "@/lib/orpc/client";
import type { PublicIntent, PublicInvoiceDetail } from "@/lib/api-types";
import { Card, CardHeader } from "../ui/Card";
import DataTable, { type Column } from "../ui/DataTable";
import SearchInput from "../ui/SearchInput";
import Avatar from "../ui/Avatar";
import KvList from "../ui/KvList";
import StatusChip from "../ui/StatusChip";
import ExportButton from "../ui/ExportButton";
import { deriveCustomers, type CustomerRecord } from "../customers";

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function invoiceLabel(status: PublicInvoiceDetail["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function CustomersPage() {
  const { customerQuery, setCustomerQuery } = useDashboard();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: intentsData, isLoading: loadingIntents } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await orpcClient.payments.listByOrg({})) as PublicIntent[],
  });
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await orpcClient.invoices.list()) as PublicInvoiceDetail[],
  });

  const loading = loadingIntents || loadingInvoices;
  const intents = useMemo(() => intentsData ?? [], [intentsData]);
  const invoices = useMemo(() => invoicesData ?? [], [invoicesData]);
  const customers = useMemo(() => deriveCustomers(invoices, intents), [invoices, intents]);

  useEffect(() => () => setCustomerQuery(""), [setCustomerQuery]);

  const q = customerQuery.trim().toLowerCase();
  const rows = customers.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.wallet ?? "").toLowerCase().includes(q)
  );

  const active = selected ? customers.find((c) => c.id === selected) ?? null : null;

  const columns: Column<CustomerRecord>[] = [
    {
      header: "Customer",
      cell: (c) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={c.name} size={28} />
          <div className="min-w-0">
            <p className="truncate text-[13px] leading-tight text-d-ink">{c.name}</p>
            <p className="truncate text-[11px] leading-tight text-d-muted/70">
              {c.email ?? c.wallet ?? "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Source",
      cell: (c) => (
        <span className="rounded-md border border-d-edge bg-d-raised px-2 py-1 text-[11px] text-d-muted">
          {c.source === "invoice" ? "Invoice" : "Wallet"}
        </span>
      ),
    },
    {
      header: "Billed",
      align: "right",
      cell: (c) => (
        <span className="font-mono text-[13px] text-d-muted">{money(c.billedUsd)}</span>
      ),
    },
    {
      header: "Settled",
      align: "right",
      cell: (c) => (
        <span className="font-mono text-[13px] font-medium text-d-ink">{money(c.settledUsd)}</span>
      ),
    },
    {
      header: "Payments",
      align: "right",
      cell: (c) => <span className="text-[13px] text-d-muted">{c.payments}</span>,
    },
    {
      header: "Last seen",
      align: "right",
      cell: (c) => <span className="text-[12px] text-d-muted">{fmtDate(c.lastSeen)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who has been billed or paid you, aggregated across invoices and wallets."
        actions={
          <ExportButton
            filename="customers.csv"
            title="CSV"
            rows={[
              ["Customer", "Email", "Wallet", "Source", "Billed", "Settled", "Payments", "First seen", "Last seen"],
              ...rows.map((c) => [
                c.name,
                c.email ?? "",
                c.wallet ?? "",
                c.source,
                money(c.billedUsd),
                money(c.settledUsd),
                c.payments,
                fmtDate(c.firstSeen),
                fmtDate(c.lastSeen),
              ]),
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="All customers"
            description={loading ? "Loading…" : `${rows.length} of ${customers.length}`}
            actions={
              <SearchInput
                value={customerQuery}
                onChange={setCustomerQuery}
                placeholder="Search customers…"
                ariaLabel="Search customers"
                width="w-[190px]"
              />
            }
          />
          {loading ? (
            <DataTable items={[]} columns={columns} loading minWidth="min-w-[760px]" />
          ) : customers.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-[13px] font-medium text-d-ink">No customers yet</p>
              <p className="mx-auto mt-1 max-w-[36ch] text-[12.5px] text-d-muted">
                Customers appear here once an invoice is issued or a payment is made against one of
                your links.
              </p>
            </div>
          ) : (
            <DataTable
              items={rows}
              columns={columns}
              minWidth="min-w-[760px]"
              onRowClick={(c) => setSelected(selected === c.id ? null : c.id)}
              isSelected={(c) => selected === c.id}
              emptyState={`No customers match “${customerQuery}”.`}
            />
          )}
        </Card>

        <Card className="h-fit">
          <div className="p-5">
            {active ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar name={active.name} solid size={44} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-d-ink">{active.name}</p>
                    <p className="truncate text-[12px] text-d-muted">
                      {active.email ?? active.wallet ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <KvList
                    items={[
                      ["Billed", money(active.billedUsd)],
                      ["Settled", money(active.settledUsd)],
                      ["Payments", String(active.payments)],
                      ["Invoices", String(active.invoices.length)],
                      ["Customer since", fmtDate(active.firstSeen)],
                      ["Last activity", fmtDate(active.lastSeen)],
                    ]}
                  />
                </div>

                <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                  Payments
                </p>
                <div className="flex flex-col gap-2">
                  {active.intents.length === 0 ? (
                    <p className="text-[12.5px] text-d-muted">No payments recorded yet.</p>
                  ) : (
                    active.intents.slice(0, 6).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-d-edge bg-d-raised/60 px-3.5 py-2.5"
                      >
                        <span className="min-w-0 truncate font-mono text-[12px] text-d-ink">{p.id}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-mono text-[12.5px] text-d-muted">
                            ${p.amountUsd.toFixed(2)}
                          </span>
                          <StatusChip
                            status={
                              p.status === "confirmed"
                                ? "Confirmed"
                                : p.status === "failed" || p.status === "expired"
                                  ? "Failed"
                                  : "Pending"
                            }
                          />
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {active.invoices.length > 0 && (
                  <>
                    <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                      Invoices
                    </p>
                    <div className="flex flex-col gap-2">
                      {active.invoices.slice(0, 6).map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-d-edge bg-d-raised/60 px-3.5 py-2.5"
                        >
                          <span className="min-w-0 truncate font-mono text-[12px] text-d-ink">
                            {inv.number}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="font-mono text-[12.5px] text-d-muted">
                              {money(inv.totalUsd)}
                            </span>
                            <StatusChip status={invoiceLabel(inv.status)} label={invoiceLabel(inv.status)} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="py-10 text-center">
                <p className="text-[13px] text-d-muted">Select a customer to see details.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
