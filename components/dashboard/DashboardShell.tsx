"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DashboardProvider, useDashboard } from "./DashboardContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "./CommandPalette";
import NewLinkModal from "./NewLinkModal";
import PaymentDrawer from "./PaymentDrawer";
import SetupBanner from "./SetupBanner";

function Shell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setPaletteOpen } = useDashboard();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);

  return (
    <div className="min-h-screen bg-d-bg text-d-ink">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-[248px]">
        <Topbar onMenu={() => setSidebarOpen(true)} />
        <main className="mx-auto max-w-[1240px] px-4 py-6 md:px-6 md:py-8">
          <SetupBanner />
          {children}
          <p className="mt-8 text-center text-[11.5px] text-d-muted/60">
            AirPay dashboard
          </p>
        </main>
      </div>

      <CommandPalette />
      <NewLinkModal />
      <PaymentDrawer />
    </div>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <Shell>{children}</Shell>
    </DashboardProvider>
  );
}
