import type { PublicIntent } from "@/lib/api-types";
import type { Payment } from "./data";

export function toPayment(p: PublicIntent): Payment {
  const status: Payment["status"] =
    p.status === "confirmed"
      ? "Confirmed"
      : p.status === "failed" || p.status === "expired"
        ? "Failed"
        : "Pending";
  return {
    id: p.id,
    merchant: p.merchant,
    payer: p.payer,
    amountUsd: p.amountUsd,
    amount: `$${p.amountUsd.toFixed(2)}`,
    coin: p.token,
    chain: p.chainName,
    chainKey: p.chainKey,
    status,
    statusRaw: p.status,
    time: new Date(p.createdAt).toLocaleString(),
    createdAt: p.createdAt,
    confirmedAt: p.confirmedAt,
    txHash: p.txHash,
    explorerTx: p.explorerTx,
    receiver: p.receiver,
    confirmations: p.confirmations,
    requiredConfirmations: p.requiredConfirmations,
    environment: p.environment,
    merchantId: p.merchantId,
    feeBps: p.feeBps,
    feeUsd: p.feeUsd,
    netUsd: p.netUsd,
  };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = typeof c === "string" && /^[=+-@]/.test(c) ? `'${c}` : `${c}`;
          return `"${s.replaceAll('"', '""')}"`;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function shortWallet(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
