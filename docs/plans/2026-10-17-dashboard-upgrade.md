# Dashboard Design-System Upgrade Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this task-by-task.

**Goal:** Upgrade all 8 AirPay dashboard pages to a premium elevated-dark look with shared UI primitives, cleaned-up duplication, and dramatically better charts/tables.

**Architecture:** Introduce `components/dashboard/ui/` primitives (Card, DataTable, chips, toggles, etc.), elevate theme tokens/utilities in `app/globals.css`, rebuild the 3 chart components, then refactor each page and shell component onto the primitives. No new dependencies; all logic/behavior preserved.

**Tech Stack:** Next.js 16.4.2 (App Router, all client components already), React 19, Tailwind CSS v4 (`@theme` tokens in `app/globals.css`), TypeScript. No test framework — verify with `npm run typecheck` + `npm run lint` + visual check via `npm run dev`.

**Design doc:** `docs/plans/2026-10-17-dashboard-upgrade-design.md`

**Notes for the implementer:**
- Read each file before editing it. Preserve every behavior: CSV export, copy feedback, keyboard/drawer/palette flows, validation.
- This repo's AGENTS.md warns this Next.js version differs from training data. We only touch client component code and CSS — no Next APIs are added — so the standard app-router guides under `node_modules/next/dist/docs/` apply if any doubt arises.
- Existing `d-*` tokens live in `app/globals.css` `@theme` block; keep using them.
- Verification after each task: `npm run typecheck` (must pass), then commit.

---

## Task 1: Theme elevation — `app/globals.css`

**Files:**
- Modify: `app/globals.css`

**Changes:**

1. In the `@theme` block, add tokens (after `--color-d-failed`):

```css
  --color-d-accent-glow: rgba(94, 106, 210, 0.45);
  --shadow-d-card: inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-d-pop: 0 0 0 1px rgba(255, 255, 255, 0.06), 0 24px 60px -16px rgba(0, 0, 0, 0.75);
  --shadow-d-drawer: 0 0 0 1px rgba(255, 255, 255, 0.07), -16px 0 60px -20px rgba(0, 0, 0, 0.8);
```

2. Add component classes after the token block (before `html {`), used by primitives below:

```css
/* Elevated surface: subtle top-light gradient + hairline inner highlight */
.d-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0) 90px), var(--color-d-panel);
  box-shadow: var(--shadow-d-card);
}

/* Accent ambient glow for primary buttons / chart emphasis */
.d-glow {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset, 0 4px 20px -6px var(--color-d-accent-glow);
}

/* Glassy popover/tooltip surface */
.d-glass {
  background: color-mix(in srgb, var(--color-d-raised) 80%, transparent);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-d-pop);
}

@keyframes draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.animate-draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: draw 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
```

3. Add `.animate-draw` to the list inside the `prefers-reduced-motion` media query.

**Verify:** `npm run typecheck` → pass. Commit: `feat: elevate dashboard theme tokens and surface utilities`.

---

## Task 2: Primitives batch 1 — Card, CardHeader, Avatar, ExportButton

**Files:**
- Create: `components/dashboard/ui/Card.tsx`
- Create: `components/dashboard/ui/Avatar.tsx`
- Create: `components/dashboard/ui/ExportButton.tsx`

**Step 1: Card.tsx**

```tsx
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
```

**Step 2: Avatar.tsx** (initials chip, violet styling reused from PaymentsTable/Customers)

```tsx
export default function Avatar({
  name,
  size = 28,
  solid = false,
}: {
  name: string;
  size?: number;
  solid?: boolean;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${
        solid ? "bg-violet text-cream" : "bg-violet/20 text-violet"
      }`}
    >
      {initials}
    </span>
  );
}
```

**Step 3: ExportButton.tsx** (dedupe of the Export CSV button used on 5 pages)

```tsx
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
```

**Verify:** `npm run typecheck` → pass. Commit: `feat: add card, avatar, export button primitives`.

---

## Task 3: Primitives batch 2 — StatusChip, Segmented, Toggle

**Files:**
- Create: `components/dashboard/ui/StatusChip.tsx`
- Create: `components/dashboard/ui/Segmented.tsx`
- Create: `components/dashboard/ui/Toggle.tsx`

**Step 1: StatusChip.tsx** — replaces 5 duplicated chip maps.

```tsx
type Tone = "success" | "pending" | "failed" | "accent" | "info" | "neutral";

