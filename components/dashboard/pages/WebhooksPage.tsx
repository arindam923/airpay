"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";
import { initialDeliveries, webhookEndpoints } from "../data";
import { Card, CardHeader } from "../ui/Card";
import DataTable from "../ui/DataTable";
import StatusChip from "../ui/StatusChip";
import CopyButton from "../ui/CopyButton";
import Toggle from "../ui/Toggle";

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState(webhookEndpoints);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");

  const toggle = (id: string) =>
    setEndpoints((prev) =>
      prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e))
    );

  const retry = (id: string) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "Delivered", code: 200, time: "just now" } : d))
    );
  };

  const addEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setEndpoints((prev) => [
      ...prev,
      {
        id: `wh_live_${prev.length + 1}`,
        url: url.trim(),
        events: ["payment.confirmed"],
        active: true,
        successRate: "—",
      },
    ]);
    setUrl("");
    setShowForm(false);
  };

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

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={addEndpoint} className="flex flex-wrap items-center gap-3 p-4">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.yourapp.com/webhooks/airpay"
              type="url"
              required
              className="h-10 min-w-[260px] flex-1 rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none"
            />
            <button
              type="submit"
              className="d-glow h-10 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
            >
              Create endpoint
            </button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Endpoints" description={`${endpoints.length} configured`} />
          <div className="flex flex-col">
            {endpoints.map((ep) => (
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
                      {ep.events.map((ev) => (
                        <span key={ev} className="rounded-md border border-d-edge bg-d-raised px-2 py-0.5 font-mono text-[10.5px] text-d-muted">
                          {ev}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11.5px] text-d-muted">
                      Success rate {ep.successRate}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CopyButton text={ep.url} ariaLabel={`Copy ${ep.url}`}>
                      Copy URL
                    </CopyButton>
                    <Toggle
                      on={ep.active}
                      onChange={() => toggle(ep.id)}
                      label={ep.active ? "Pause endpoint" : "Activate endpoint"}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent deliveries" description="Last 24 hours" />
          <DataTable
            items={deliveries}
            minWidth="min-w-[480px]"
            columns={[
              {
                header: "Event",
                cell: (d) => (
                  <>
                    <p className="font-mono text-[12px] text-d-ink">{d.event}</p>
                    <p className="text-[11px] text-d-muted/70">HTTP {d.code ?? "—"}</p>
                  </>
                ),
              },
              {
                header: "Endpoint",
                cell: (d) => <span className="font-mono text-[11.5px] text-d-muted">{d.endpoint}</span>,
              },
              {
                header: "Status",
                cell: (d) => (
                  <div className="flex items-center gap-2">
                    <StatusChip status={d.status} />
                    {d.status === "Failed" && (
                      <button
                        onClick={() => retry(d.id)}
                        className="rounded-md border border-d-edge px-2 py-1 text-[11px] font-medium text-d-ink transition-colors hover:bg-d-raised"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ),
              },
              {
                header: "Time",
                align: "right",
                cell: (d) => <span className="text-[12px] text-d-muted">{d.time}</span>,
              },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
