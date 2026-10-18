"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnboarding } from "./onboarding/useOnboarding";

export default function SetupBanner() {
  const pathname = usePathname();
  const { data, isLoading } = useOnboarding();

  if (isLoading || !data || data.onboarded) return null;
  if (pathname === "/dashboard/onboarding") return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-d-accent/40 bg-d-accent/10 px-4 py-3.5 d-card">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-d-accent/20">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1.5l5 2.5v4c0 3-2.1 5.3-5 6.5-2.9-1.2-5-3.5-5-6.5V4l5-2.5z"
              stroke="#5e6ad2"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <p className="text-[13px] font-medium text-d-ink">Finish setting up your account</p>
          <p className="text-[12px] text-d-muted">
            Add your networks and payout wallet to start accepting payments.
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/onboarding"
        className="d-glow flex h-9 items-center rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
      >
        Finish setup
      </Link>
    </div>
  );
}
