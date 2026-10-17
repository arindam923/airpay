"use client";

import { downloadCsv } from "../utils";

export default function ExportButton({
  filename,
  title,
  rows,
}: {
  filename: string;
  title: string;
  rows: (string | number)[][];
}) {
  return (
    <button
      onClick={() => downloadCsv(filename, rows)}
      className="flex h-9 items-center gap-2 rounded-lg border border-d-edge bg-d-panel px-3.5 text-[12.5px] font-medium text-d-ink transition-colors hover:bg-d-raised"
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 1.5v8M7 1.5L4 4.5M7 1.5l3 3M2 9.5v2A1.5 1.5 0 003.5 13h7a1.5 1.5 0 001.5-1.5v-2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Export {title}
    </button>
  );
}
