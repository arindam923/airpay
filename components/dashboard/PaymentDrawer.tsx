"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { coinColors } from "./data";
import { copyText, fakeTxHash } from "./utils";
import StatusChip from "./ui/StatusChip";
import KvList from "./ui/KvList";
import CopyButton from "./ui/CopyButton";

export default function PaymentDrawer() {
  const { payment, closePayment } = useDashboard();
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!payment) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePayment();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [payment, closePayment]);

  if (!payment) return null;

  const gross = parseFloat(payment.amount.replace(/[$,]/g, ""));
  const fee = Math.round(gross * 0.009 * 100) / 100;
  const net = Math.round((gross - fee) * 100) / 100;
  const tx = fakeTxHash(payment.id);

  const doCopy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  const steps = [
    { label: "Payment created", done: true, time: "just now" },
    { label: "Broadcast to network", done: true, time: "just now" },
    {
      label: payment.status === "Failed" ? "Failed" : "Confirmed",
      done: payment.status === "Confirmed",
      failed: payment.status === "Failed",
      pending: payment.status === "Pending",
      time: payment.time,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Payment details">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePayment} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col rounded-l-2xl border-l border-d-edge bg-d-panel shadow-d-drawer">
        <div className="flex items-center justify-between rounded-tl-2xl border-b border-d-edge-soft px-5 py-4">
          <div className="flex items-center gap-3">
            <p className="font-mono text-[14px] font-medium text-d-ink">{payment.id}</p>
            <StatusChip status={payment.status} />
          </div>
          <button
            onClick={closePayment}
            className="flex h-7 w-7 items-center justify-center rounded-md text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink"
            aria-label="Close details"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-baseline justify-between">
            <span className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white"
                style={{ backgroundColor: coinColors[payment.coin] }}
              >
                {payment.coin[0]}
              </span>
              <span className="text-[13px] text-d-muted">
                {payment.coin} on {payment.chain}
              </span>
            </span>
            <span className="font-sans text-[28px] font-medium tracking-[-0.02em] text-d-ink">
              {payment.amount}
            </span>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
              Customer
            </p>
            <div className="flex items-center gap-3 rounded-lg border border-d-edge bg-d-raised px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet text-[12px] font-semibold text-cream">
                {payment.customer.split(" ").map((n) => n[0]).join("")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-d-ink">{payment.customer}</p>
                <p className="truncate text-[12px] text-d-muted">{payment.email}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
              Amount breakdown
            </p>
            <KvList
              items={[
                [
                  "Gross",
                  <span key="gross" className="font-mono">
                    {`$${gross.toLocaleString("en-US")}`}
                  </span>,
                ],
                [
                  "AirPay fee (0.9%)",
                  <span key="fee" className="font-mono">
                    {`-$${fee.toLocaleString("en-US")}`}
                  </span>,
                ],
                [
                  "Net payout",
                  <span key="net" className="font-mono font-semibold text-d-success">
                    ${net.toLocaleString("en-US")}
                  </span>,
                ],
              ]}
            />
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
              Transaction
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-d-edge bg-d-raised px-4 py-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-d-ink">{tx}</span>
              <CopyButton text={tx} compact ariaLabel="Copy transaction hash">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8.5 3.5V2.5a1 1 0 0 0-1-1H2.5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </CopyButton>
            </div>
            <div className="mt-3">
              <KvList
                items={[
                  ["Network", payment.chain],
                  ["Confirmations", payment.status === "Confirmed" ? "12" : "—"],
                  ["Received", payment.time],
                  ["Fee paid", "$0.00 (gas sponsored)"],
                ]}
              />
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
              Timeline
            </p>
            <div className="flex flex-col gap-0">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                        s.failed
                          ? "border-d-failed bg-d-failed"
                          : s.pending
                            ? "border-d-pending bg-transparent"
                            : "border-d-success bg-d-success"
                      }`}
                    />
                    {i < steps.length - 1 && <span className="w-px flex-1 bg-d-edge" />}
                  </div>
                  <div className="pb-5">
                    <p className="text-[13px] font-medium text-d-ink">{s.label}</p>
                    <p className="text-[11.5px] text-d-muted">{s.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-d-edge-soft p-4">
          <button
            onClick={() => doCopy("id", payment.id)}
            className={`flex-1 rounded-lg border border-d-edge px-4 py-2.5 text-[13px] font-medium transition-colors ${
              copied === "id" ? "border-d-success text-d-success" : "text-d-ink hover:bg-d-raised"
            }`}
          >
            {copied === "id" ? "Copied payment ID" : "Copy payment ID"}
          </button>
          <button
            onClick={closePayment}
            className="flex-1 rounded-lg bg-d-accent px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-d-accent-deep"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
