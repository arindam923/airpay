"use client";

import type { CSSProperties } from "react";

export default function Skeleton({
  className = "",
  rounded = "rounded-md",
  style,
}: {
  className?: string;
  rounded?: string;
  style?: CSSProperties;
}) {
  return <div aria-hidden className={`d-skeleton ${rounded} ${className}`} style={style} />;
}
