"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDashboard } from "./DashboardContext";
import StatusChip from "./ui/StatusChip";
import CopyButton from "./ui/CopyButton";
import Skeleton from "./ui/Skeleton";
import { orpcClient } from "@/lib/orpc/client";
import type { InvoiceStatus, PublicInvoiceDetail } from "@/lib/api-types";

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  paid: "Paid",
  void: "Void",
  overdue: "Overdue",
};

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(ms: number | null): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function invoiceUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/i/${slug}`;
}

export default function InvoiceDrawer() {
  const { invoiceId, closeInvoice } = useDashboard();
  const queryClient = useQueryClient();

  const { data: invoice } = useQuery({
    queryKey: ["invoice", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => (await orpcClient.invoices.get({ id: invoiceId })) as PublicInvoiceDetail,
  });

  const voidInvoice = useMutation({
    mutationFn: async (id: string) => await orpcClient.invoices.void({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
  });

  const sendEmail = useMutation({
    mutationFn: async (id: string) => await orpcClient.invoices.send({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    },
  });

  useEffect(() => {
    if (!invoiceId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeInvoice();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [invoiceId, closeInvoice]);

  const resetSend = sendEmail.reset;
  useEffect(() => {
    resetSend();
  }, [invoiceId, resetSend]);

  if (!invoiceId) return null;

  const status: InvoiceStatus = invoice?.status ?? "draft";

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Invoice details">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeInvoice} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col rounded-l-2xl border-l border-d-edge bg-d-panel shadow-d-drawer">
        <div className="flex items-center justify-between rounded-tl-2xl border-b border-d-edge-soft px-5 py-4">
          <div className="flex items-center gap-3">
            <p className="font-mono text-[14px] font-medium text-d-ink">
              {invoice ? invoice.number : "…"}
            </p>
            {invoice && <StatusChip status={STATUS_LABEL[status]} />}
          </div>
          <button
            onClick={closeInvoice}
            className="flex h-7 w-7 items-center justify-center rounded-md text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink"
            aria-label="Close details"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!invoice ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-7 w-24" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-d-ink">
                    {invoice.customerName}
                  </p>
                  {invoice.customerEmail && (
                    <p className="truncate text-[12px] text-d-muted">{invoice.customerEmail}</p>
                  )}
                </div>
                <span className="font-sans text-[26px] font-medium tracking-[-0.02em] text-d-ink">
                  {money(invoice.totalUsd)}
                </span>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                  Line items
                </p>
                <div className="rounded-lg border border-d-edge bg-d-raised">
                  {invoice.items.map((it, i) => (
                    <div
                      key={it.id}
                      className={`flex items-baseline justify-between gap-4 px-4 py-2.5 text-[13px] ${
                        i > 0 ? "border-t border-d-edge-soft" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-d-ink">
                        <span className="text-d-muted">×{it.quantity} </span>
                        {it.description}
                      </span>
                      <span className="shrink-0 font-mono text-d-ink">{money(it.amountUsd)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 space-y-1 px-1 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="text-d-muted">Subtotal</span>
                    <span className="font-mono text-d-ink">{money(invoice.subtotalUsd)}</span>
                  </div>
                  {invoice.taxUsd > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-d-muted">Tax</span>
                      <span className="font-mono text-d-ink">{money(invoice.taxUsd)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                  Details
                </p>
                <div className="rounded-lg border border-d-edge bg-d-raised">
                  {[
                    ["Merchant", invoice.merchant],
                    ["Network", `${invoice.chainName} testnet`],
                    ["Due", formatDate(invoice.dueAt)],
                    ["Created", formatDate(invoice.createdAt)],
                  ].map(([k, v], i) => (
                    <div
                      key={k}
                      className={`flex items-center justify-between gap-4 px-4 py-2.5 text-[13px] ${
                        i > 0 ? "border-t border-d-edge-soft" : ""
                      }`}
                    >
                      <span className="shrink-0 text-d-muted">{k}</span>
                      <span className="truncate text-d-ink">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-6">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                    Notes
                  </p>
                  <p className="rounded-lg border border-d-edge bg-d-raised px-4 py-3 text-[13px] leading-[1.55] text-d-ink">
                    {invoice.notes}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                  Share link
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-d-edge bg-d-raised px-4 py-3">
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-d-ink">
                    {invoiceUrl(invoice.slug)}
                  </span>
                  <CopyButton text={invoiceUrl(invoice.slug)} compact ariaLabel="Copy invoice link" />
                </div>
              </div>
            </>
          )}
        </div>

        {invoice && (
          <div className="border-t border-d-edge-soft p-4">
            {sendEmail.isSuccess && (
              <p className="mb-3 rounded-lg border border-d-success/40 bg-d-success/10 px-3.5 py-2.5 text-[12.5px] font-medium text-d-ink">
                Emailed to {invoice.customerEmail}.
              </p>
            )}
            {sendEmail.isError && (
              <p className="mb-3 rounded-lg border border-d-failed/40 bg-d-failed/10 px-3.5 py-2.5 text-[12.5px] font-medium text-d-failed">
                {sendEmail.error instanceof Error
                  ? sendEmail.error.message
                  : "Could not send the email."}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => window.open(invoiceUrl(invoice.slug), "_blank", "noopener")}
                className="flex-1 rounded-lg border border-d-edge px-4 py-2.5 text-[13px] font-medium text-d-ink transition-colors hover:bg-d-raised"
              >
                Open invoice
              </button>
              {invoice.status !== "void" && invoice.customerEmail && (
                <button
                  onClick={() => sendEmail.mutate(invoice.id)}
                  disabled={sendEmail.isPending}
                  className="rounded-lg border border-d-edge px-4 py-2.5 text-[13px] font-medium text-d-ink transition-colors hover:bg-d-raised disabled:opacity-60"
                >
                  {sendEmail.isPending ? "Sending…" : "Send email"}
                </button>
              )}
              {invoice.status !== "void" && invoice.status !== "paid" && (
                <button
                  onClick={() => voidInvoice.mutate(invoice.id)}
                  disabled={voidInvoice.isPending}
                  className="rounded-lg border border-d-failed/40 px-4 py-2.5 text-[13px] font-medium text-d-failed transition-colors hover:bg-d-failed/10 disabled:opacity-60"
                >
                  {voidInvoice.isPending ? "Voiding…" : "Void"}
                </button>
              )}
              <button
                onClick={closeInvoice}
                className="flex-1 rounded-lg bg-d-accent px-4 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
