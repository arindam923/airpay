"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "../PageHeader";
import { useDashboard } from "../DashboardContext";
import { deriveCustomers, payments } from "../data";
import { downloadCsv } from "../utils";

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
          <button
            onClick={() =>
              downloadCsv("customers.csv", [
                ["Customer", "Email", "Total", "Payments", "First seen", "Last seen"],
                ...rows.map((c) => [c.name, c.email, `$${c.total.toLocaleString("en-US")}`, c.count, c.since, c.lastSeen]),
              ])
            }
            className="flex h-9 items-center gap-2 rounded-lg border border-d-edge bg-d-panel px-3.5 text-[12.5px] font-medium text-d-ink transition-colors hover:bg-d-raised"
          >
            Export CSV
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-d-edge bg-d-panel lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-d-edge-soft px-5 py-4">
            <h2 className="text-[14px] font-medium text-d-ink">All customers</h2>
            <div className="relative">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-d-muted">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="Search customers…"
                aria-label="Search customers"
                className="h-8 w-[190px] rounded-lg border border-d-edge bg-d-raised pl-8 pr-3 text-[12.5px] text-d-ink placeholder:text-d-muted/70 focus:border-d-accent focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-d-edge-soft text-[11px] font-medium uppercase tracking-[0.1em] text-d-muted/70">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Payments</th>
                  <th className="px-5 py-3 text-right font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.email}
                    onClick={() => setSelected(selected === c.email ? null : c.email)}
                    className={`cursor-pointer border-b border-d-edge-soft/60 transition-colors last:border-0 hover:bg-d-raised/60 ${
                      selected === c.email ? "bg-d-raised" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet/20 text-[11px] font-semibold text-violet">
                          {c.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                        <div>
                          <p className="text-[13px] leading-tight text-d-ink">{c.name}</p>
                          <p className="text-[11px] leading-tight text-d-muted/70">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[13px] font-medium text-d-ink">
                      ${c.total.toLocaleString("en-US")}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-d-muted">{c.count}</td>
                    <td className="px-5 py-3.5 text-right text-[12px] text-d-muted">{c.lastSeen}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-d-muted">
                      No customers match “{customerQuery}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-d-edge bg-d-panel p-5">
          {active ? (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet text-[14px] font-semibold text-cream">
                  {active.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-d-ink">{active.name}</p>
                  <p className="truncate text-[12px] text-d-muted">{active.email}</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-d-edge bg-d-raised">
                {[
                  ["Lifetime value", `$${active.total.toLocaleString("en-US")}`],
                  ["Payments", String(active.count)],
                  ["Customer since", active.since],
                  ["Last payment", active.lastSeen],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-d-edge-soft px-4 py-2.5 text-[13px] last:border-0">
                    <span className="text-d-muted">{k}</span>
                    <span className="text-d-ink">{v}</span>
                  </div>
                ))}
              </div>
              <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                Recent payments
              </p>
              <div className="flex flex-col gap-2">
                {activePayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-d-edge bg-d-raised px-3.5 py-2.5">
                    <span className="font-mono text-[12px] text-d-ink">{p.id}</span>
                    <span className="font-mono text-[12.5px] text-d-muted">{p.amount}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-10 text-center">
              <p className="text-[13px] text-d-muted">Select a customer to see details.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
