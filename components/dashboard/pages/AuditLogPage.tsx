"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";
import { auditEvents } from "../data";
import { Card, CardHeader } from "../ui/Card";
import SearchInput from "../ui/SearchInput";
import Segmented from "../ui/Segmented";
import StatusChip from "../ui/StatusChip";
import ExportButton from "../ui/ExportButton";

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
          <ExportButton
            filename="audit-log.csv"
            title="CSV"
            rows={[
              ["Event", "Actor", "Type", "Time"],
              ...rows.map((e) => [e.title, e.actor, e.type, e.time]),
            ]}
          />
        }
      />

      <Card>
        <CardHeader
          title="Activity"
          actions={
            <>
              <SearchInput value={q} onChange={setQ} placeholder="Search events…" ariaLabel="Search events" />
              <Segmented options={filters} value={filter} onChange={setFilter} />
            </>
          }
        />
        <div className="flex flex-col">
          {rows.map((e) => (
            <div key={e.id} className="flex items-center gap-4 border-b border-d-edge-soft/60 px-5 py-3.5 hover:bg-d-raised/40 last:border-0">
              <StatusChip status={e.type} />
              <p className="min-w-0 flex-1 truncate text-[13px] text-d-ink">{e.title}</p>
              <span className="hidden shrink-0 text-[12px] text-d-muted sm:block">{e.actor}</span>
              <span className="shrink-0 text-[12px] text-d-muted">{e.time}</span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="px-5 py-12 text-center text-[13px] text-d-muted">No events match your search.</p>
          )}
        </div>
      </Card>
    </>
  );
}
