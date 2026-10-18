"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import StatsRow from "./StatsRow";
import RevenueChart from "./RevenueChart";
import ChainBreakdown from "./ChainBreakdown";
import PaymentsTable from "./PaymentsTable";
import OverviewSkeleton from "./OverviewSkeleton";
import EmptyState from "./ui/EmptyState";
import Skeleton from "./ui/Skeleton";
import { useDashboard } from "./DashboardContext";
import type { RangeKey } from "./data";
import PageHeader from "./PageHeader";
import ExportButton from "./ui/ExportButton";
import { orpcClient } from "@/lib/orpc/client";
import type { PublicIntent } from "@/lib/api-types";
import { toPayment } from "./utils";
import { deriveChains, deriveChart, deriveStats, formatRange } from "./metrics";

function EmptyIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3 8.5V16l9 4.5 9-4.5V8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path
        d="M12 13.5V20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8v5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
      <path
        d="M10.3 4.2 2.7 17.6A2 2 0 0 0 4.4 20.6h15.2a2 2 0 0 0 1.7-3l-7.6-13.4a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Overview() {
  const { openPayment, openNewLink } = useDashboard();
  const [range, setRange] = useState<RangeKey>("7D");
  const [query, setQuery] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await orpcClient.payments.listByOrg({})) as PublicIntent[],
  });

  const [now] = useState<number | null>(() =>
    typeof window === "undefined" ? null : Date.now()
  );

  const intents = useMemo(() => data ?? [], [data]);
  const hasData = intents.length > 0;

  const metrics = useMemo(() => {
    if (now == null) return null;
    return {
      rows: intents.map(toPayment),
      stats: deriveStats(intents, now),
      series: deriveChart(intents, range, now),
      chains: deriveChains(intents),
      span: formatRange(intents),
    };
  }, [intents, range, now]);

  const loading = isLoading || metrics == null;

  let body: ReactNode;
  if (loading) {
    body = <OverviewSkeleton />;
  } else if (isError) {
    body = (
      <EmptyState
        tone="danger"
        icon={<ErrorIcon />}
        eyebrow="Connection issue"
        title="We couldn't load your payments"
        description="Something went wrong while fetching your workspace activity. Check your connection and try again."
        action={
          <button
            onClick={() => refetch()}
            className="d-glow h-10 rounded-lg bg-d-accent px-5 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
          >
            Try again
          </button>
        }
      />
    );
  } else if (!hasData || metrics == null) {
    body = (
      <EmptyState
        icon={<EmptyIcon />}
        eyebrow="No activity yet"
        title="Your dashboard is ready"
        description="Create your first payment link to start accepting crypto. Payments, revenue, and settlements will show up here in real time."
        action={
          <>
            <button
              onClick={openNewLink}
              className="d-glow flex h-10 items-center gap-1.5 rounded-lg bg-d-accent px-5 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
            >
              Create payment link
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <a
              href="/docs"
              className="flex h-10 items-center rounded-lg border border-d-edge px-5 text-[13px] font-medium text-d-ink transition-colors hover:bg-d-raised"
            >
              Read the docs
            </a>
          </>
        }
      />
    );
  } else {
    const { rows, stats, series, chains } = metrics;
    body = (
      <>
        <StatsRow stats={stats} />

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart series={series} range={range} onRange={setRange} />
          </div>
          <ChainBreakdown chains={chains} />
        </div>

        <div className="mt-4">
          <PaymentsTable
            items={rows}
            query={query}
            onSearch={setQuery}
            onRowClick={openPayment}
          />
        </div>
      </>
    );
  }

  const headerRows = metrics?.rows ?? [];
  const headerSpan = metrics?.span;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Real-time payment activity across your workspace."
        actions={
          loading ? (
            <Skeleton className="h-9 w-40 rounded-lg" />
          ) : hasData ? (
            <>
              {headerSpan && (
                <span className="flex h-9 items-center gap-2 rounded-lg border border-d-edge bg-d-panel px-3.5 text-[12.5px] text-d-muted">
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M1.5 5.5h11M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  {headerSpan}
                </span>
              )}
              <ExportButton
                filename="payments.csv"
                title="CSV"
                rows={[
                  ["Payment", "Customer", "Email", "Amount", "Coin", "Chain", "Status", "Time"],
                  ...headerRows.map((p) => [p.id, p.customer, p.email, p.amount, p.coin, p.chain, p.status, p.time]),
                ]}
              />
            </>
          ) : undefined
        }
      />

      {body}
    </>
  );
}
