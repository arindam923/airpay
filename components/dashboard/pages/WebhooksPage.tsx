"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";
import { initialDeliveries, webhookEndpoints, type Delivery } from "../data";
import { copyText } from "../utils";

const deliveryStyle: Record<Delivery["status"], string> = {
  Delivered: "bg-d-success/10 text-d-success",
  Failed: "bg-d-failed/10 text-d-failed",
  Retrying: "bg-d-pending/10 text-d-pending",
};

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState(webhookEndpoints);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
            className="flex h-9 items-center gap-1.5 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-d-accent-deep"
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
        <form onSubmit={addEndpoint} className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-d-edge bg-d-panel p-4">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.yourapp.com/webhooks/airpay"
            type="url"
            required
            className="h-10 min-w-[260px] flex-1 rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none"
          />
          <button type="submit" className="h-10 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-d-accent-deep">
            Create endpoint
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-d-edge bg-d-panel">
          <div className="border-b border-d-edge-soft px-5 py-4">
            <h2 className="text-[14px] font-medium text-d-ink">Endpoints</h2>
            <p className="mt-0.5 text-[12px] text-d-muted">{endpoints.length} configured</p>
          </div>
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
                    <button
                      onClick={async () => {
                        if (await copyText(ep.url)) {
                          setCopiedId(ep.id);
                          setTimeout(() => setCopiedId(null), 1500);
                        }
                      }}
                      className={`rounded-md border border-d-edge px-2.5 py-1.5 text-[11.5px] font-medium transition-colors ${
                        copiedId === ep.id ? "border-d-success text-d-success" : "text-d-muted hover:text-d-ink"
                      }`}
                    >
                      {copiedId === ep.id ? "Copied" : "Copy URL"}
                    </button>
                    <button
                      onClick={() => toggle(ep.id)}
                      role="switch"
                      aria-checked={ep.active}
                      aria-label={ep.active ? "Pause endpoint" : "Activate endpoint"}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        ep.active ? "bg-d-success" : "bg-d-edge"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          ep.active ? "translate-x-[18px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-d-edge bg-d-panel">
          <div className="border-b border-d-edge-soft px-5 py-4">
            <h2 className="text-[14px] font-medium text-d-ink">Recent deliveries</h2>
            <p className="mt-0.5 text-[12px] text-d-muted">Last 24 hours</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-d-edge-soft text-[11px] font-medium uppercase tracking-[0.1em] text-d-muted/70">
                  <th className="px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">Endpoint</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-b border-d-edge-soft/60 last:border-0 hover:bg-d-raised/60">
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-[12px] text-d-ink">{d.event}</p>
                      <p className="text-[11px] text-d-muted/70">HTTP {d.code ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11.5px] text-d-muted">{d.endpoint}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${deliveryStyle[d.status]}`}>
                        {d.status}
                      </span>
                      {d.status === "Failed" && (
                        <button
                          onClick={() => retry(d.id)}
                          className="ml-2 rounded-md border border-d-edge px-2 py-1 text-[11px] font-medium text-d-ink transition-colors hover:bg-d-raised"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[12px] text-d-muted">{d.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
