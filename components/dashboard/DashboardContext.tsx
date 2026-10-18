"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Payment } from "./data";
import { useOnboarding } from "./onboarding/useOnboarding";

interface DashboardCtx {
  payment: Payment | null;
  openPayment: (p: Payment) => void;
  closePayment: () => void;
  newLinkOpen: boolean;
  openNewLink: () => void;
  closeNewLink: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  customerQuery: string;
  setCustomerQuery: (q: string) => void;
  onboarded: boolean;
}

const Ctx = createContext<DashboardCtx | null>(null);

export function useDashboard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: onboarding } = useOnboarding();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [newLinkOpen, setNewLinkOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");

  const onboarded = onboarding?.onboarded ?? false;

  const openNewLink = useCallback(() => {
    if (onboarding && !onboarding.onboarded) {
      router.push("/dashboard/onboarding");
      return;
    }
    setNewLinkOpen(true);
  }, [onboarding, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      queueMicrotask(() => setNewLinkOpen(true));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return (
    <Ctx.Provider
      value={{
        payment,
        openPayment: setPayment,
        closePayment: () => setPayment(null),
        newLinkOpen,
        openNewLink,
        closeNewLink: () => setNewLinkOpen(false),
        paletteOpen,
        setPaletteOpen,
        customerQuery,
        setCustomerQuery,
        onboarded,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
