"use client";

import type { ReactNode } from "react";
import Skeleton from "./Skeleton";

export type Column<T> = {
  header: string;
  align?: "left" | "right";
  cell: (row: T, index: number) => ReactNode;
  width?: string;
};

export default function DataTable<T extends { id: string }>({
  items,
  columns,
  minWidth = "min-w-[720px]",
  onRowClick,
  isSelected,
  loading = false,
  skeletonRows = 5,
  emptyState = "No results.",
}: {
  items: T[];
  columns: Column<T>[];
  minWidth?: string;
  onRowClick?: (row: T) => void;
  isSelected?: (row: T) => boolean;
  loading?: boolean;
  skeletonRows?: number;
  emptyState?: ReactNode;
}) {
  const interactive = Boolean(onRowClick);

  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidth} text-left`}>
        <thead>
          <tr className="border-b border-d-edge-soft text-[11px] font-medium uppercase tracking-[0.1em] text-d-muted/70">
            {columns.map((c) => (
              <th
                key={c.header}
                style={c.width ? { width: c.width } : undefined}
                className={`px-5 py-3 font-medium ${c.align === "right" ? "text-right" : ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-d-edge-soft/60 last:border-0">
                  {columns.map((_, ci) => (
                    <td key={ci} className="px-5 py-3.5">
                      <Skeleton className="h-3.5 w-full max-w-[140px]" />
                      {ci === 0 && <Skeleton className="mt-2 h-3 w-2/3 max-w-[100px]" />}
                    </td>
                  ))}
                </tr>
              ))
            : items.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  aria-current={isSelected?.(row) ? "true" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  role={interactive ? "button" : undefined}
                  className={`group border-b border-d-edge-soft/60 transition-colors last:border-0 hover:bg-d-raised/60 ${
                    isSelected?.(row) ? "bg-d-raised/80" : ""
                  } ${
                    interactive
                      ? "cursor-pointer focus:outline-none focus:bg-d-raised"
                      : ""
                  }`}
                >
                  {columns.map((c, ci) => (
                    <td key={ci} className={`px-5 py-3.5 ${c.align === "right" ? "text-right" : ""}`}>
                      {c.cell(row, i)}
                    </td>
                  ))}
                </tr>
              ))}
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-5 py-12 text-center text-[13px] text-d-muted">
                {emptyState}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
