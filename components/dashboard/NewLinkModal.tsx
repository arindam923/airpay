"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import {
  CHAINS,
  buildCheckoutUrl,
  coinsForChain,
  formatUsd,
  type AmountMode,
} from "@/components/pay/config";
import CopyButton from "./ui/CopyButton";

export default function NewLinkModal() {
  const { newLinkOpen } = useDashboard();
  if (!newLinkOpen) return null;
  return <LinkModalBody />;
}

function LinkModalBody() {
  const { closeNewLink } = useDashboard();
  const [merchant, setMerchant] = useState("Lattice Studio");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<AmountMode>("fixed");
  const [amount, setAmount] = useState("");
  const [min, setMin] = useState("");
  const [sugg, setSugg] = useState("");
  const [max, setMax] = useState("");
  const [chain, setChain] = useState(CHAINS[0].name);
  const [coin, setCoin] = useState(CHAINS[0].coins[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [link, setLink] = useState<string | null>(null);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeNewLink();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeNewLink]);

  const num = (v: string): number => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!merchant.trim()) errs.merchant = "Merchant name is required";
    if (!title.trim()) errs.title = "Title is required";

    let outAmount = 0;
    let outMin = 0;
    let outMax: number | null = null;

    if (mode === "fixed") {
      const a = num(amount);
      if (!(a > 0)) errs.amount = "Enter a valid amount";
      outAmount = a;
    } else {
      const mn = num(min);
      const sg = sugg.trim() === "" ? NaN : num(sugg);
      const mx = max.trim() === "" ? NaN : num(max);
      if (!(mn > 0)) errs.min = "Enter a minimum";
      if (Number.isFinite(sg) && Number.isFinite(mn) && sg < mn)
        errs.sugg = "Must be ≥ minimum";
      if (Number.isFinite(mx) && Number.isFinite(mn) && mx <= mn)
        errs.max = "Must exceed minimum";
      if (Number.isFinite(sg) && Number.isFinite(mx) && sg > mx)
        errs.sugg = "Must be ≤ maximum";
      outMin = mn;
      outMax = Number.isFinite(mx) ? mx : null;
      outAmount = Number.isFinite(sg) ? sg : Number.isFinite(mn) ? mn : 0;
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const slug = Math.random().toString(36).slice(2, 8);
    const url = buildCheckoutUrl(window.location.origin, slug, {
      title: title.trim(),
      merchant: merchant.trim(),
      mode,
      amount: outAmount,
      min: outMin,
      max: outMax,
      chain,
      coin,
    });
    setSummary(
      mode === "fixed"
        ? `${formatUsd(outAmount)} · ${coin} on ${chain}`
        : `Customer decides · ${formatUsd(outMin)} – ${
            outMax != null ? formatUsd(outMax) : "no max"
          }${outAmount > 0 ? ` · suggested ${formatUsd(outAmount)}` : ""}`
    );
    setLink(url);
  };

  const reset = () => {
    setTitle("");
    setAmount("");
    setMin("");
    setSugg("");
    setMax("");
    setMode("fixed");
    setErrors({});
    setLink(null);
    setSummary("");
  };

  const field =
    "h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13.5px] text-d-ink placeholder:text-d-muted/60 focus:border-d-accent focus:outline-none";
  const invalid = "border-d-failed focus:border-d-failed";
  const errText = "mt-1 block text-[11.5px] font-medium text-d-failed";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={closeNewLink}
    >
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-d-edge bg-d-panel shadow-d-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-d-edge-soft px-5 py-4">
          <p className="text-[14px] font-semibold text-d-ink">
            {link ? "Payment link created" : "New payment link"}
          </p>
          <button
            onClick={closeNewLink}
            className="flex h-7 w-7 items-center justify-center rounded-md text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {link ? (
          <div className="p-5">
            <div className="flex items-center gap-3 rounded-2xl border border-d-success/40 bg-d-success/10 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-d-success">
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5l2.5 2.5L10 3.5" stroke="#0a0a0c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-d-ink">{title}</p>
                <p className="text-[11.5px] text-d-muted">{summary}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-d-edge bg-d-raised px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-d-ink">{link}</span>
              <CopyButton text={link} ariaLabel="Copy checkout link" copiedChildren="Copied!">
                Copy link
              </CopyButton>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.open(link, "_blank", "noopener")}
                className="d-glow h-10 flex-1 rounded-lg bg-d-accent text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
              >
                Open checkout
              </button>
              <button
                onClick={reset}
                className="h-10 rounded-lg border border-d-edge px-4 text-[13px] font-medium text-d-ink transition-colors hover:bg-d-raised"
              >
                Create another
              </button>
              <button
                onClick={closeNewLink}
                className="h-10 rounded-lg border border-d-edge px-4 text-[13px] font-medium text-d-muted transition-colors hover:bg-d-raised hover:text-d-ink"
              >
                Done
              </button>
            </div>

            <p className="mt-3 text-[12px] leading-[1.5] text-d-muted">
              The hosted checkout page is live now. Share the link anywhere — no
              code required.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex max-h-[78vh] flex-col gap-4 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Merchant</span>
                <input
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="Lattice Studio"
                  className={`${field} ${errors.merchant ? invalid : ""}`}
                />
                {errors.merchant && <span className={errText}>{errors.merchant}</span>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Invoice #1042"
                  className={`${field} ${errors.title ? invalid : ""}`}
                />
                {errors.title && <span className={errText}>{errors.title}</span>}
              </label>
            </div>

            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-d-muted">
                Who sets the amount?
              </span>
              <div className="flex gap-1 rounded-lg border border-d-edge bg-d-raised p-1">
                {(
                  [
                    { value: "fixed", label: "Merchant sets it" },
                    { value: "flex", label: "Customer decides" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMode(opt.value)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                      mode === opt.value
                        ? "bg-d-ink text-d-bg"
                        : "text-d-muted hover:text-d-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "fixed" ? (
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Amount (USD)</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="1250.00"
                  className={`${field} ${errors.amount ? invalid : ""}`}
                />
                {errors.amount && <span className={errText}>{errors.amount}</span>}
              </label>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Min (USD)</span>
                    <input
                      value={min}
                      onChange={(e) => setMin(e.target.value)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="10"
                      className={`${field} ${errors.min ? invalid : ""}`}
                    />
                    {errors.min && <span className={errText}>{errors.min}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Suggested</span>
                    <input
                      value={sugg}
                      onChange={(e) => setSugg(e.target.value)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="100"
                      className={`${field} ${errors.sugg ? invalid : ""}`}
                    />
                    {errors.sugg && <span className={errText}>{errors.sugg}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Max</span>
                    <input
                      value={max}
                      onChange={(e) => setMax(e.target.value)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="500"
                      className={`${field} ${errors.max ? invalid : ""}`}
                    />
                    {errors.max && <span className={errText}>{errors.max}</span>}
                  </label>
                </div>
                <p className="mt-2 text-[11.5px] leading-[1.5] text-d-muted">
                  The payer chooses an amount within these bounds. Leave Suggested
                  or Max empty to skip them.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">
                  Default network
                </span>
                <select
                  value={chain}
                  onChange={(e) => {
                    setChain(e.target.value);
                    const coins = coinsForChain(e.target.value);
                    if (!coins.includes(coin)) setCoin(coins[0]);
                  }}
                  className={field}
                >
                  {CHAINS.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-d-muted">
                  Default coin
                </span>
                <select
                  value={coin}
                  onChange={(e) => setCoin(e.target.value)}
                  className={field}
                >
                  {coinsForChain(chain).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="text-[11.5px] leading-[1.5] text-d-muted">
              Payers can switch the network and coin on the checkout page — these
              are just the pre-selected defaults.
            </p>

            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNewLink}
                className="rounded-lg border border-d-edge px-4 py-2 text-[13px] font-medium text-d-ink transition-colors hover:bg-d-raised"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="d-glow rounded-lg bg-d-accent px-4 py-2 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
              >
                Create link
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
