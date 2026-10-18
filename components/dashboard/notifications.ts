import { useSyncExternalStore } from "react";
import type { IntentStatus, PublicIntent } from "@/lib/api-types";
import { formatUsd } from "./metrics";

export type NotifTarget = "payment" | "payout" | "webhook" | "key";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  target: NotifTarget;
  paymentId?: string;
}

const EMPTY: AppNotification[] = [];
const MAX_ITEMS = 50;

let notifications: AppNotification[] = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Framework-agnostic notification store.
 *
 * State lives outside React so any part of the dashboard can read or mutate it,
 * and components subscribe through `useNotifications`.
 */
export const notificationStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): AppNotification[] {
    return notifications;
  },

  getServerSnapshot(): AppNotification[] {
    return EMPTY;
  },

  /** Insert notifications that aren't already known, preserving read state. */
  upsert(next: AppNotification[]) {
    if (next.length === 0) return;
    const known = new Set(notifications.map((n) => n.id));
    const added = next.filter((n) => !known.has(n.id));
    if (added.length === 0) return;
    notifications = [...added, ...notifications]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_ITEMS);
    emit();
  },

  markRead(id: string) {
    if (!notifications.some((n) => n.id === id && !n.read)) return;
    notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    emit();
  },

  markAllRead() {
    if (notifications.every((n) => n.read)) return;
    notifications = notifications.map((n) => (n.read ? n : { ...n, read: true }));
    emit();
  },

  dismiss(id: string) {
    const next = notifications.filter((n) => n.id !== id);
    if (next.length === notifications.length) return;
    notifications = next;
    emit();
  },

  clear() {
    if (notifications.length === 0) return;
    notifications = EMPTY;
    emit();
  },
};

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(
    notificationStore.subscribe,
    notificationStore.getSnapshot,
    notificationStore.getServerSnapshot
  );
}

function describe(status: IntentStatus): { title: string; target: NotifTarget } | null {
  switch (status) {
    case "confirmed":
      return { title: "Payment confirmed", target: "payment" };
    case "failed":
      return { title: "Payment failed", target: "payment" };
    case "expired":
      return { title: "Payment link expired", target: "payment" };
    case "submitted":
    case "confirming":
      return { title: "Payment confirming", target: "payment" };
    case "awaiting_payment":
      return { title: "Awaiting payment", target: "payment" };
    default:
      return null;
  }
}

/** Build notifications from live payment intents. */
export function notificationsFromIntents(intents: PublicIntent[]): AppNotification[] {
  return intents
    .map((p): AppNotification | null => {
      const meta = describe(p.status);
      if (!meta) return null;
      return {
        id: `${p.id}:${p.status}`,
        title: meta.title,
        body: `${p.merchant} · ${formatUsd(p.amountUsd)} ${p.token} on ${p.chainName}`,
        createdAt: p.confirmedAt ?? p.createdAt,
        read: false,
        target: meta.target,
        paymentId: p.id,
      };
    })
    .filter((n): n is AppNotification => n !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function formatRelativeTime(from: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - from) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
