"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader } from "./ui/Card";
import Toggle from "./ui/Toggle";
import { orpcClient } from "@/lib/orpc/client";
import {
  APPEARANCE_PRESETS,
  DEFAULT_APPEARANCE,
  appearanceToCssVars,
  logoShapeClass,
  normalizeAppearance,
  safeBackgroundImage,
  type CheckoutAppearance,
} from "@/lib/checkout-appearance";

const inputClass =
  "h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13.5px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none";
const labelClass = "mb-1.5 block text-[12px] font-medium text-d-muted";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "M";
}

export default function CheckoutAppearanceEditor({
  initial,
}: {
  initial?: CheckoutAppearance | null;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CheckoutAppearance>(() => normalizeAppearance(initial));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof CheckoutAppearance>(key: K, value: CheckoutAppearance[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const applyPreset = (appearance: CheckoutAppearance) =>
    setDraft({ ...appearance, preset: appearance.preset });

  const save = useMutation({
    mutationFn: async () => await orpcClient.settings.updateCheckout(draft),
    onSuccess: () => {
      setError("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not save the checkout style.");
    },
  });

  const toggleMethod = (method: "wallet" | "qr") => {
    const on = draft.methods.includes(method);
    if (on && draft.methods.length === 1) return;
    const next = on ? draft.methods.filter((m) => m !== method) : [...draft.methods, method];
    set("methods", next);
  };

  return (
    <Card>
      <CardHeader
        title="Payment page"
        description="Theme the hosted checkout your customers see. Applies to every payment link and invoice."
        actions={
          <span className="rounded-full border border-d-edge bg-d-raised px-2.5 py-1 text-[11.5px] font-medium text-d-muted">
            Live preview
          </span>
        }
      />

      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3">
          <Section
            title="Presets"
            hint="One click sets everything below — keep tweaking after."
            defaultOpen
          >
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {APPEARANCE_PRESETS.map((p) => {
                const active = draft.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.appearance)}
                    aria-pressed={active}
                    className={`rounded-xl border p-2.5 text-left transition-colors ${
                      active
                        ? "border-d-accent bg-d-accent/10"
                        : "border-d-edge bg-d-raised hover:border-d-muted/50"
                    }`}
                  >
                    <span className="flex gap-1">
                      {p.swatch.map((c, i) => (
                        <span
                          key={i}
                          className="h-5 flex-1 rounded-md border border-black/10"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </span>
                    <span className="mt-2 block text-[12.5px] font-medium text-d-ink">{p.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-[1.4] text-d-muted">
                      {p.tagline}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            title="Brand"
            hint="Logo and name shown on the checkout."
            summary={`${draft.brandName || "Merchant name"} · ${draft.logoShape}${draft.showBranding ? "" : " · white-label"}`}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Brand name" hint="Leave blank to use the merchant / workspace name.">
                <input
                  value={draft.brandName}
                  onChange={(e) => set("brandName", e.target.value)}
                  placeholder="Acme Studio"
                  className={inputClass}
                />
              </Field>
              <Field label="Logo URL" hint="Square image; https link or /path in this app.">
                <input
                  value={draft.logoUrl}
                  onChange={(e) => set("logoUrl", e.target.value)}
                  placeholder="https://…/logo.png"
                  spellCheck={false}
                  className={`${inputClass} font-mono text-[12.5px]`}
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div>
                <span className={labelClass}>Logo shape</span>
                <Segmented
                  value={draft.logoShape}
                  options={[
                    { value: "circle", label: "Circle" },
                    { value: "rounded", label: "Rounded" },
                    { value: "square", label: "Square" },
                  ]}
                  onChange={(v) => set("logoShape", v as CheckoutAppearance["logoShape"])}
                />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <ToggleRow
                label="Show merchant avatar"
                desc="Logo or initials beside the brand name."
                on={draft.showAvatar}
                onChange={(v) => set("showAvatar", v)}
              />
              <ToggleRow
                label="Show AirPay branding"
                desc="Turn off for a fully white-label checkout."
                on={draft.showBranding}
                onChange={(v) => set("showBranding", v)}
              />
            </div>
          </Section>

          <Section
            title="Colors"
            hint="Full control over the palette."
            summary={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3.5 w-3.5 rounded border border-black/10"
                  style={{ backgroundColor: draft.accent }}
                />
                <span className="font-mono">{draft.accent}</span>
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
              <ColorField label="Accent / buttons" value={draft.accent} onChange={(v) => set("accent", v)} />
              <ColorField
                label="Button text"
                value={draft.accentText}
                onChange={(v) => set("accentText", v)}
              />
              <ColorField
                label="Page background"
                value={draft.background}
                onChange={(v) => set("background", v)}
              />
              <ColorField label="Card surface" value={draft.surface} onChange={(v) => set("surface", v)} />
              <ColorField label="Primary text" value={draft.text} onChange={(v) => set("text", v)} />
              <ColorField label="Muted text" value={draft.muted} onChange={(v) => set("muted", v)} />
              <ColorField label="Borders" value={draft.border} onChange={(v) => set("border", v)} />
            </div>
            <Field
              label="Background gradient / image (optional)"
              hint="A CSS gradient or an https image URL. Overrides the background color."
              className="mt-4"
            >
              <input
                value={draft.backgroundImage}
                onChange={(e) => set("backgroundImage", e.target.value)}
                placeholder="radial-gradient(120% 90% at 50% 0%, #1b2440, #0a0c14)"
                spellCheck={false}
                className={`${inputClass} font-mono text-[12px]`}
              />
            </Field>
          </Section>

          <Section
            title="Shape & layout"
            hint="Corners, borders and depth."
            summary={`Radius ${draft.radius}px · ${draft.buttonRadius >= 999 ? "pill" : `${draft.buttonRadius}px`} buttons · ${draft.borderWidth}px border · ${draft.shadow}`}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Slider
                label="Corner radius"
                value={draft.radius}
                min={0}
                max={36}
                step={1}
                suffix="px"
                onChange={(v) => set("radius", v)}
              />
              <Slider
                label="Button radius"
                value={draft.buttonRadius}
                min={0}
                max={999}
                step={1}
                display={draft.buttonRadius >= 999 ? "pill" : `${draft.buttonRadius}px`}
                onChange={(v) => set("buttonRadius", v)}
              />
              <Slider
                label="Border weight"
                value={draft.borderWidth}
                min={0}
                max={4}
                step={1}
                suffix="px"
                onChange={(v) => set("borderWidth", v)}
              />
              <div>
                <span className={labelClass}>Shadow</span>
                <Segmented
                  value={draft.shadow}
                  options={[
                    { value: "hard", label: "Hard" },
                    { value: "soft", label: "Soft" },
                    { value: "glow", label: "Glow" },
                    { value: "none", label: "None" },
                  ]}
                  onChange={(v) => set("shadow", v as CheckoutAppearance["shadow"])}
                />
              </div>
              <div>
                <span className={labelClass}>Card width</span>
                <Segmented
                  value={draft.width}
                  options={[
                    { value: "compact", label: "Compact" },
                    { value: "regular", label: "Regular" },
                    { value: "wide", label: "Wide" },
                  ]}
                  onChange={(v) => set("width", v as CheckoutAppearance["width"])}
                />
              </div>
            </div>
          </Section>

          <Section
            title="Content"
            hint="Copy shown around the payment form."
            summary={draft.headline || draft.subtext || draft.footerNote || "Default copy"}
          >
            <div className="grid grid-cols-1 gap-4">
              <Field label="Headline (optional)">
                <input
                  value={draft.headline}
                  onChange={(e) => set("headline", e.target.value)}
                  placeholder="Complete your order"
                  className={inputClass}
                />
              </Field>
              <Field label="Subtext (optional)">
                <input
                  value={draft.subtext}
                  onChange={(e) => set("subtext", e.target.value)}
                  placeholder="Pay securely with crypto — testnet demo."
                  className={inputClass}
                />
              </Field>
              <Field label="Footer note (optional)">
                <input
                  value={draft.footerNote}
                  onChange={(e) => set("footerNote", e.target.value)}
                  placeholder="Questions? billing@yourcompany.com"
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Payment methods & details"
            hint="What payers can use and see."
            summary={`${draft.methods.length > 1 ? "Wallet + QR" : draft.methods[0] === "qr" ? "QR only" : "Wallet only"}${draft.showFeeRow ? " · fee row" : ""}`}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className={labelClass}>Payment methods</span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "wallet", label: "Wallet connect" },
                      { value: "qr", label: "QR code" },
                    ] as const
                  ).map((m) => {
                    const on = draft.methods.includes(m.value);
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => toggleMethod(m.value)}
                        aria-pressed={on}
                        className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                          on
                            ? "border-d-accent bg-d-accent/15 text-d-ink"
                            : "border-d-edge text-d-muted hover:border-d-muted/50"
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11.5px] text-d-muted">At least one method is required.</p>
              </div>
              <div className="space-y-1">
                <ToggleRow
                  label="Network fee row"
                  desc="Show “Gas paid in your wallet”."
                  on={draft.showFeeRow}
                  onChange={(v) => set("showFeeRow", v)}
                />
                <ToggleRow
                  label="Testnet badges"
                  desc="Show the small “testnet” pills."
                  on={draft.showTestnetBadge}
                  onChange={(v) => set("showTestnetBadge", v)}
                />
              </div>
            </div>
          </Section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setError("");
                save.mutate();
              }}
              disabled={save.isPending}
              className="d-glow h-10 rounded-lg bg-d-accent px-5 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {save.isPending ? "Saving…" : "Save payment page"}
            </button>
            <button
              type="button"
              onClick={() => applyPreset(DEFAULT_APPEARANCE)}
              className="h-10 rounded-lg border border-d-edge px-4 text-[13px] font-medium text-d-ink transition-colors hover:bg-d-raised"
            >
              Reset to default
            </button>
            {saved && <span className="text-[12.5px] font-medium text-d-success">Saved.</span>}
            {error && <span className="text-[12.5px] font-medium text-d-failed">{error}</span>}
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <CheckoutPreview appearance={draft} />
        </div>
      </div>
    </Card>
  );
}

function Section({
  title,
  hint,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  /** Compact status shown beside the title while collapsed. */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-d-edge bg-d-panel/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[12.5px] font-semibold text-d-ink">{title}</span>
            {!open && summary && (
              <span className="truncate text-[11.5px] text-d-muted">{summary}</span>
            )}
          </span>
          {open && hint && <span className="mt-0.5 block text-[11.5px] text-d-muted">{hint}</span>}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`shrink-0 text-d-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2.5 4.5L6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        inert={!open}
        className={`grid transition-all duration-200 ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11.5px] leading-[1.5] text-d-muted">{hint}</span>}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-d-edge bg-d-raised p-1"
          aria-label={label}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className={`${inputClass} font-mono text-[12.5px]`}
        />
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  display?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-d-muted">{label}</span>
        <span className="text-[11.5px] font-medium text-d-ink">
          {display ?? `${value}${suffix ?? ""}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--color-d-accent)]"
        aria-label={label}
      />
    </div>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-d-edge bg-d-raised p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
            value === o.value ? "bg-d-ink text-d-bg" : "text-d-muted hover:text-d-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc?: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-d-edge-soft/60 py-3 last:border-0">
      <div>
        <p className="text-[13px] font-medium text-d-ink">{label}</p>
        {desc && <p className="text-[11.5px] text-d-muted">{desc}</p>}
      </div>
      <Toggle on={on} onChange={onChange} label={label} />
    </div>
  );
}

function CheckoutPreview({ appearance }: { appearance: CheckoutAppearance }) {
  const vars = appearanceToCssVars(appearance);
  const bg = safeBackgroundImage(appearance.backgroundImage);
  const brand = appearance.brandName || "Lattice Studio";
  return (
    <div className="rounded-xl border border-d-edge bg-d-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-d-muted">
          Preview
        </span>
        <span className="text-[11px] text-d-muted">Hosted checkout</span>
      </div>
      <div
        style={{ ...vars, ...(bg ? { backgroundImage: bg } : {}) } as React.CSSProperties}
        className="rounded-2xl bg-paper p-4 text-ink"
      >
        <div className="mx-auto w-full max-w-[var(--co-width)]">
          <div className="rounded-[var(--co-radius)] border-[length:var(--co-bw)] border-ink bg-cream p-4 shadow-[var(--co-shadow)]">
            {appearance.showBranding && (
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md border-[length:var(--co-bw)] border-ink bg-violet text-[10px] font-semibold text-[var(--co-accent-text)]">
                    A
                  </span>
                  <span className="text-[12px] font-semibold">AirPay</span>
                </span>
                <span className="text-[10px] text-ink-soft">Secure</span>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              {appearance.showAvatar && (
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border-[length:var(--co-bw)] border-ink bg-violet text-[11px] font-bold text-[var(--co-accent-text)] ${logoShapeClass(appearance.logoShape)}`}
                >
                  {appearance.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={appearance.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(brand)
                  )}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold">{brand}</p>
                <p className="truncate text-[11px] text-ink-soft">Order #1042</p>
              </div>
            </div>

            {appearance.headline && (
              <p className="mt-3 text-[12.5px] font-semibold">{appearance.headline}</p>
            )}

            <div className="mt-3 rounded-xl border-[length:var(--co-bw)] border-dashed border-ink/30 px-3 py-2.5">
              <p className="text-[10.5px] text-ink-soft">Amount due</p>
              <p className="mt-0.5 text-[22px] font-semibold leading-none">$50.00</p>
            </div>

            {appearance.subtext && (
              <p className="mt-2 text-[11px] leading-[1.5] text-ink-soft">{appearance.subtext}</p>
            )}

            <div className="mt-3 space-y-0.5 border-t border-ink/15 pt-2 text-[11.5px]">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-ink-soft">You pay</span>
                <span className="font-semibold">50.00 USDC</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-ink-soft">Network</span>
                <span className="flex items-center gap-1 font-medium">
                  Base
                  {appearance.showTestnetBadge && (
                    <span className="rounded-full border border-ink/25 px-1 py-px text-[8.5px] font-semibold uppercase text-ink-soft">
                      testnet
                    </span>
                  )}
                </span>
              </div>
              {appearance.showFeeRow && (
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-ink-soft">Network fee</span>
                  <span className="font-medium">Gas in wallet</span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="mt-3 flex h-9 w-full items-center justify-center rounded-[var(--co-btn-radius)] bg-violet text-[12.5px] font-semibold text-[var(--co-accent-text)] shadow-[var(--co-shadow-sm)]"
            >
              Pay $50.00
            </button>
          </div>

          {appearance.footerNote && (
            <p className="mt-2 text-center text-[10.5px] leading-[1.5] text-ink-soft">
              {appearance.footerNote}
            </p>
          )}
          {appearance.showBranding && (
            <p className="mt-1 text-center text-[10.5px] text-ink-soft">
              Powered by <span className="font-semibold text-violet">AirPay</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
