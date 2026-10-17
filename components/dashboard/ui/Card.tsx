"use client";

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-2xl border border-d-edge d-card ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-d-edge-soft px-5 py-4">
      <div>
        <h2 className="text-[14px] font-medium text-d-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[12px] text-d-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export default Card;
