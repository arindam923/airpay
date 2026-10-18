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
    customer: p.merchant,
    email: "",
    amount: `$${p.amountUsd.toFixed(2)}`,
    coin: p.token,
    chain: p.chainName,
    status,
    time: new Date(p.createdAt).toLocaleString(),
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

export function fakeTxHash(id: string): string {
  const hex = Array.from(id)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");
  return `0x${(hex + "a3f9c21e8b47d650f1c8e2b9a74d3f6e0c5b2198").slice(0, 40)}`;
}

export function shortWallet(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}
