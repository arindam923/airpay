"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";
import { auditEvents } from "../data";
import { downloadCsv } from "../utils";

const typeStyle: Record<string, string> = {
  Payments: "bg-d-success/10 text-d-success",
  Settings: "bg-d-accent/10 text-d-accent",
  Security: "bg-violet/15 text-violet",
};

const filters = ["All", "Payments", "Settings", "Security"] as const;

export default function AuditLogPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const rows = auditEvents.filter(
    (e) =>
      (filter === "All" || e.type === filter) &&
      (!query || e.title.toLowerCase().includes(query) || e.actor.toLowerCase().includes(query))
  );

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Immutable record of every action in this workspace."
        actions={
          <button
            onClick={() =>
              downloadCsv("audit-log.csv", [
                ["Event", "Actor", "Type", "Time"],
                ...rows.map((e) => [e.title, e.actor, e.type, e.time]),
              ])
            }
            className="flex h-9 items-center gap-2 rounded-lg border border-d-edge bg-d-panel px-3.5 text-[12.5px] font-medium text-d-ink transition-colors hover:bg-d-raised"
          >
            Export CSV
          </button>
        }
      />

      <section className="rounded-xl border border-d-edge bg-d-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-d-edge-soft px-5 py-4">
          <h2 className="text-[14px] font-medium text-d-ink">Activity</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-d-muted">
                <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search events…"
                aria-label="Search events"
                className="h-8 w-[170px] rounded-lg border border-d-edge bg-d-raised pl-8 pr-3 text-[12.5px] text-d-ink placeholder:text-d-muted/70 focus:border-d-accent focus:outline-none"
              />
            </div>
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
        <div className="flex flex-col">
          {rows.map((e) => (
            <div key={e.id} className="flex items-center gap-4 border-b border-d-edge-soft/60 px-5 py-3.5 last:border-0 hover:bg-d-raised/40">
              <span className={`shrink-0 rounded-md px-2 py-1 text-[10.5px] font-medium ${typeStyle[e.type]}`}>
                {e.type}
              </span>
              <p className="min-w-0 flex-1 truncate text-[13px] text-d-ink">{e.title}</p>
              <span className="hidden shrink-0 text-[12px] text-d-muted sm:block">{e.actor}</span>
              <span className="shrink-0 text-[12px] text-d-muted">{e.time}</span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="px-5 py-12 text-center text-[13px] text-d-muted">No events match your search.</p>
          )}
        </div>
      </section>
    </>
  );
}
