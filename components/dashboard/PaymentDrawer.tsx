"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { coinColors } from "./data";
import { copyText, fakeTxHash } from "./utils";

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

  const statusChip =
    payment.status === "Confirmed"
      ? "bg-d-success/10 text-d-success"
      : payment.status === "Pending"
        ? "bg-d-pending/10 text-d-pending"
        : "bg-d-failed/10 text-d-failed";

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Payment details">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePayment} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col border-l border-d-edge bg-d-panel shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-d-edge-soft px-5 py-4">
          <div className="flex items-center gap-3">
            <p className="font-mono text-[14px] font-medium text-d-ink">{payment.id}</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusChip}`}>
              {payment.status}
            </span>
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
            <div className="rounded-lg border border-d-edge bg-d-raised">
              {[
                ["Gross", `$${gross.toLocaleString("en-US")}`],
                ["AirPay fee (0.9%)", `-$${fee.toLocaleString("en-US")}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-d-edge-soft px-4 py-2.5 text-[13px]">
                  <span className="text-d-muted">{k}</span>
                  <span className="font-mono text-d-ink">{v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 text-[13px]">
                <span className="font-medium text-d-ink">Net payout</span>
                <span className="font-mono font-semibold text-d-success">
                  ${net.toLocaleString("en-US")}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
              Transaction
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-d-edge bg-d-raised px-4 py-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-d-ink">{tx}</span>
              <button
                onClick={() => doCopy("tx", tx)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  copied === "tx" ? "bg-d-success text-d-bg" : "bg-d-accent text-white hover:bg-d-accent-deep"
                }`}
              >
                {copied === "tx" ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-3 rounded-lg border border-d-edge bg-d-raised">
              {[
                ["Network", payment.chain],
                ["Confirmations", payment.status === "Confirmed" ? "12" : "—"],
                ["Received", payment.time],
                ["Fee paid", "$0.00 (gas sponsored)"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-d-edge-soft px-4 py-2.5 text-[13px] last:border-0">
                  <span className="text-d-muted">{k}</span>
                  <span className="text-d-ink">{v}</span>
                </div>
              ))}
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
