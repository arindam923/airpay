"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDashboard } from "./DashboardContext";
import { useOnboarding } from "./onboarding/useOnboarding";
import { CHAINS, formatUsd } from "@/components/pay/config";
import { orpcClient } from "@/lib/orpc/client";
import CopyButton from "./ui/CopyButton";
import type { InvoiceTemplate, PublicInvoiceDetail } from "@/lib/api-types";

interface DraftItem {
  key: string;
  description: string;
  quantity: string;
  unitUsd: string;
}

let seq = 0;
function newItem(): DraftItem {
  seq += 1;
  return { key: `item-${seq}`, description: "", quantity: "1", unitUsd: "" };
}

const TEMPLATES: { value: InvoiceTemplate; label: string }[] = [
  { value: "minimal", label: "Minimal" },
  { value: "classic", label: "Classic" },
  { value: "branded", label: "Branded" },
];

function invoiceUrl(slug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/i/${slug}`;
}

export default function InvoiceComposer() {
  const { newInvoiceOpen } = useDashboard();
  if (!newInvoiceOpen) return null;
  return <ComposerBody />;
}

function ComposerBody() {
  const { closeNewInvoice } = useDashboard();
  const queryClient = useQueryClient();
  const { data: onboarding } = useOnboarding();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await orpcClient.settings.get()) as { workspaceName?: string } | null,
  });

  const pairs = onboarding?.enabledPairs ?? {};
  const chainKeys = Object.keys(pairs);
  const firstChain = chainKeys[0] ?? "";

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [taxRate, setTaxRate] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [template, setTemplate] = useState<InvoiceTemplate>("minimal");
  const [accent, setAccent] = useState("#6d5efc");
  const [chain, setChain] = useState(firstChain);
  const [coin, setCoin] = useState(pairs[firstChain]?.[0] ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<PublicInvoiceDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [emailState, setEmailState] = useState<
    { status: "sending" | "sent" | "error"; message?: string } | null
  >(null);

  const merchant = (settings?.workspaceName ?? "").trim() || "Merchant";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeNewInvoice();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeNewInvoice]);

  const chainName = (key: string) => CHAINS.find((c) => c.key === key)?.name ?? key;
  const coinsFor = (key: string) => pairs[key] ?? [];

  const subtotal = useMemo(
    () =>
      items.reduce((sum, it) => {
        const q = parseFloat(it.quantity);
        const u = parseFloat(it.unitUsd);
        return sum + (Number.isFinite(q) && Number.isFinite(u) ? q * u : 0);
      }, 0),
    [items],
  );
  const tax = useMemo(() => {
    const rate = parseFloat(taxRate);
    return Number.isFinite(rate) ? subtotal * (rate / 100) : 0;
  }, [subtotal, taxRate]);
  const total = subtotal + tax;

  const updateItem = (key: string, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!customerName.trim()) errs.customerName = "Customer name is required";
    if (customerEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customerEmail.trim()))
      errs.customerEmail = "Enter a valid email";
    if (!chain) errs.network = "Enable a network in setup first";

    const parsedItems = items.map((it) => ({
      description: it.description.trim(),
      quantity: parseFloat(it.quantity),
      unitUsd: parseFloat(it.unitUsd),
    }));
    if (parsedItems.some((it) => !it.description)) errs.items = "Every line needs a description";
    else if (parsedItems.some((it) => !(it.quantity > 0)))
      errs.items = "Quantities must be greater than zero";
    else if (parsedItems.some((it) => !(it.unitUsd >= 0)))
      errs.items = "Unit prices must be zero or more";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setCreating(true);
    setSubmitError(null);
    try {
      const rate = parseFloat(taxRate);
      const result = (await orpcClient.invoices.create({
        merchant,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        items: parsedItems,
        taxRate: Number.isFinite(rate) ? rate : 0,
        dueAt: dueDate ? new Date(`${dueDate}T23:59:59`).getTime() : null,
        notes: notes.trim() || null,
        template,
        accent,
        chain,
        coin,
      })) as PublicInvoiceDetail;
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setCreated(result);

      if (sendEmail && customerEmail.trim()) {
        setEmailState({ status: "sending" });
        try {
          await orpcClient.invoices.send({ id: result.id });
          setEmailState({ status: "sent" });
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
        } catch (err) {
          const message =
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Could not send the email.";
          setEmailState({ status: "error", message });
        }
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Could not create the invoice.";
      setSubmitError(message);
    } finally {
      setCreating(false);
    }
  };

  const reset = () => {
    setCustomerName("");
    setCustomerEmail("");
    setItems([newItem()]);
    setTaxRate("0");
    setDueDate("");
    setNotes("");
    setTemplate("minimal");
    setAccent("#6d5efc");
    setErrors({});
    setCreated(null);
    setSubmitError(null);
    setEmailState(null);
    setSendEmail(true);
  };

  const field =
    "h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13.5px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none";
  const cell =
    "h-10 rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13.5px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none";
  const invalid = "border-d-failed focus:border-d-failed";
  const errText = "mt-1 block text-[11.5px] font-medium text-d-failed";

  if (onboarding && !onboarding.onboarded) {
    return (
      <Overlay onClose={closeNewInvoice}>
        <div
          className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-d-edge bg-d-panel p-6 shadow-d-pop"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-[15px] font-medium text-d-ink">Finish setup first</h2>
          <p className="mt-1.5 text-[13px] leading-[1.5] text-d-muted">
            Add your networks and payout wallet before creating invoices.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={closeNewInvoice}
              className="h-10 rounded-lg border border-d-edge px-4 text-[13px] font-medium text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink"
            >
              Not now
            </button>
            <Link
              href="/dashboard/onboarding"
              onClick={closeNewInvoice}
              className="d-glow flex h-10 items-center rounded-lg bg-d-accent px-4 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
            >
              Finish setup
            </Link>
          </div>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={closeNewInvoice}>
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-d-edge bg-d-panel shadow-d-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-d-edge-soft px-5 py-4">
          <p className="text-[14px] font-semibold text-d-ink">
            {created ? "Invoice created" : "New invoice"}
          </p>
          <button
            onClick={closeNewInvoice}
            className="flex h-7 w-7 items-center justify-center rounded-md text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {created ? (
          <div className="p-5">
            <div className="flex items-center gap-3 rounded-2xl border border-d-success/40 bg-d-success/10 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-d-success">
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5l2.5 2.5L10 3.5" stroke="#0a0a0c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-d-ink">
                  {created.number} · {created.customerName}
                </p>
                <p className="text-[11.5px] text-d-muted">
                  {formatUsd(created.totalUsd)} · {created.token} on {created.chainName}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-d-edge bg-d-raised px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-d-ink">
                {invoiceUrl(created.slug)}
              </span>
              <CopyButton text={invoiceUrl(created.slug)} ariaLabel="Copy invoice link" copiedChildren="Copied!">
                Copy link
              </CopyButton>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.open(invoiceUrl(created.slug), "_blank", "noopener")}
                className="d-glow h-10 flex-1 rounded-lg bg-d-accent text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
              >
                Open invoice
              </button>
              <button
                onClick={reset}
                className="h-10 rounded-lg border border-d-edge px-4 text-[13px] font-medium text-d-ink transition-colors hover:bg-d-raised"
              >
                Create another
              </button>
              <button
                onClick={closeNewInvoice}
                className="h-10 rounded-lg border border-d-edge px-4 text-[13px] font-medium text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink"
              >
                Done
              </button>
            </div>

            {emailState?.status === "sent" && (
              <p className="mt-3 rounded-lg border border-d-success/40 bg-d-success/10 px-3.5 py-2.5 text-[12.5px] font-medium text-d-ink">
                Emailed to {created.customerEmail}.
              </p>
            )}
            {emailState?.status === "error" && (
              <div className="mt-3 rounded-lg border border-d-failed/40 bg-d-failed/10 px-3.5 py-2.5 text-[12.5px] font-medium text-d-failed">
                <p>Invoice created, but the email could not be sent.</p>
                <p className="mt-0.5 font-normal">{emailState.message}</p>
              </div>
            )}
            {emailState?.status === "sending" && (
              <p className="mt-3 text-[12px] text-d-muted">Sending email…</p>
            )}

            <p className="mt-3 text-[12px] leading-[1.5] text-d-muted">
              Share this link anywhere, or send it again from the invoice.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Customer</span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Maya Chen"
                  className={`${field} ${errors.customerName ? invalid : ""}`}
                />
                {errors.customerName && <span className={errText}>{errors.customerName}</span>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">
                  Customer email
                </span>
                <input
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  type="email"
                  placeholder="maya@lattice.xyz"
                  className={`${field} ${errors.customerEmail ? invalid : ""}`}
                />
                {errors.customerEmail && <span className={errText}>{errors.customerEmail}</span>}
              </label>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12px] font-medium text-d-muted">Line items</span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, newItem()])}
                  className="text-[12px] font-medium text-d-accent hover:underline"
                >
                  Add line
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((it) => (
                  <div key={it.key} className="flex items-center gap-2">
                    <input
                      value={it.description}
                      onChange={(e) => updateItem(it.key, { description: e.target.value })}
                      placeholder="Design work"
                      className={`${cell} min-w-0 flex-1`}
                    />
                    <input
                      value={it.quantity}
                      onChange={(e) => updateItem(it.key, { quantity: e.target.value })}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Qty"
                      className={`${cell} w-[72px] shrink-0`}
                    />
                    <input
                      value={it.unitUsd}
                      onChange={(e) => updateItem(it.key, { unitUsd: e.target.value })}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit $"
                      className={`${cell} w-[96px] shrink-0`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setItems((prev) =>
                          prev.length > 1 ? prev.filter((x) => x.key !== it.key) : prev,
                        )
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-d-edge text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink"
                      aria-label="Remove line"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {errors.items && <span className={errText}>{errors.items}</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Tax rate (%)</span>
                <input
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className={field}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Due date</span>
                <input
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  type="date"
                  className={field}
                />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-d-edge bg-d-raised px-4 py-2.5 text-[13px]">
              <span className="text-d-muted">Subtotal {formatUsd(subtotal)}</span>
              <span className="font-medium text-d-ink">Total {formatUsd(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Template</span>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value as InvoiceTemplate)}
                  className={field}
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Accent color</span>
                <input
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  type="color"
                  className="h-10 w-full rounded-lg border border-d-edge bg-d-raised px-1.5"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">
                  Default network
                </span>
                <select
                  value={chain}
                  onChange={(e) => {
                    setChain(e.target.value);
                    const coins = coinsFor(e.target.value);
                    if (!coins.includes(coin)) setCoin(coins[0] ?? "");
                  }}
                  className={field}
                >
                  {chainKeys.map((key) => (
                    <option key={key} value={key}>
                      {chainName(key)}
                    </option>
                  ))}
                </select>
                {errors.network && <span className={errText}>{errors.network}</span>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">
                  Default coin
                </span>
                <select value={coin} onChange={(e) => setCoin(e.target.value)} className={field}>
                  {coinsFor(chain).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Thanks for your business."
                className="w-full rounded-lg border border-d-edge bg-d-raised px-3.5 py-2.5 text-[13.5px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none"
              />
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-d-edge bg-d-raised px-3.5 py-3">
              <input
                type="checkbox"
                checked={sendEmail && !!customerEmail.trim()}
                disabled={!customerEmail.trim()}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--d-accent,#6d5efc)]"
              />
              <span className="text-[12.5px] leading-[1.5] text-d-ink">
                Email the invoice link to the customer after creating it
                <span className="mt-0.5 block text-[11.5px] text-d-muted">
                  {customerEmail.trim()
                    ? `Sent to ${customerEmail.trim()} from AirPay on your behalf.`
                    : "Add a customer email above to enable sending."}
                </span>
              </span>
            </label>

            {submitError && (
              <p className="rounded-lg border border-d-failed/40 bg-d-failed/10 px-3.5 py-2.5 text-[12.5px] font-medium text-d-failed">
                {submitError}
              </p>
            )}

            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNewInvoice}
                className="rounded-lg border border-d-edge px-4 py-2 text-[13px] font-medium text-d-ink transition-colors hover:bg-d-raised"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="d-glow rounded-lg bg-d-accent px-4 py-2 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating
                  ? "Creating…"
                  : sendEmail && customerEmail.trim()
                    ? "Create & send"
                    : "Create invoice"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {children}
    </div>
  );
}
