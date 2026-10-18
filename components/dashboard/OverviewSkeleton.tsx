"use client";

import Skeleton from "./ui/Skeleton";

const BAR_HEIGHTS = [64, 84, 72, 104, 92, 120, 98, 140, 112, 156, 132, 176, 148, 190];

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-d-edge d-card p-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="mt-3 h-2.5 w-24" />
    </div>
  );
}

export default function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard…</span>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-d-edge d-card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-40 rounded-lg" />
          </div>
          <div className="mt-6 flex h-[220px] items-end gap-1.5">
            {BAR_HEIGHTS.map((h, i) => (
              <Skeleton
                key={i}
                className="flex-1"
                rounded="rounded-sm"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-d-edge d-card p-5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-2 h-3 w-20" />
          <div className="mt-6 flex justify-center">
            <Skeleton className="h-32 w-32" rounded="rounded-full" />
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-d-edge d-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-d-edge-soft px-5 py-4">
          <div>
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-44 rounded-lg" />
        </div>
        <div className="divide-y divide-d-edge-soft/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-7" rounded="rounded-full" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="ml-auto h-3 w-16" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
