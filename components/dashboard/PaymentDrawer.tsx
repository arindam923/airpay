"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { coinColor } from "./data";
import { copyText, shortWallet } from "./utils";
import { feeUsd, formatFeePercent, netUsd } from "@/lib/fees";
import StatusChip from "./ui/StatusChip";
import KvList from "./ui/KvList";
import CopyButton from "./ui/CopyButton";

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

  const gross = payment.amountUsd;
  const fee = payment.feeUsd ?? feeUsd(gross, payment.feeBps);
  const net = payment.netUsd ?? netUsd(gross, payment.feeBps);

  const finalLabel =
    payment.statusRaw === "confirmed"
      ? "Confirmed"
      : payment.statusRaw === "failed"
        ? "Failed"
        : payment.statusRaw === "expired"
          ? "Expired"
          : "Awaiting confirmation";

  const steps: { label: string; time: number; tone: "done" | "active" | "failed" | "pending" }[] = [
    { label: "Payment created", time: payment.createdAt, tone: "done" },
  ];
  if (payment.txHash) {
    steps.push({ label: "Transaction submitted", time: payment.createdAt, tone: "done" });
  }
  steps.push({
    label: finalLabel,
    time: payment.confirmedAt ?? payment.createdAt,
    tone:
      payment.statusRaw === "confirmed"
        ? "done"
        : payment.status === "Failed"
          ? "failed"
          : "pending",
  });

  const doCopy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    }
  };

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
                style={{ backgroundColor: coinColor(payment.coin) }}
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
              Merchant
            </p>
            <div className="rounded-lg border border-d-edge bg-d-raised px-4 py-3">
              <p className="truncate text-[13.5px] font-medium text-d-ink">{payment.merchant}</p>
              <p className="mt-1 font-mono text-[12px] text-d-muted">
                {payment.payer ? `Paid from ${shortWallet(payment.payer)}` : "No payer yet"}
              </p>
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
                    {`$${gross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>,
                ],
                [
                  `AirPay fee (${formatFeePercent(payment.feeBps)})`,
                  <span key="fee" className="font-mono">
                    {`-$${fee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>,
                ],
                [
                  "Net payout",
                  <span key="net" className="font-mono font-semibold text-d-success">
                    ${net.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>,
                ],
              ]}
            />
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
              Transaction
            </p>
            {payment.txHash ? (
              <div className="flex items-center gap-2 rounded-lg border border-d-edge bg-d-raised px-4 py-3">
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-d-ink">
                  {payment.txHash}
                </span>
                {payment.explorerTx && (
                  <a
                    href={payment.explorerTx}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-[11.5px] font-medium text-d-accent transition-colors hover:text-d-ink"
                  >
                    Explorer
                  </a>
                )}
                <CopyButton text={payment.txHash} compact ariaLabel="Copy transaction hash">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M8.5 3.5V2.5a1 1 0 0 0-1-1H2.5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h1" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </CopyButton>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-d-edge px-4 py-3 text-[12.5px] text-d-muted">
                No transaction has been submitted for this payment yet.
              </p>
            )}
            <div className="mt-3">
              <KvList
                items={[
                  ["Network", payment.chain],
                  [
                    "Confirmations",
                    `${payment.confirmations} / ${payment.requiredConfirmations}`,
                  ],
                  ["Receiver", shortWallet(payment.receiver)],
                  ["Created", fmtTime(payment.createdAt)],
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
                        s.tone === "failed"
                          ? "border-d-failed bg-d-failed"
                          : s.tone === "pending"
                            ? "border-d-pending bg-transparent"
                            : "border-d-success bg-d-success"
                      }`}
                    />
                    {i < steps.length - 1 && <span className="w-px flex-1 bg-d-edge" />}
                  </div>
                  <div className="pb-5">
                    <p className="text-[13px] font-medium text-d-ink">{s.label}</p>
                    <p className="text-[11.5px] text-d-muted">{fmtTime(s.time)}</p>
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
            className="flex-1 rounded-lg bg-d-accent px-4 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
