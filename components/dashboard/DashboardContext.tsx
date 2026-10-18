"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Payment } from "./data";
import { useOnboarding } from "./onboarding/useOnboarding";
import { useEnvironment } from "@/lib/env-store";
import { PRODUCTION_READY, type Environment } from "@/lib/environment";

interface DashboardCtx {
  payment: Payment | null;
  openPayment: (p: Payment) => void;
  closePayment: () => void;
  newLinkOpen: boolean;
  openNewLink: () => void;
  closeNewLink: () => void;
  newInvoiceOpen: boolean;
  openNewInvoice: () => void;
  closeNewInvoice: () => void;
  invoiceId: string | null;
  openInvoice: (id: string) => void;
  closeInvoice: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  customerQuery: string;
  setCustomerQuery: (q: string) => void;
  onboarded: boolean;
  environment: Environment;
  /** Production is selected but mainnet is not available yet. */
  productionLocked: boolean;
}

const Ctx = createContext<DashboardCtx | null>(null);

export function useDashboard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: onboarding } = useOnboarding();
  const environment = useEnvironment();
  const prevEnv = useRef(environment);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [newLinkOpen, setNewLinkOpen] = useState(false);
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");

  const onboarded = onboarding?.onboarded ?? false;
  const productionLocked = environment === "production" && !PRODUCTION_READY;

  const openNewLink = useCallback(() => {
    if (onboarding && !onboarding.onboarded) {
      router.push("/dashboard/onboarding");
      return;
    }
    if (productionLocked) return;
    setNewLinkOpen(true);
  }, [onboarding, router, productionLocked]);

  const openNewInvoice = useCallback(() => {
    if (onboarding && !onboarding.onboarded) {
      router.push("/dashboard/onboarding");
      return;
    }
    if (productionLocked) return;
    setNewInvoiceOpen(true);
  }, [onboarding, router, productionLocked]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      queueMicrotask(() => setNewLinkOpen(true));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Sandbox and production are separate data sets; drop cached results whenever
  // the active environment changes so views never show mixed data.
  useEffect(() => {
    if (prevEnv.current === environment) return;
    prevEnv.current = environment;
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
  }, [environment, queryClient]);

  return (
    <Ctx.Provider
      value={{
        payment,
        openPayment: setPayment,
        closePayment: () => setPayment(null),
        newLinkOpen,
        openNewLink,
        closeNewLink: () => setNewLinkOpen(false),
        newInvoiceOpen,
        openNewInvoice,
        closeNewInvoice: () => setNewInvoiceOpen(false),
        invoiceId,
        openInvoice: setInvoiceId,
        closeInvoice: () => setInvoiceId(null),
        paletteOpen,
        setPaletteOpen,
        customerQuery,
        setCustomerQuery,
        onboarded,
        environment,
        productionLocked,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
