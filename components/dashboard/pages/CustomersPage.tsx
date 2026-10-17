"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "../PageHeader";
import { useDashboard } from "../DashboardContext";
import { deriveCustomers, payments } from "../data";
import { Card, CardHeader } from "../ui/Card";
import DataTable from "../ui/DataTable";
import SearchInput from "../ui/SearchInput";
import Avatar from "../ui/Avatar";
import KvList from "../ui/KvList";
import ExportButton from "../ui/ExportButton";

export default function CustomersPage() {
  const { customerQuery, setCustomerQuery } = useDashboard();
  const [selected, setSelected] = useState<string | null>(null);
  const customers = useMemo(() => deriveCustomers(payments), []);

  useEffect(() => () => setCustomerQuery(""), [setCustomerQuery]);

  const q = customerQuery.trim().toLowerCase();
  const rows = customers.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  );

  const active = selected ? customers.find((c) => c.email === selected) ?? null : null;
  const activePayments = active
    ? payments.filter((p) => p.email === active.email)
    : [];

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone who has paid you, aggregated across chains."
        actions={
          <ExportButton
            filename="customers.csv"
            title="CSV"
            rows={[
              ["Customer", "Email", "Total", "Payments", "First seen", "Last seen"],
              ...rows.map((c) => [
                c.name,
                c.email,
                `$${c.total.toLocaleString("en-US")}`,
                c.count,
                c.since,
                c.lastSeen,
              ]),
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="All customers"
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
          <DataTable
            items={rows.map((c) => ({ ...c, id: c.email }))}
            minWidth="min-w-[600px]"
            onRowClick={(c) => setSelected(selected === c.email ? null : c.email)}
            isSelected={(c) => selected === c.email}
            emptyState={`No customers match “${customerQuery}”.`}
            columns={[
              {
                header: "Customer",
                cell: (c) => (
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.name} size={28} />
                    <div>
                      <p className="text-[13px] leading-tight text-d-ink">{c.name}</p>
                      <p className="text-[11px] leading-tight text-d-muted/70">{c.email}</p>
                    </div>
                  </div>
                ),
              },
              {
                header: "Total",
                cell: (c) => (
                  <span className="font-mono text-[13px] font-medium text-d-ink">
                    ${c.total.toLocaleString("en-US")}
                  </span>
                ),
              },
              {
                header: "Payments",
                cell: (c) => <span className="text-[13px] text-d-muted">{c.count}</span>,
              },
              {
                header: "Last seen",
                align: "right",
                cell: (c) => <span className="text-[12px] text-d-muted">{c.lastSeen}</span>,
              },
            ]}
          />
        </Card>

        <Card className="h-fit">
          <div className="p-5">
            {active ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar name={active.name} solid size={44} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-d-ink">{active.name}</p>
                    <p className="truncate text-[12px] text-d-muted">{active.email}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <KvList
                    items={[
                      ["Lifetime value", `$${active.total.toLocaleString("en-US")}`],
                      ["Payments", String(active.count)],
                      ["Customer since", active.since],
                      ["Last payment", active.lastSeen],
                    ]}
                  />
                </div>
                <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                  Recent payments
                </p>
                <div className="flex flex-col gap-2">
                  {activePayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-d-edge bg-d-raised/60 px-3.5 py-2.5 transition-colors hover:bg-d-raised"
                    >
                      <span className="font-mono text-[12px] text-d-ink">{p.id}</span>
                      <span className="font-mono text-[12.5px] text-d-muted">
                        {p.amount}
                      </span>
                    </div>
                  ))}
                </div>
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
