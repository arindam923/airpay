"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Payment } from "./data";

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
}

const Ctx = createContext<DashboardCtx | null>(null);

export function useDashboard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [newLinkOpen, setNewLinkOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");

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
        openNewLink: () => setNewLinkOpen(true),
        closeNewLink: () => setNewLinkOpen(false),
        paletteOpen,
        setPaletteOpen,
        customerQuery,
        setCustomerQuery,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
