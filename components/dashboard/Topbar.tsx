"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDashboard } from "./DashboardContext";
import { pageTitleForPath } from "./nav";
import { orpcClient } from "@/lib/orpc/client";
import type { PublicIntent } from "@/lib/api-types";
import { toPayment } from "./utils";
import {
  formatRelativeTime,
  notificationStore,
  notificationsFromIntents,
  useNotifications,
} from "./notifications";

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { setPaletteOpen, openNewLink, openPayment, environment, productionLocked } = useDashboard();
  const title = pageTitleForPath(pathname);

  const { data } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await orpcClient.payments.listByOrg({})) as PublicIntent[],
  });
  const intents = useMemo(() => data ?? [], [data]);
  const rows = useMemo(() => intents.map(toPayment), [intents]);

  const notifs = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const unread = notifs.filter((n) => !n.read).length;

  const [now, setNow] = useState(() => (typeof window === "undefined" ? 0 : Date.now()));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (intents.length > 0) notificationStore.upsert(notificationsFromIntents(intents));
  }, [intents]);

  useEffect(() => {
    if (!bellOpen) return;
    const onDown = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBellOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [bellOpen]);

  const router = useRouter();

  const openNotif = (id: string) => {
    const n = notifs.find((x) => x.id === id);
    if (!n) return;
    notificationStore.markRead(id);
    setBellOpen(false);
    if (n.target === "payment") {
      const p = rows.find((r) => r.id === n.paymentId);
      if (p) openPayment(p);
      else router.push("/dashboard/payments");
    } else if (n.target === "payout") router.push("/dashboard/payouts");
    else if (n.target === "webhook") router.push("/dashboard/webhooks");
    else router.push("/dashboard/api-keys");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-d-edge bg-d-bg/85 px-4 backdrop-blur-md md:px-6">
      <button
        onClick={onMenu}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-d-edge text-d-muted transition-colors hover:text-d-ink lg:hidden"
        aria-label="Open menu"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1.5 3.5h11M1.5 7h11M1.5 10.5h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <nav className="hidden items-center gap-1.5 text-[13px] text-d-muted sm:flex">
        <Link href="/dashboard" className="transition-colors hover:text-d-ink">
          AirPay
        </Link>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M3.5 1.5L7 5l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-medium text-d-ink">{title}</span>
      </nav>

      <button
        onClick={() => setPaletteOpen(true)}
        className="relative mx-auto h-9 w-full max-w-[300px] rounded-lg border border-d-edge bg-d-panel text-left transition-colors hover:border-d-muted/40"
        aria-label="Search (Command K)"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 14 14"
          fill="none"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-d-muted"
        >
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="absolute left-9 top-1/2 -translate-y-1/2 text-[13px] text-d-muted/70">
          Search payments, pages…
        </span>
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-d-edge bg-d-raised px-1.5 py-0.5 font-mono text-[10px] text-d-muted sm:flex">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        <span
          className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium md:flex ${
            environment === "production"
              ? "border-d-edge bg-d-panel text-d-success"
              : "border-amber-400/30 bg-amber-400/10 text-amber-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              environment === "production" ? "animate-pulse-dot bg-d-success" : "bg-amber-400"
            }`}
          />
          {environment === "production" ? "Live" : "Testnet"}
        </span>

        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((v) => !v)}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              bellOpen ? "border-d-accent text-d-ink" : "border-d-edge text-d-muted hover:text-d-ink"
            }`}
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1.5a3.5 3.5 0 00-3.5 3.5c0 3-1 4-1.5 4.5h10c-.5-.5-1.5-1.5-1.5-4.5A3.5 3.5 0 007 1.5zM5.5 11.5a1.5 1.5 0 003 0"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-d-accent px-1 text-[9px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-10 z-50 w-[330px] overflow-hidden rounded-xl border border-d-edge bg-d-panel shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between border-b border-d-edge-soft px-4 py-3">
                <p className="text-[13px] font-semibold text-d-ink">Notifications</p>
                {unread > 0 && (
                  <button
                    onClick={() => notificationStore.markAllRead()}
                    className="text-[11.5px] font-medium text-d-accent transition-colors hover:text-d-ink"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {notifs.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-d-edge bg-d-raised text-d-muted">
                    <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 1.5a3.5 3.5 0 00-3.5 3.5c0 3-1 4-1.5 4.5h10c-.5-.5-1.5-1.5-1.5-4.5A3.5 3.5 0 007 1.5zM5.5 11.5a1.5 1.5 0 003 0"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <p className="mt-3 text-[13px] font-medium text-d-ink">You&apos;re all caught up</p>
                  <p className="mt-1 text-[11.5px] leading-[1.5] text-d-muted">
                    New payment activity will show up here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto">
                  {notifs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openNotif(n.id)}
                      className={`flex w-full gap-3 border-b border-d-edge-soft/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-d-raised ${
                        n.read ? "opacity-60" : ""
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.read ? "bg-d-edge" : "bg-d-accent"
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-d-ink">{n.title}</span>
                          <span className="shrink-0 text-[10.5px] text-d-muted">
                            {formatRelativeTime(n.createdAt, now)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-d-muted">{n.body}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={openNewLink}
          disabled={productionLocked}
          title={productionLocked ? "Production isn't available yet — switch to Sandbox" : undefined}
          className="hidden h-9 items-center gap-1.5 rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-d-accent sm:flex"
        >
          New payment link
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
