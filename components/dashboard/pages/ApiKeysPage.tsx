"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import PageHeader from "../PageHeader";
import Card, { CardHeader } from "../ui/Card";
import CopyButton from "../ui/CopyButton";
import Skeleton from "../ui/Skeleton";
import { useOnboarding } from "../onboarding/useOnboarding";
import { orpcClient } from "@/lib/orpc/client";

interface ApiKeyRow {
  id: string;
  label: string;
  prefix: string;
  lastFour: string;
  scope: string;
  revoked: boolean;
  createdAt: number;
  lastUsedAt: number | null;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ApiKeysPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: onboarding } = useOnboarding();
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"full" | "readonly">("full");
  const [freshSecret, setFreshSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["apiKeys"],
    queryFn: async () => (await orpcClient.apiKeys.list()) as ApiKeyRow[],
  });

  const createKey = useMutation({
    mutationFn: async () =>
      (await orpcClient.apiKeys.create({ label: label.trim(), scope })) as {
        id: string;
        secret: string;
      },
    onSuccess: (res) => {
      setFreshSecret(res.secret);
      setLabel("");
      setCreating(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not create the API key.");
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => await orpcClient.apiKeys.revoke({ id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["apiKeys"] }),
  });

  const keys = data ?? [];
  const active = keys.filter((k) => !k.revoked);

  const startCreating = () => {
    if (onboarding && !onboarding.onboarded) {
      router.push("/dashboard/onboarding");
      return;
    }
    setCreating((v) => !v);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    createKey.mutate();
  };

  return (
    <>
      <PageHeader
        title="API keys"
        description="Authenticate server-side requests to the AirPay API."
        actions={
          <button
            onClick={startCreating}
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

      {error && (
        <p className="mb-4 rounded-xl border border-d-failed/40 bg-d-failed/10 px-3.5 py-2.5 text-[12.5px] font-medium text-d-failed">
          {error}
        </p>
      )}

      {creating && (
        <Card className="mb-4">
          <form onSubmit={submit} className="flex flex-wrap items-end gap-3 p-5">
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
                onChange={(e) => setScope(e.target.value as "full" | "readonly")}
                className="h-10 rounded-lg border border-d-edge bg-d-raised px-3 text-[13.5px] text-d-ink focus:border-d-accent focus:outline-none"
              >
                <option value="full">Full access</option>
                <option value="readonly">Read only</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={createKey.isPending}
              className="d-glow h-10 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createKey.isPending ? "Creating…" : "Create key"}
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
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border-b border-d-edge-soft/60 px-5 py-4 last:border-0">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="mt-3 h-3 w-52" />
                <Skeleton className="mt-3 h-3 w-64" />
              </div>
            ))
          ) : keys.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] font-medium text-d-ink">No API keys yet</p>
              <p className="mt-1 text-[12.5px] text-d-muted">
                Create a key to authenticate server-side requests.
              </p>
            </div>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="border-b border-d-edge-soft/60 px-5 py-4 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[13.5px] font-medium ${k.revoked ? "text-d-muted line-through" : "text-d-ink"}`}>
                        {k.label}
                      </p>
                      <span className="rounded-md bg-d-raised px-2 py-0.5 text-[10.5px] font-medium text-d-muted">
                        {k.prefix === "ap_live" ? "live" : "test"}
                      </span>
                      <span className="rounded-md border border-d-edge px-2 py-0.5 text-[10.5px] text-d-muted">
                        {k.scope === "readonly" ? "Read only" : "Full access"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="font-mono text-[12px] text-d-muted">
                        {k.prefix}_••••••{k.lastFour}
                      </code>
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-d-muted/80">
                      Created {formatDate(k.createdAt)} · Last used{" "}
                      {k.lastUsedAt ? formatDate(k.lastUsedAt) : "never"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!k.revoked ? (
                      <button
                        onClick={() => revokeKey.mutate(k.id)}
                        disabled={revokeKey.isPending}
                        className="rounded-md border border-d-failed/40 px-3 py-1.5 text-[12px] font-medium text-d-failed transition-colors hover:bg-d-failed/10 disabled:opacity-60"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="rounded-full bg-d-failed/10 px-2.5 py-1 text-[11.5px] font-medium text-d-failed">
                        Revoked
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <p className="mt-4 text-[12px] leading-[1.5] text-d-muted">
        Keep secret keys on your server only. Never expose them in client-side code or
        public repositories.
      </p>
    </>
  );
}
