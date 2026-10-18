"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDashboard } from "./DashboardContext";
import { deriveCustomers } from "./customers";
import { toPayment } from "./utils";
import { orpcClient } from "@/lib/orpc/client";
import type { PublicIntent, PublicInvoiceDetail } from "@/lib/api-types";
import { NAV_GROUPS } from "./nav";

interface PageItem {
  type: "page";
  label: string;
  href: string;
  group: string;
}
interface PaymentItem {
  type: "payment";
  label: string;
  sub: string;
  group: string;
}
interface CustomerItem {
  type: "customer";
  label: string;
  sub: string;
  group: string;
}
type Item = PageItem | PaymentItem | CustomerItem;

const pages: PageItem[] = [
  ...NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ type: "page" as const, label: item.label, href: item.href, group: group.title }))
  ),
  { type: "page", label: "Docs", href: "/docs", group: "Pages" },
];

function Glyph({ d, vb = "0 0 14 14", sw = 1.5 }: { d: string; vb?: string; sw?: number }) {
  return (
    <svg width="14" height="14" viewBox={vb} fill="none" className="shrink-0 text-d-muted">
      <path d={d} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const pageIcons: Record<string, ReactNode> = {};
for (const group of NAV_GROUPS) {
  for (const item of group.items) {
    pageIcons[item.href] = <Glyph d={item.icon} vb="0 0 20 20" sw={1.6} />;
  }
}
pageIcons["/docs"] = <Glyph d="M4 1.5h4l3 3v8h-7zM8 1.5v3h3" />;

export default function CommandPalette() {
  const { paletteOpen } = useDashboard();
  if (!paletteOpen) return null;
  return <PaletteBody />;
}

function PaletteBody() {
  const router = useRouter();
  const { setPaletteOpen, openPayment, setCustomerQuery } = useDashboard();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const { data: intentsData } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await orpcClient.payments.listByOrg({})) as PublicIntent[],
  });
  const { data: invoicesData } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await orpcClient.invoices.list()) as PublicInvoiceDetail[],
  });

  const intents = useMemo(() => intentsData ?? [], [intentsData]);
  const customers = useMemo(
    () => deriveCustomers(invoicesData ?? [], intents),
    [invoicesData, intents],
  );

  const items = useMemo<Item[]>(() => {
    const query = q.trim().toLowerCase();
    const match = (s: string) => !query || s.toLowerCase().includes(query);
    const pageItems = pages.filter((p) => match(p.label));
    const payItems: PaymentItem[] = intents
      .filter(
        (p) =>
          match(p.id) ||
          match(p.merchant) ||
          match(p.payer ?? "") ||
          match(p.token) ||
          match(p.chainName)
      )
      .slice(0, 6)
      .map((p) => ({
        type: "payment",
        label: p.id,
        sub: `${p.merchant} · $${p.amountUsd.toFixed(2)}`,
        group: "Payments",
      }));
    const custItems: CustomerItem[] = customers
      .filter((c) => match(c.name) || match(c.email ?? "") || match(c.wallet ?? ""))
      .slice(0, 5)
      .map((c) => ({
        type: "customer",
        label: c.name,
        sub:
          c.email ??
          c.wallet ??
          `${c.invoices.length} invoice${c.invoices.length === 1 ? "" : "s"}`,
        group: "Customers",
      }));
    return [...pageItems, ...payItems, ...custItems];
  }, [q, intents, customers]);

  const activeIdx = Math.min(idx, Math.max(items.length - 1, 0));

  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const select = (item: Item) => {
    setPaletteOpen(false);
    if (item.type === "page") router.push(item.href);
    else if (item.type === "customer") {
      setCustomerQuery(item.label);
      router.push("/dashboard/customers");
    } else {
      const p = intents.find((x) => x.id === item.label);
      if (p) openPayment(toPayment(p));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[activeIdx]) select(items[activeIdx]);
    } else if (e.key === "Escape") {
      setPaletteOpen(false);
    }
  };

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-sm"
      onClick={() => setPaletteOpen(false)}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-xl border border-d-edge bg-d-panel shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-d-edge-soft px-4">
          <svg width="15" height="15" viewBox="0 0 14 14" fill="none" className="shrink-0 text-d-muted">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search payments, customers, pages…"
            className="h-13 w-full bg-transparent py-4 text-[14px] text-d-ink placeholder:text-d-muted/70 focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-d-edge bg-d-raised px-1.5 py-0.5 font-mono text-[10px] text-d-muted">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[340px] overflow-y-auto py-2">
          {items.length === 0 && (
            <p className="px-4 py-8 text-center text-[13px] text-d-muted">
              No results for “{q}”
            </p>
          )}
          {items.map((item, i) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={`${item.type}-${item.label}-${i}`}>
                {showGroup && (
                  <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-d-muted/60">
                    {item.group}
                  </p>
                )}
                <button
                  onClick={() => select(item)}
                  onMouseEnter={() => setIdx(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    activeIdx === i ? "bg-d-raised" : ""
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-d-edge text-[11px] ${
                      item.type === "page"
                        ? "bg-d-accent/15 text-d-accent"
                        : item.type === "payment"
                          ? "bg-d-success/10 text-d-success"
                          : "bg-violet/20 text-violet"
                    }`}
                  >
                    {item.type === "page" ? (
                      pageIcons[item.href] ?? <Glyph d="M4 1.5h4l3 3v8h-7zM8 1.5v3h3" />
                    ) : item.type === "payment" ? (
                      <Glyph d="M8.2 1.5L3.8 8h2.9l-.8 4.5L10.2 6H7.3l.9-4.5z" />
                    ) : (
                      <Glyph d="M7 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM2.5 12.5c.6-2.4 2.4-3.8 4.5-3.8s3.9 1.4 4.5 3.8" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-d-ink">
                      {item.label}
                    </span>
                    <span className="block truncate text-[11.5px] text-d-muted">
                      {item.type === "page" ? item.href : item.sub}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10.5px] text-d-muted">↵</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
