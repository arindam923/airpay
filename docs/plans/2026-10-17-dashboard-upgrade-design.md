# Dashboard design-system upgrade — design

Date: 2026-10-17
Scope: all 8 dashboard pages (overview, payments, customers, payouts, webhooks, api-keys, audit-log, settings) plus shell (sidebar, topbar, command palette).
Direction: elevated dark theme — keep current `d-*` token identity, push it premium. No new dependencies.

## Goals

- Nicer tables and dramatically better charts; remove the plain/basic feel.
- Deduplicate the ~10 repeated patterns found across dashboard files into shared primitives.
- Preserve all existing functionality: filters, search, CSV export, copy feedback, keyboard handling, drawer/modal/palette flows.

## Non-goals

- No new dependencies (no shadcn, no recharts).
- No changes to marketing pages, pay/checkout flow, API routes, or worker.
- No data-layer changes (mock data in `data.ts` stays).

## New shared primitives (`components/dashboard/ui/`)

- `Card` + `CardHeader` — panel with subtle gradient top-edge; `CardHeader` has title/description and an optional `actions` slot. Used by every section card and table card.
- `DataTable` — generic table driven by a columns config (header, cell renderer, align). Sticky-capable thead with refined uppercase micro-labels, hover row states, row click/keyboard support, empty state, right-aligned numeric columns.
- `StatusChip` — single status map for Confirmed / Pending / Failed / Paid / Processing / Scheduled / Delivered / Retrying / Active / Revoked; dot + soft tinted chip, pulsing dot on Pending/Retrying. Replaces 5 duplicated maps.
- `Segmented` — filter pill group (segmented control) used by table filters and modals.
- `Toggle` — accessible switch (button with `role="switch"`, `aria-checked`) replacing Webhooks + Settings duplicates.
- `CopyButton` — copy with temporary copied state; replaces 5 copy implementations.
- `SearchInput` — magnifier filter field; replaces 3+ inline copies.
- `KvRow` — key/value list rows used in PaymentDrawer and CustomersPage aside.

## Theme elevation (`app/globals.css`)

- Layered surface system: page bg → panel → raised with hairline gradients and refined edge colors.
- Accent ambient glow: soft outer glow on primary accent buttons and the revenue chart area.
- Elevation: refined shadows for drawer, modal, palette, dropdowns.
- Consistency: `text-cream` on all accent fills (replaces mixed `text-white`).

## Charts

- `RevenueChart` — bar+area combo: bars for volume series, smoothed Catmull–Rom area/line for revenue; y-axis on the left with clean tick formatting; animated line draw-in; crosshair with glassy tooltip; range pills (24H/7D/30D/90D) kept.
- `StatsRow` — gradient-filled sparklines with end dot; delta chips get direction arrows.
- `ChainBreakdown` — upgraded to SVG donut ring with per-chain colors and center total, plus legend rows with progress bars.

## Page refactors

- **Overview** — uses `PageHeader` (removing its duplicated header markup), `StatsRow`, upgraded charts, `PaymentsTable` rebuilt on `DataTable`.
- **Payments** — `PaymentsTable` full-width on `DataTable` with searchable, filterable columns.
- **Customers** — customer table + detail aside rebuilt on `DataTable` + `KvRow`.
- **Payouts** — KPI cards + payouts table via `Data/table primitives`, `StatusChip`, `Segmented`.
- **Webhooks** — endpoints cards + deliveries table; add-endpoint form; `Toggle`, `CopyButton`, `StatusChip`.
- **API keys** — create form + key cards; `Toggle` patterns via `Segmented`/chips, `CopyButton`, revoke danger styling.
- **Audit log** — searchable, filterable row list on shared primitives.
- **Settings** — section cards on shared `Card`; local `Toggle` replaced by shared one; save validation unchanged.
- **Sidebar / Topbar / CommandPalette** — single shared nav source; real SVG icons in palette replacing text glyphs; polished notification dropdown.

## Verification

- `npm run lint` and `npm run typecheck` clean.
- Visual check with `next dev` covering all 8 pages, drawer, modal, palette.
