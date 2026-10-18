"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../PageHeader";
import { orpcClient } from "@/lib/orpc/client";
import type { PublicIntent, PublicInvoiceDetail } from "@/lib/api-types";
import { Card, CardHeader } from "../ui/Card";
import SearchInput from "../ui/SearchInput";
import Segmented from "../ui/Segmented";
import StatusChip from "../ui/StatusChip";
import Skeleton from "../ui/Skeleton";
import ExportButton from "../ui/ExportButton";

interface ApiKeyRow {
  id: string;
  label: string;
  prefix: string;
  lastFour: string;
  revoked: boolean;
  createdAt: number;
}

interface WebhookRow {
  id: string;
  url: string;
  createdAt: number;
}

interface AuditEvent {
  id: string;
  title: string;
  actor: string;
  type: "Payments" | "Settings" | "Security";
  ts: number;
  time: string;
}

const filters = ["All", "Payments", "Settings", "Security"] as const;

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AuditLogPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [q, setQ] = useState("");

  const { data: intentsData, isLoading: l1 } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await orpcClient.payments.listByOrg({})) as PublicIntent[],
  });
  const { data: invoicesData, isLoading: l2 } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await orpcClient.invoices.list()) as PublicInvoiceDetail[],
  });
  const { data: keysData, isLoading: l3 } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: async () => (await orpcClient.apiKeys.list()) as ApiKeyRow[],
  });
  const { data: hooksData, isLoading: l4 } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => (await orpcClient.webhooks.list()) as WebhookRow[],
  });

  const loading = l1 || l2 || l3 || l4;

  const events = useMemo<AuditEvent[]>(() => {
    const out: AuditEvent[] = [];
    for (const p of intentsData ?? []) {
      out.push({
        id: `pay-${p.id}-${p.status}`,
        title: `Payment ${p.id} ${p.status}`,
        actor: p.payer ?? p.merchant,
        type: "Payments",
        ts: p.confirmedAt ?? p.createdAt,
        time: fmtTime(p.confirmedAt ?? p.createdAt),
      });
    }
    for (const inv of invoicesData ?? []) {
      out.push({
        id: `inv-${inv.id}-${inv.status}`,
        title: `Invoice ${inv.number} ${titleCase(inv.status)}`,
        actor: inv.customerName || inv.customerEmail || "—",
        type: "Payments",
        ts: inv.paidAt ?? inv.sentAt ?? inv.createdAt,
        time: fmtTime(inv.paidAt ?? inv.sentAt ?? inv.createdAt),
      });
    }
    for (const k of keysData ?? []) {
      out.push({
        id: `key-${k.id}-${k.revoked ? "revoked" : "created"}`,
        title: `API key ${k.label} ${k.revoked ? "revoked" : "created"}`,
        actor: `${k.prefix}_…${k.lastFour}`,
        type: "Security",
        ts: k.createdAt,
        time: fmtTime(k.createdAt),
      });
    }
    for (const w of hooksData ?? []) {
      out.push({
        id: `wh-${w.id}`,
        title: "Webhook endpoint added",
        actor: w.url,
        type: "Settings",
        ts: w.createdAt,
        time: fmtTime(w.createdAt),
      });
    }
    return out.sort((a, b) => b.ts - a.ts);
  }, [intentsData, invoicesData, keysData, hooksData]);

  const query = q.trim().toLowerCase();
  const rows = events.filter(
    (e) =>
      (filter === "All" || e.type === filter) &&
      (!query || e.title.toLowerCase().includes(query) || e.actor.toLowerCase().includes(query))
  );

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Activity derived from your workspace records."
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
          description={loading ? "Loading…" : `${rows.length} of ${events.length} events`}
          actions={
            <>
              <SearchInput value={q} onChange={setQ} placeholder="Search events…" ariaLabel="Search events" />
              <Segmented options={filters} value={filter} onChange={setFilter} />
            </>
          }
        />
        <div className="flex flex-col">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-d-edge-soft/60 px-5 py-3.5 last:border-0"
              >
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="hidden h-3 w-24 sm:block" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))
          ) : (
            <>
              {rows.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-4 border-b border-d-edge-soft/60 px-5 py-3.5 hover:bg-d-raised/40 last:border-0"
                >
                  <StatusChip status={e.type} />
                  <p className="min-w-0 flex-1 truncate text-[13px] text-d-ink">{e.title}</p>
                  <span className="hidden shrink-0 text-[12px] text-d-muted sm:block">{e.actor}</span>
                  <span className="shrink-0 text-[12px] text-d-muted">{e.time}</span>
                </div>
              ))}
              {rows.length === 0 && (
                <p className="px-5 py-12 text-center text-[13px] text-d-muted">
                  {events.length === 0
                    ? "No activity yet. Actions will be recorded here as your workspace is used."
                    : "No events match your search."}
                </p>
              )}
            </>
          )}
        </div>
      </Card>
    </>
  );
}
