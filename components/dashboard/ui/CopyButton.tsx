"use client";

import { useState, type ReactNode } from "react";
import { copyText } from "../utils";

export default function CopyButton({
  text,
  children,
  copiedChildren = "Copied",
  compact = false,
  ariaLabel,
}: {
  text: string;
  children?: ReactNode;
  copiedChildren?: ReactNode;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }
      }}
      className={`rounded-md border font-medium transition-colors ${
        compact ? "p-1.5" : "px-2.5 py-1.5 text-[11.5px]"
      } ${
        copied
          ? "border-d-success text-d-success"
          : "border-d-edge text-d-muted hover:border-d-muted/50 hover:text-d-ink"
      }`}
    >
      {copied ? copiedChildren : children}
    </button>
  );
}
