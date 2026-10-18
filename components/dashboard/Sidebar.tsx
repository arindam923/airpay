"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "./nav";
import { setEnvironment, useEnvironment } from "@/lib/env-store";
import { PRODUCTION_READY } from "@/lib/environment";

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const env = useEnvironment();
  const productionLocked = env === "production" && !PRODUCTION_READY;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-d-edge bg-d-panel transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-d-edge-soft px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet font-sans text-[12px] font-semibold text-cream">
              A
            </span>
            <span className="font-sans text-[14px] font-semibold tracking-[-0.01em] text-d-ink">
              AirPay
            </span>
          </Link>
        </div>

        <div className="px-3 pb-2 pt-3">
          <div className="relative grid grid-cols-2 gap-0 rounded-lg bg-d-raised p-1">
            <span
              aria-hidden
              className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-md border border-d-edge bg-d-panel shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-out ${
                env === "production" ? "translate-x-full" : "translate-x-0"
              }`}
            />
            {(["sandbox", "production"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setEnvironment(option)}
                aria-pressed={env === option}
                className={`relative z-10 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium capitalize transition-colors ${
                  env === option ? "text-d-ink" : "text-d-muted hover:text-d-ink/80"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    option === "production" ? "bg-d-success" : "bg-amber-400"
                  } ${env === option ? "" : "opacity-50"}`}
                />
                {option}
                {option === "production" && !PRODUCTION_READY && (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="opacity-70">
                    <path
                      d="M2.5 4.5V3.5a2.5 2.5 0 015 0v1M2 4.5h6v4H2z"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
          {productionLocked && (
            <p className="mt-2 px-1 text-[10.5px] leading-tight text-amber-400/90">
              Mainnet isn&apos;t enabled yet. Sandbox runs on testnets.
            </p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((section) => (
            <div key={section.title} className="mb-6">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                {section.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={onClose}
                      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors ${
                        active
                          ? "bg-d-raised font-medium text-d-ink"
                          : "text-d-muted hover:bg-d-raised/60 hover:text-d-ink"
                      }`}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill="none"
                        className={active ? "text-d-accent" : "text-d-muted"}
                      >
                        <path d={item.icon} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {item.label}
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-d-accent" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-d-edge-soft p-3">
          <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-d-raised">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet text-[11px] font-semibold text-cream">
              AR
            </span>
            <span className="text-left">
              <span className="block text-[12px] font-medium leading-tight text-d-ink">Arindam Roy</span>
              <span className="block text-[10px] leading-tight text-d-muted">arindam@airpay.dev</span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
