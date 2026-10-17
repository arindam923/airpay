"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";
import { payouts } from "../data";
import { downloadCsv } from "../utils";

const statusStyle: Record<string, string> = {
  Paid: "bg-d-success/10 text-d-success",
  Processing: "bg-d-pending/10 text-d-pending",
  Scheduled: "bg-d-accent/10 text-d-accent",
};

const statusDot: Record<string, string> = {
  Paid: "bg-d-success",
  Processing: "bg-d-pending",
  Scheduled: "bg-d-accent",
};

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
          <button
            onClick={() =>
              downloadCsv("payouts.csv", [
                ["Payout", "Date", "Amount", "Destination", "Status"],
                ...payouts.map((p) => [p.id, p.date, p.amount, p.destination, p.status]),
              ])
            }
            className="flex h-9 items-center gap-2 rounded-lg border border-d-edge bg-d-panel px-3.5 text-[12.5px] font-medium text-d-ink transition-colors hover:bg-d-raised"
          >
            Export CSV
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Paid this month", value: "$25,270.50", sub: `${paid} payouts` },
          { label: "Processing", value: "$6,380.00", sub: "arrives today" },
          { label: "Scheduled", value: "$18,210.00", sub: `${scheduled} upcoming` },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-d-edge bg-d-panel p-5">
            <p className="text-[12px] text-d-muted">{card.label}</p>
            <p className="mt-2 font-sans text-[24px] font-medium tracking-[-0.02em] text-d-ink">
              {card.value}
            </p>
            <p className="mt-1 text-[11.5px] text-d-muted/80">{card.sub}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-d-edge bg-d-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-d-edge-soft px-5 py-4">
          <h2 className="text-[14px] font-medium text-d-ink">All payouts</h2>
          <div className="flex gap-1 rounded-lg border border-d-edge bg-d-raised p-1">
            {filterOptions.map((f) => (
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead>
              <tr className="border-b border-d-edge-soft text-[11px] font-medium uppercase tracking-[0.1em] text-d-muted/70">
                <th className="px-5 py-3 font-medium">Payout</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Destination</th>
                <th className="px-5 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-d-edge-soft/60 last:border-0 hover:bg-d-raised/60">
                  <td className="px-5 py-3.5 font-mono text-[12.5px] text-d-ink">{p.id}</td>
                  <td className="px-5 py-3.5 text-[13px] text-d-muted">{p.date}</td>
                  <td className="px-5 py-3.5 font-mono text-[13px] font-medium text-d-ink">
                    {p.amount}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-d-muted">{p.destination}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${statusStyle[p.status]}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusDot[p.status]} ${
                          p.status === "Processing" ? "animate-pulse-dot" : ""
                        }`}
                      />
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