const TONES: Record<Tone, { chip: string; dot: string; pulse?: boolean }> = {
  success: { chip: "bg-d-success/10 text-d-success", dot: "bg-d-success" },
  pending: { chip: "bg-d-pending/10 text-d-pending", dot: "bg-d-pending", pulse: true },
  failed: { chip: "bg-d-failed/10 text-d-failed", dot: "bg-d-failed" },
  accent: { chip: "bg-d-accent/10 text-d-accent", dot: "bg-d-accent" },
  info: { chip: "bg-violet/15 text-violet", dot: "bg-violet" },
  neutral: { chip: "bg-d-raised text-d-muted", dot: "bg-d-edge" },
};

const STATUS_TONE: Record<string, Tone> = {
  Confirmed: "success",
  Delivered: "success",
  Paid: "success",
  Active: "success",
  Pending: "pending",
  Processing: "pending",
  Retrying: "pending",
  Failed: "failed",
  Revoked: "failed",
  Scheduled: "accent",
  Payments: "success",
  Settings: "accent",
  Security: "info",
};

export default function StatusChip({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const tone = TONES[STATUS_TONE[status] ?? "neutral"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${tone.chip}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${tone.dot} ${tone.pulse ? "animate-pulse-dot" : ""}`}
      />
      {label ?? status}
    </span>
  );
}
```

**Step 2: Segmented.tsx**

```tsx
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-d-edge bg-d-raised p-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
            value === o ? "bg-d-ink text-d-bg" : "text-d-muted hover:text-d-ink"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
```

**Step 3: Toggle.tsx** (bare switch; pages compose their own label/desc rows)

```tsx
export default function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        on ? "bg-d-accent" : "bg-d-edge"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0 h-4 w-4 rounded-full bg-cream shadow transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
```

**Verify:** `npm run typecheck` → pass. Commit: `feat: add status chip, segmented control, toggle primitives`.

---

## Task 4: Primitives batch 3 — CopyButton, SearchInput, KvList

**Files:**
- Create: `components/dashboard/ui/CopyButton.tsx`
- Create: `components/dashboard/ui/SearchInput.tsx`
- Create: `components/dashboard/ui/KvList.tsx`

**Step 1: CopyButton.tsx**

```tsx
"use client";

import { useState } from "react";
import { copyText } from "../utils";

export default function CopyButton({
  text,
  children,
  copiedChildren = "Copied",
  compact = false,
  ariaLabel,
}: {
  text: string;
  children?: React.ReactNode;
  copiedChildren?: React.ReactNode;
  compact?: boolean;
  ariaLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
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
```

(Callers pass children + optional copiedChildren, e.g. `children="Copy URL"` / `copiedChildren="Copied"`.)

**Step 2: SearchInput.tsx**

```tsx
export default function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  width = "w-[170px]",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  width?: string;
}) {
  return (
    <div className="relative">
      <svg
        width="12"
        height="12"
        viewBox="0 0 14 14"
        fill="none"
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-d-muted"
      >
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`h-8 ${width} rounded-lg border border-d-edge bg-d-raised pl-8 pr-3 text-[12.5px] text-d-ink placeholder:text-d-muted/70 focus:border-d-accent focus:outline-none`}
      />
    </div>
  );
}
```

**Step 3: KvList.tsx** (key/value panel used in PaymentDrawer + Customers aside)

```tsx
export default function KvList({
  items,
}: {
  items: [string, React.ReactNode][];
}) {
  return (
    <div className="rounded-xl border border-d-edge bg-d-raised/60">
      {items.map(([k, v], i) => (
        <div
          key={k + String(i)}
          className="flex items-center justify-between border-b border-d-edge-soft px-4 py-2.5 text-[13px] last:border-0"
        >
          <span className="text-d-muted">{k}</span>
          <span className="text-d-ink">{v}</span>
        </div>
      ))}
    </div>
  );
}
```

**Verify:** `npm run typecheck` → pass. Commit: `feat: add copy button, search input, kv list primitives`.

---

## Task 5: DataTable primitive

**Files:**
- Create: `components/dashboard/ui/DataTable.tsx`

```tsx
"use client";

import type { ReactNode } from "react";

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
  emptyState = "No results.",
}: {
  items: T[];
  columns: Column<T>[];
  minWidth?: string;
  onRowClick?: (row: T) => void;
  isSelected?: (row: T) => boolean;
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
          {items.map((row, i) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => e.key === "Enter" && onRowClick(row)
                  : undefined
              }
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
              {columns.map((c) => (
                <td key={c.header} className={`px-5 py-3.5 ${c.align === "right" ? "text-right" : ""}`}>
                  {c.cell(row, i)}
                </td>
              ))}
            </tr>
          ))}
          {items.length === 0 && (
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
```

**Verify:** `npm run typecheck` → pass. Commit: `feat: add generic DataTable primitive`.

---

## Task 6: Add volume series to mock data

**Files:**
- Modify: `components/dashboard/data.ts`

**Changes:**
- Extend each entry of `chartData` with `volumes: number[]` (same length as `points`). Deterministic hand-written arrays that roughly track the revenue shape (e.g. for a ~$1,000–3,000 daily revenue point list, volumes are transaction counts 110–320). These render as faint bars behind the revenue line.
- Export nothing else new. `RangeKey`, `ranges`, `xLabels` unchanged.

**Verify:** `npm run typecheck` → pass. Commit: `feat: add volume series to chart mock data`.

---

## Task 7: RevenueChart rewrite — bars + area combo

**Files:**
- Modify: `components/dashboard/RevenueChart.tsx` (full rewrite, same props: `{ range, onRange }`)

**Spec (write complete new implementation):**
- Keep `W = 720, H = 260` viewBox, Catmull–Rom `smoothPath` helper, `useId` gradient.
- Layout: left y-axis now — reserve `PAD_LEFT = 44`, y tick labels (`fmt()`, $k style) anchored `start` at `x = 4`, grid lines dashed except baseline; x labels along bottom as today.
- **Volume bars**: from `chartData[range].volumes`, bars between revenue max and a dedicated volume scale (bar heights normalized to bottom ~34% of plot area), `fill="var(--color-d-accent)"` at `opacity 0.14`, rounded tops (rx=2), width = plot-width/points*0.55. Bars animate opacity on range change.
- **Revenue line/area**: normalized `pathLength={1}`, `className="animate-draw"` keyed by range; area gradient as today but slightly stronger (0.38→0), stroke `--color-d-accent` width 2.5, `d-glow`-style drop filter optional via `style={{ filter: "drop-shadow(0 0 12px var(--color-d-accent-glow))" }}`.
- **Hover**: track nearest point; render a subtle full-height highlight band (rect width = step, fill white 3%), crosshair line, dot, and a `.d-glass` tooltip (replace current solid tooltip) listing revenue `$X,XXX` and `N txns` using volumes[hover].
- Header/controls unchanged (range pills); keep title/subtitle text.
- On range change reset hover to null.

**Verify:** `npm run typecheck` → pass. Commit: `feat: upgrade revenue chart with volume bars, draw-in, glass tooltip`.

---

## Task 8: StatsRow upgrade

**Files:**
- Modify: `components/dashboard/StatsRow.tsx`

**Spec:**
- Sparkline → gradient area fill (per-card color: use `s.up ? --color-d-success : --color-d-failed`), same polyline coordinates but close the area with fill `url(#spark-gid)` using `useId`, opacity 0.25→0 gradient, keep end dot, add soft line stroke width 2.
- Delta chip: add arrow icon (up/down SVG) before `{s.delta}`; keep green/red tinting; chip gets `rounded-md px-1.5 py-0.5`.
- Card container: switch `rounded-xl border border-d-edge bg-d-panel` → `rounded-2xl border border-d-edge d-card` (uses Task 1 surface); hover keeps `hover:border-d-muted/40`.
- Value typography unchanged (26px).

**Verify:** `npm run typecheck` → pass. Commit: `feat: upgrade stat cards with gradient sparklines and arrows`.

---

## Task 9: ChainBreakdown → donut + legend

**Files:**
- Modify: `components/dashboard/ChainBreakdown.tsx` (full rewrite)

**Spec:**
- SVG donut: 120×120 viewBox, r=46, strokeWidth 12, each chain a `circle` with `strokeDasharray={`${pct} ${100 - pct}`}` (use pathLength=100), `strokeLinecap="round"`? No — butt caps, rotate -90 via transform, each offset accumulating `${previousSum}%`.
- Center: total volume in `font-mono text-[15px] font-semibold` + `text-[10px] text-d-muted` "Total volume".
- Legend: under donut, one row per chain — color dot (c.color), name, amount right-aligned (`font-mono text-d-muted`), and 2px mini progress bar under name (bar color c.color, width pct%).
- Card container: `Card`/`d-card` classes, `rounded-2xl`; keep title "Volume by chain" + "Last 30 days" subtitle.
- Keep parsing of `c.amount` for totals.

**Verify:** `npm run typecheck` → pass. Commit: `feat: upgrade chain breakdown to donut ring with legend`.

---

## Task 10: PaymentsTable refactor onto primitives

**Files:**
- Modify: `components/dashboard/PaymentsTable.tsx`

**Spec:**
- Wrap in `Card` + `CardHeader` (title "Recent payments", description `{rows.length} of {payments.length} payments`, actions = SearchInput + `Segmented`).
- Table → `DataTable<Payment>` with columns: Payment (mono id, `group-hover:text-d-accent`), Customer (Avatar size 28 + name/email two-liner), Amount (coin dot via `coinColors` + mono amount + coin ticker), Chain (`rounded-md border border-d-edge bg-d-raised px-2 py-1 text-[11.5px] text-d-muted` chip), Status (`StatusChip status={p.status}`), Time (right-aligned, `text-[12px] text-d-muted`). `onRowClick` passes `openPayment`; `emptyState` keeps the "No payments match..." copy.
- Delete local `statusStyle`/`statusDot` maps. Keep filter/search state logic identical. `round section container` classes removed (Card handles).

**Verify:** `npm run typecheck` → pass. Commit: `refactor: payments table onto shared primitives`.

---

## Task 11: Overview refactor

**Files:**
- Modify: `components/dashboard/Overview.tsx`

**Spec:**
- Replace duplicated inline header with `PageHeader` (`title="Overview"`, description same, actions = the date-range chip + ExportButton with payments CSV rows — reuse existing export data mapping).
- Wrap StatsRow/charts/tables sections in consistent spacing (`gap-4 mt-4` rhythm as today). Charts and PaymentsTable imports unchanged.
- Page paddings stay; Overview's card surfaces inherit Task 7–9 upgrades.

Also **Modify: `components/dashboard/pages/PaymentsPage.tsx`** — swap its header Export button block for `ExportButton` (filename `payments.csv`, title "CSV") and rely on the refactored PaymentsTable. No logic change.

**Verify:** `npm run typecheck` → pass. Commit: `refactor: overview uses PageHeader/export primitive; payments page cleanup`.

---

## Task 12: Payouts page

**Files:**
- Modify: `components/dashboard/pages/PayoutsPage.tsx`

**Spec:**
- KPI cards: same 3 cards, but `rounded-2xl border border-d-edge d-card p-5` and value size 24px unchanged; add a small tally line? No — keep content identical.
- Section → `Card` + `CardHeader` ("All payouts") with actions = `Segmented` filter (options `["All","Paid","Processing","Scheduled"]`).
- Table → `DataTable` columns: Payout (mono), Date, Amount (mono), Destination (mono muted), Status (right-aligned `StatusChip`).
- Header export button → `ExportButton` (payouts.csv).
- Delete local status maps.

**Verify:** `npm run typecheck` → pass. Commit: `refactor: payouts page onto primitives`.

---

## Task 13: Customers page

**Files:**
- Modify: `components/dashboard/pages/CustomersPage.tsx`

**Spec:**
- Table section → `Card` + `CardHeader` ("All customers", actions = `SearchInput` wired to `customerQuery`) and `DataTable` (columns: Customer with Avatar 28, Total mono, Payments, Last seen right). Keep row-select toggle behavior via `onRowClick` + `isSelected`.
- Aside → `Card` (rounded-2xl d-card p-5): header block with `Avatar solid size 44`; the kv rows block → `KvList` with the same 4 entries; recent payments list rows get `rounded-lg border border-d-edge bg-d-raised/60` and `hover:bg-d-raised` transitions; "Recent payments" label styling unchanged.
- Export button → `ExportButton` (customers.csv; export `rows`, not all customers, preserving current behavior).

**Verify:** `npm run typecheck` → pass. Commit: `refactor: customers page onto primitives`.

---

## Task 14: Webhooks page

**Files:**
- Modify: `components/dashboard/pages/WebhooksPage.tsx`

**Spec:**
- Add-endpoint form card → `Card p-4` styling, primary CTA gets `d-glow` + `text-cream` (was `text-white`).
- Endpoints section → `Card` + `CardHeader`; endpoint rows: active dot stays, URL mono, event chips keep, replace inline copy button block with `CopyButton` (`children="Copy URL"`), replace inline switch with `Toggle` (`on={ep.active} label={ep.url}`). Keep pause/activate aria semantics via Toggle's label override: pass `label={ep.active ? "Pause endpoint" : "Activate endpoint"}`.
- Deliveries section → `Card` + `CardHeader` + `DataTable` (Event two-liner with HTTP code, Endpoint mono, Status as `StatusChip` + Retry button beside it when Failed, Time right). Delete local `deliveryStyle`.
- Note: `retry`/`addEndpoint` logic unchanged.

**Verify:** `npm run typecheck` → pass. Commit: `refactor: webhooks page onto primitives`.

---

## Task 15: API keys page

**Files:**
- Modify: `components/dashboard/pages/ApiKeysPage.tsx`

**Spec (read file first):**
- Section cards → `Card`/`d-card` rounded-2xl surfaces; section headers use `CardHeader` pattern where they have descriptions.
- Primary action buttons (`text-white`) → `text-cream` + `d-glow`.
- Any copy/reveal button blocks → reuse `CopyButton` where behavior matches (each key's copy button: `children` = current copy label). Reveal/hide and revoke keep their local logic; just align styling with primitives (danger revoke keeps red tint).
- Keep create-key form validation and fresh-secret banner as-is visually upgraded to `rounded-2xl`.

**Verify:** `npm run typecheck` → pass. Commit: `refactor: api keys page onto primitives`.

---

## Task 16: Audit log page

**Files:**
- Modify: `components/dashboard/pages/AuditLogPage.tsx`

**Spec:**
- Section → `Card` + `CardHeader` ("Activity", actions = `SearchInput` + `Segmented` filters).
- Row list: keep rows, replace local `typeStyle` chip with `StatusChip status={e.type}` (Payments/Settings/Security tones already mapped in Task 3). Row hover `hover:bg-d-raised/40`, styling consistent.
- Export button → `ExportButton` (audit-log.csv).

**Verify:** `npm run typecheck` → pass. Commit: `refactor: audit log page onto primitives`.

---

## Task 17: Settings page

**Files:**
- Modify: `components/dashboard/pages/SettingsPage.tsx`

**Spec:**
- Delete local `Toggle` component; import shared `ui/Toggle` (bare switch) and compose rows: label/desc left, `<Toggle .../>` right, rows keep border-b rhythm.
- Section cards → `Card`-style `rounded-2xl d-card p-5` with `CardHeader`-style headings.
- Inputs/selects: keep; `.d-card`-compliant focus (`focus:border-d-accent`) unchanged. Save button: `text-cream` + `d-glow`.
- Keep validation logic identical.

**Verify:** `npm run typecheck` → pass. Commit: `refactor: settings page onto shared toggle and cards`.

---

## Task 18: Payment drawer + new-link modal polish

**Files:**
- Modify: `components/dashboard/PaymentDrawer.tsx`
- Modify: `components/dashboard/NewLinkModal.tsx`

**Spec:**
- Drawer: panel gets `rounded-l-2xl` + `shadow-d-drawer` token; kv rows → `KvList`; any copy button → `CopyButton compact` (keep "Copy payment ID" text button as styled primitive variant with `copiedChildren="Copied ✓"` — match current behavior of setTimeout revert); status chip → `StatusChip`.
- Modal: replace local field class strings only where identical to primitives (copy button → `CopyButton`); primary CTA `text-cream` + `d-glow`; success banner rounded-2xl.
- No behavioral changes: drawer open/close, copy ids, form validation, success view all preserved.

**Verify:** `npm run typecheck` → pass. Commit: `refactor: drawer and modal polish with shared primitives`.

---

## Task 19: Shared nav + command palette icons

**Files:**
- Create: `components/dashboard/nav.ts`
- Modify: `components/dashboard/Sidebar.tsx`
- Modify: `components/dashboard/Topbar.tsx`
- Modify: `components/dashboard/CommandPalette.tsx`

**Spec:**
- `nav.ts`: export `NAV_GROUPS` — same Workspace/Configuration group titles and link objects (`{ label, href, icon }`) currently hard-coded in Sidebar. Also export `pageTitleForPath(path: string)` derived from all nav links (Topbar's map folds into this).
- Sidebar: consume `NAV_GROUPS` (icons as inline SVG path strings preserved visually).
- Topbar: breadcrumb title uses `pageTitleForPath` (fallback to current map behavior for unmatched paths).
- CommandPalette: consume nav list for page entries; replace text glyphs (`↗`, `¢`, `◉`) with small 14px SVG icons (arrow-up-right, coins circle, target circle) rendered as components; keep keyboard nav identical.

**Verify:** `npm run typecheck` → pass. Commit: `refactor: single nav source, svg icons in palette`.

---

## Task 20: Final verification

**Steps:**
1. `npm run lint` → fix any errors.
2. `npm run typecheck` → pass.
3. `npm run build` → pass (or `npm run dev` and manually check all 8 pages, ⌘K palette, drawer, new-link modal, notifications dropdown, csv export, copy buttons, toggles, retry flows).
4. Fix regressions; commit fixes.

Commit: `chore: dashboard upgrade final verification`.
