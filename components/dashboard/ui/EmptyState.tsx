"use client";

import type { ReactNode } from "react";

export default function EmptyState({
  icon,
  eyebrow,
  title,
  description,
  action,
  tone = "accent",
  className = "",
}: {
  icon: ReactNode;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "accent" | "danger";
  className?: string;
}) {
  const glow = tone === "danger" ? "bg-d-failed/20" : "bg-d-accent/20";
  const accentText = tone === "danger" ? "text-d-failed" : "text-d-accent";
  const ring =
    tone === "danger"
      ? "border-d-failed/30"
      : "border-d-edge";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-d-edge d-card px-6 py-16 text-center ${className}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-28 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-[90px] ${glow}`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />

      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border bg-d-raised ${ring} ${accentText} d-glow`}
        >
          {icon}
        </div>

        {eyebrow && (
          <p
            className={`mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] ${accentText}`}
          >
            {eyebrow}
          </p>
        )}

        <h2 className="mt-2 font-sans text-[20px] font-medium tracking-[-0.01em] text-d-ink">
          {title}
        </h2>
        <p className="mt-2.5 text-[13px] leading-[1.6] text-d-muted">{description}</p>

        {action && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
