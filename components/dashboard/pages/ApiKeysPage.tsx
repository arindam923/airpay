"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";
import Card, { CardHeader } from "../ui/Card";
import CopyButton from "../ui/CopyButton";

interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  secret: string;
  created: string;
  lastUsed: string;
  scope: "Full access" | "Read only";
  revoked: boolean;
}

const initialKeys: ApiKey[] = [
  {
    id: "key_1",
    label: "Production server",
    prefix: "ap_live",
    secret: "ap_live_9f3k2m8x4c1v6b0n",
    created: "Sep 12, 2026",
    lastUsed: "2s ago",
    scope: "Full access",
    revoked: false,
  },
  {
    id: "key_2",
    label: "Analytics pipeline",
    prefix: "ap_live",
    secret: "ap_live_4w8j1p6q2r9t5y3u",
    created: "Aug 2, 2026",
    lastUsed: "4h ago",
    scope: "Read only",
    revoked: false,
  },
  {
    id: "key_3",
    label: "Staging",
    prefix: "ap_test",
    secret: "ap_test_7z0c5d3e8f2a1b6g",
    created: "Jun 18, 2026",
    lastUsed: "3d ago",
    scope: "Full access",
    revoked: false,
  },
];

function genSecret(prefix: string) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let body = "";
  for (let i = 0; i < 20; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}_${body}`;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState(initialKeys);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"Full access" | "Read only">("Full access");
  const [freshSecret, setFreshSecret] = useState<string | null>(null);

  const createKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    const secret = genSecret("ap_live");
    setKeys((prev) => [
      {
        id: `key_${prev.length + 1}`,
        label: label.trim(),
        prefix: "ap_live",
        secret,
        created: "just now",
        lastUsed: "never",
        scope,
        revoked: false,
      },
      ...prev,
    ]);
    setFreshSecret(secret);
    setLabel("");
    setCreating(false);
  };

  const revoke = (id: string) =>
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked: true } : k)));

  const active = keys.filter((k) => !k.revoked);

  return (
    <>
      <PageHeader
        title="API keys"
        description="Authenticate server-side requests to the AirPay API."
        actions={
          <button
            onClick={() => setCreating((v) => !v)}
            className="d-glow flex h-9 items-center gap-1.5 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
          >
            {creating ? "Cancel" : "Create API key"}
            {!creating && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            )}
          </button>
        }
      />

      {freshSecret && (
        <div className="mb-4 rounded-2xl border border-d-success/40 bg-d-success/10 p-4">
          <p className="text-[13px] font-medium text-d-ink">
            Copy your new secret key now — it won&apos;t be shown again.
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-d-edge bg-d-raised px-3 py-2 font-mono text-[12.5px] text-d-ink">
              {freshSecret}
            </code>
            <CopyButton text={freshSecret} ariaLabel="Copy new API secret key" copiedChildren="Copied">
              Copy
            </CopyButton>
            <button
              onClick={() => setFreshSecret(null)}
              className="shrink-0 rounded-lg border border-d-edge px-3.5 py-2 text-[12.5px] font-medium text-d-ink transition-colors hover:bg-d-raised"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {creating && (
        <Card className="mb-4">
          <form onSubmit={createKey} className="flex flex-wrap items-end gap-3 p-5">
            <label className="block flex-1">
              <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Label</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Billing service"
                required
                className="h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13.5px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Scope</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "Full access" | "Read only")}
                className="h-10 rounded-lg border border-d-edge bg-d-raised px-3 text-[13.5px] text-d-ink focus:border-d-accent focus:outline-none"
              >
                <option>Full access</option>
                <option>Read only</option>
              </select>
            </label>
            <button type="submit" className="d-glow h-10 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep">
              Create key
            </button>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Your keys"
          description={`${active.length} active · ${keys.length - active.length} revoked`}
        />
        <div className="flex flex-col">
          {keys.map((k) => (
            <div key={k.id} className="border-b border-d-edge-soft/60 px-5 py-4 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-[13.5px] font-medium ${k.revoked ? "text-d-muted line-through" : "text-d-ink"}`}>
                      {k.label}
                    </p>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10.5px] font-medium ${
                        k.prefix === "ap_live" ? "bg-d-accent/15 text-d-accent" : "bg-d-raised text-d-muted"
                      }`}
                    >
                      {k.prefix === "ap_live" ? "live" : "test"}
                    </span>
                    <span className="rounded-md border border-d-edge px-2 py-0.5 text-[10.5px] text-d-muted">
                      {k.scope}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="font-mono text-[12px] text-d-muted">
                      {revealed[k.id] ? k.secret : `${k.prefix}_••••••••••••••••`}
                    </code>
                    {!k.revoked && (
                      <button
                        onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))}
                        className="text-[11.5px] font-medium text-d-accent transition-colors hover:text-d-ink"
                      >
                        {revealed[k.id] ? "Hide" : "Reveal"}
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-d-muted/80">
                    Created {k.created} · Last used {k.lastUsed}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!k.revoked && (
                    <>
                      <CopyButton text={k.secret} ariaLabel={`Copy secret for key ${k.label}`} copiedChildren="Copied">
                        Copy
                      </CopyButton>
                      <button
                        onClick={() => revoke(k.id)}
                        className="rounded-md border border-d-failed/40 px-3 py-1.5 text-[12px] font-medium text-d-failed transition-colors hover:bg-d-failed/10"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                  {k.revoked && (
                    <span className="rounded-full bg-d-failed/10 px-2.5 py-1 text-[11.5px] font-medium text-d-failed">
                      Revoked
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-4 text-[12px] leading-[1.5] text-d-muted">
        Keep secret keys on your server only. Never expose them in client-side code or
        public repositories. See the{" "}
        <a href="/docs" className="font-medium text-d-accent hover:text-d-ink">
          API docs
        </a>{" "}
        for request examples.
      </p>
    </>
  );
}
