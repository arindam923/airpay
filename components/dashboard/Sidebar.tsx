"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  {
    group: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: "M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z" },
      { label: "Payments", href: "/dashboard/payments", icon: "M3 5h18v4H3zM3 11h18v4H3z" },
      { label: "Payouts", href: "/dashboard/payouts", icon: "M10 3v9m0 0L6.5 8.5M10 12l3.5-3.5M4 15v1a2 2 0 002 2h8a2 2 0 002-2v-1" },
      { label: "Customers", href: "/dashboard/customers", icon: "M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM2 19c0-2.8 2.7-5 6-5s6 2.2 6 5M12 19c.4-2.3 2.8-4 6-4" },
      { label: "Webhooks", href: "/dashboard/webhooks", icon: "M10 14a4 4 0 108 0m-8 0H3m16 0h-3m-3-6a4 4 0 10-8 0" },
    ],
  },
  {
    group: "Configuration",
    items: [
      { label: "API keys", href: "/dashboard/api-keys", icon: "M13 3l8 8-8 8-2-2 6-6-6-6 2-2zM11 11L3 19" },
      { label: "Settings", href: "/dashboard/settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zm7-3l2 1.5-2 3.5-2.5-.5a7 7 0 01-2 1.2L14 20h-4l-.5-2.5a7 7 0 01-2-1.2l-2.5.5-2-3.5L5 12l-2-1.5 2-3.5 2.5.5a7 7 0 012-1.2L10 4h4l.5 2.5a7 7 0 012 1.2l2.5-.5 2 3.5L19 12z" },
      { label: "Audit log", href: "/dashboard/audit-log", icon: "M4 6h16M4 10h16M4 14h10M4 18h7" },
    ],
  },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

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
          <span className="ml-auto rounded-md border border-d-edge bg-d-raised px-1.5 py-0.5 font-mono text-[10px] text-d-muted">
            prod
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {nav.map((section) => (
            <div key={section.group} className="mb-6">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-d-muted/70">
                {section.group}
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
          <div className="rounded-xl border border-d-edge bg-d-raised p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-d-ink">Pro plan</p>
              <span className="rounded-full bg-d-accent/15 px-2 py-0.5 text-[10px] font-semibold text-d-accent">
                0.9% fee
              </span>
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-d-edge">
              <div className="h-full w-[68%] rounded-full bg-d-accent" />
            </div>
            <p className="mt-2 text-[11px] text-d-muted">$284k of $500k monthly volume</p>
          </div>

          <button className="mt-2 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-d-raised">
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
