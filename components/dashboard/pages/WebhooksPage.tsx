"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "../PageHeader";
import { orpcClient } from "@/lib/orpc/client";
import { Card, CardHeader } from "../ui/Card";
import CopyButton from "../ui/CopyButton";
import Skeleton from "../ui/Skeleton";
import Toggle from "../ui/Toggle";
import StatusChip from "../ui/StatusChip";
import { WEBHOOK_EVENT_OPTIONS, WILDCARD } from "@/lib/webhook-events";

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  environment: string;
  createdAt: number;
}

interface DeliveryRow {
  id: string;
  webhookId: string;
  url: string;
  eventType: string;
  status: "pending" | "success" | "failed" | "exhausted";
  attempts: number;
  responseStatus: number | null;
  error: string | null;
  durationMs: number | null;
  createdAt: number;
  deliveredAt: number | null;
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtRelative(ms: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const DELIVERY_CHIP: Record<DeliveryRow["status"], { status: string; label: string }> = {
  success: { status: "Delivered", label: "Delivered" },
  pending: { status: "Retrying", label: "Pending" },
  failed: { status: "Failed", label: "Failed" },
  exhausted: { status: "Neutral", label: "Exhausted" },
};

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["payment.confirmed"]);
  const [secret, setSecret] = useState<{ value: string; label: string } | null>(null);
  const [endpointFilter, setEndpointFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => (await orpcClient.webhooks.list()) as WebhookRow[],
  });
  const endpoints = data ?? [];

  const { data: deliveriesData, isLoading: deliveriesLoading } = useQuery({
    queryKey: ["webhook-deliveries", endpointFilter, statusFilter],
    queryFn: async () =>
      (await orpcClient.webhooks.deliveries({
        webhookId: endpointFilter === "all" ? undefined : endpointFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 50,
      })) as DeliveryRow[],
  });
  const deliveries = deliveriesData ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["webhooks"] });
  const invalidateDeliveries = () =>
    qc.invalidateQueries({ queryKey: ["webhook-deliveries"] });

  const createMutation = useMutation({
    mutationFn: async () =>
      (await orpcClient.webhooks.create({ url: url.trim(), events })) as {
        id: string;
        secret: string;
      },
    onSuccess: (res) => {
      setSecret({ value: res.secret, label: "Signing secret created" });
      setUrl("");
      setEvents(["payment.confirmed"]);
      setShowForm(false);
      invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (input: { id: string; active: boolean }) =>
      orpcClient.webhooks.toggle(input),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => orpcClient.webhooks.remove({ id }),
    onSuccess: () => {
      invalidate();
      invalidateDeliveries();
    },
  });

  const rotateMutation = useMutation({
    mutationFn: async (id: string) =>
      (await orpcClient.webhooks.rotate({ id })) as { id: string; secret: string },
    onSuccess: (res) => {
      setSecret({ value: res.secret, label: "Secret rotated" });
      invalidate();
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => orpcClient.webhooks.test({ id }),
    onSuccess: () => setTimeout(invalidateDeliveries, 800),
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => orpcClient.webhooks.resend({ id }),
    onSuccess: () => setTimeout(invalidateDeliveries, 800),
  });

  const toggleEvent = (ev: string) =>
    setEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || events.length === 0) return;
    createMutation.mutate();
  };

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, typeof WEBHOOK_EVENT_OPTIONS>();
    for (const opt of WEBHOOK_EVENT_OPTIONS) {
      const list = groups.get(opt.group) ?? [];
      list.push(opt);
      groups.set(opt.group, list);
    }
    return Array.from(groups.entries());
  }, []);

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="Real-time event delivery to your backend endpoints."
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="d-glow flex h-9 items-center gap-1.5 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
          >
            {showForm ? "Cancel" : "Add endpoint"}
            {!showForm && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        }
      />

      {secret && (
        <Card className="mb-4">
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-d-ink">{secret.label}</p>
              <p className="mt-1 text-[12.5px] text-d-muted">
                Store this now — it won&apos;t be shown again. Use it to verify webhook signatures.
              </p>
              <p className="mt-2 truncate font-mono text-[12.5px] text-d-accent">{secret.value}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <CopyButton text={secret.value} ariaLabel="Copy signing secret">
                Copy
              </CopyButton>
              <button
                onClick={() => setSecret(null)}
                className="rounded-md border border-d-edge px-2 py-1 text-[11px] font-medium text-d-ink transition-colors hover:bg-d-raised"
              >
                Dismiss
              </button>
            </div>
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.yourapp.com/webhooks/airpay"
              type="url"
              required
              className="h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none"
            />
            <div className="flex flex-col gap-3">
              {groupedOptions.map(([group, options]) => (
                <div key={group}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                    {group}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt) => {
                      const on = events.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleEvent(opt.value)}
                          className={`rounded-md border px-2.5 py-1 text-[11.5px] transition-colors ${
                            on
                              ? "border-d-accent bg-d-accent/15 text-d-accent"
                              : "border-d-edge bg-d-raised text-d-muted hover:text-d-ink"
                          }`}
                          title={opt.value}
                        >
                          {opt.label}
                          {opt.value === WILDCARD && (
                            <span className="ml-1.5 font-mono text-[10px] opacity-70">*</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={createMutation.isPending || events.length === 0}
                className="d-glow h-10 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating…" : "Create endpoint"}
              </button>
              {createMutation.isError && (
                <span className="text-[12.5px] text-d-failed">
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : "Could not create endpoint."}
                </span>
              )}
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Endpoints"
            description={isLoading ? "Loading…" : `${endpoints.length} configured`}
          />
          <div className="flex flex-col">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border-b border-d-edge-soft/60 px-5 py-4 last:border-0">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="mt-3 h-5 w-32" />
                  <Skeleton className="mt-3 h-3 w-24" />
                </div>
              ))
            ) : endpoints.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-[13px] font-medium text-d-ink">No endpoints yet</p>
                <p className="mx-auto mt-1 max-w-[34ch] text-[12.5px] text-d-muted">
                  Add an endpoint to receive signed events when payments and invoices change state.
                </p>
              </div>
            ) : (
              endpoints.map((ep) => (
                <div key={ep.id} className="border-b border-d-edge-soft/60 px-5 py-4 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${ep.active ? "bg-d-success" : "bg-d-edge"}`}
                        />
                        <p className="truncate font-mono text-[12.5px] text-d-ink">{ep.url}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ep.events.length > 4 ? (
                          <span className="rounded-md border border-d-edge bg-d-raised px-2 py-0.5 font-mono text-[10.5px] text-d-muted">
                            {ep.events.includes(WILDCARD) ? "all events" : `${ep.events.length} events`}
                          </span>
                        ) : (
                          ep.events.map((ev) => (
                            <span
                              key={ev}
                              className="rounded-md border border-d-edge bg-d-raised px-2 py-0.5 font-mono text-[10.5px] text-d-muted"
                            >
                              {ev}
                            </span>
                          ))
                        )}
                      </div>
                      <p className="mt-2 text-[11.5px] text-d-muted">Added {fmtDate(ep.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Toggle
                        on={ep.active}
                        onChange={() => toggleMutation.mutate({ id: ep.id, active: !ep.active })}
                        label={ep.active ? "Pause endpoint" : "Activate endpoint"}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => testMutation.mutate(ep.id)}
                          disabled={testMutation.isPending}
                          className="rounded-md border border-d-edge px-2 py-1 text-[11px] font-medium text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink disabled:opacity-60"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => rotateMutation.mutate(ep.id)}
                          disabled={rotateMutation.isPending}
                          className="rounded-md border border-d-edge px-2 py-1 text-[11px] font-medium text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink disabled:opacity-60"
                        >
                          Rotate
                        </button>
                        <CopyButton text={ep.url} ariaLabel={`Copy ${ep.url}`}>
                          Copy
                        </CopyButton>
                        <button
                          onClick={() => removeMutation.mutate(ep.id)}
                          className="rounded-md border border-d-edge px-2 py-1 text-[11px] font-medium text-d-muted transition-colors hover:bg-d-raised hover:text-d-failed"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recent deliveries"
            description={deliveriesLoading ? "Loading…" : `${deliveries.length} shown`}
            actions={
              <div className="flex items-center gap-2">
                <select
                  value={endpointFilter}
                  onChange={(e) => setEndpointFilter(e.target.value)}
                  className="h-8 rounded-md border border-d-edge bg-d-raised px-2 text-[12px] text-d-ink focus:border-d-accent focus:outline-none"
                >
                  <option value="all">All endpoints</option>
                  {endpoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.url.replace(/^https?:\/\//, "").slice(0, 28)}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 rounded-md border border-d-edge bg-d-raised px-2 text-[12px] text-d-ink focus:border-d-accent focus:outline-none"
                >
                  <option value="all">All statuses</option>
                  <option value="success">Delivered</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="exhausted">Exhausted</option>
                </select>
              </div>
            }
          />
          <div className="flex flex-col">
            {deliveriesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border-b border-d-edge-soft/60 px-5 py-4 last:border-0">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="mt-3 h-3 w-3/4" />
                </div>
              ))
            ) : deliveries.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-[13px] font-medium text-d-ink">No deliveries yet</p>
                <p className="mx-auto mt-1 max-w-[38ch] text-[12.5px] text-d-muted">
                  Deliveries appear here as events fire. Use “Test” on an endpoint to send a sample.
                </p>
              </div>
            ) : (
              deliveries.map((d) => {
                const chip = DELIVERY_CHIP[d.status];
                return (
                  <div key={d.id} className="border-b border-d-edge-soft/60 px-5 py-3.5 last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusChip status={chip.status} label={chip.label} />
                          <span className="truncate font-mono text-[11.5px] text-d-ink">
                            {d.eventType}
                          </span>
                        </div>
                        <p className="mt-1.5 truncate font-mono text-[11px] text-d-muted">
                          {d.url.replace(/^https?:\/\//, "")}
                        </p>
                        <p className="mt-1 text-[11px] text-d-muted/80">
                          {fmtRelative(d.createdAt)}
                          {d.responseStatus != null && ` · HTTP ${d.responseStatus}`}
                          {d.durationMs != null && ` · ${d.durationMs}ms`}
                          {d.attempts > 1 && ` · ${d.attempts} attempts`}
                          {d.error && !d.responseStatus ? ` · ${d.error}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => resendMutation.mutate(d.id)}
                        disabled={resendMutation.isPending}
                        className="shrink-0 rounded-md border border-d-edge px-2 py-1 text-[11px] font-medium text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink disabled:opacity-60"
                      >
                        Resend
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <p className="mt-4 text-[12px] leading-[1.5] text-d-muted">
        Requests are signed with HMAC-SHA256. Verify the{" "}
        <code className="font-mono text-d-ink">airpay-signature</code> header as{" "}
        <code className="font-mono text-d-ink">t=&lt;timestamp&gt;,v1=&lt;hmac(t.body)&gt;</code>{" "}
        using your signing secret, and treat deliveries as at-least-once.
      </p>
    </>
  );
}
