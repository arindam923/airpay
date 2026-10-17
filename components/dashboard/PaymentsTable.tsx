"use client";

import { useState } from "react";
import { coinColors, payments, type Payment, type PaymentStatus } from "./data";

const filters: ("All" | PaymentStatus)[] = ["All", "Confirmed", "Pending", "Failed"];

const statusStyle: Record<PaymentStatus, string> = {
  Confirmed: "bg-d-success/10 text-d-success",
  Pending: "bg-d-pending/10 text-d-pending",
  Failed: "bg-d-failed/10 text-d-failed",
};

const statusDot: Record<PaymentStatus, string> = {
  Confirmed: "bg-d-success",
  Pending: "bg-d-pending",
  Failed: "bg-d-failed",
};

export default function PaymentsTable({
  query = "",
  onSearch,
  onRowClick,
}: {
  query?: string;
  onSearch?: (q: string) => void;
  onRowClick?: (p: Payment) => void;
}) {
  const [filter, setFilter] = useState<"All" | PaymentStatus>("All");

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
    <section className="rounded-xl border border-d-edge bg-d-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-d-edge-soft px-5 py-4">
        <div>
          <h2 className="text-[14px] font-medium text-d-ink">Recent payments</h2>
          <p className="mt-0.5 text-[12px] text-d-muted">
            {rows.length} of {payments.length} payments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onSearch && (
            <div className="relative">
              <svg
                width="12"
                height="12"
                viewBox="0 0 14 14"
                fill="none"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-d-muted"
              >
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Filter payments…"
                aria-label="Filter payments"
                className="h-8 w-[170px] rounded-lg border border-d-edge bg-d-raised pl-8 pr-3 text-[12.5px] text-d-ink placeholder:text-d-muted/70 focus:border-d-accent focus:outline-none"
              />
            </div>
          )}
          <div className="flex gap-1 rounded-lg border border-d-edge bg-d-raised p-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
                  filter === f ? "bg-d-ink text-d-bg" : "text-d-muted hover:text-d-ink"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-d-edge-soft text-[11px] font-medium uppercase tracking-[0.1em] text-d-muted/70">
              <th className="px-5 py-3 font-medium">Payment</th>
              <th className="px-5 py-3 font-medium">Customer</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Chain</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                onClick={() => onRowClick?.(p)}
                onKeyDown={(e) => e.key === "Enter" && onRowClick?.(p)}
                tabIndex={onRowClick ? 0 : -1}
                role={onRowClick ? "button" : undefined}
                className={`group border-b border-d-edge-soft/60 transition-colors last:border-0 hover:bg-d-raised/60 ${
                  onRowClick ? "cursor-pointer focus:outline-none focus:bg-d-raised" : ""
                }`}
              >
                <td className="px-5 py-3.5">
                  <span className="font-mono text-[12.5px] text-d-ink group-hover:text-d-accent">
                    {p.id}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet/20 text-[11px] font-semibold text-violet">
                      {p.customer.split(" ").map((n) => n[0]).join("")}
                    </span>
                    <div>
                      <p className="text-[13px] leading-tight text-d-ink">{p.customer}</p>
                      <p className="text-[11px] leading-tight text-d-muted/70">{p.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: coinColors[p.coin] }}
                    >
                      {p.coin[0]}
                    </span>
                    <span className="font-mono text-[13px] font-medium text-d-ink">
                      {p.amount}
                    </span>
                    <span className="text-[11px] text-d-muted">{p.coin}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="rounded-md border border-d-edge bg-d-raised px-2 py-1 text-[11.5px] text-d-muted">
                    {p.chain}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${statusStyle[p.status]}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot[p.status]} ${p.status === "Pending" ? "animate-pulse-dot" : ""}`} />
                    {p.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right text-[12px] text-d-muted">
                  {p.time}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-d-muted">
                  No payments match {query ? `“${query}”` : "this filter"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
