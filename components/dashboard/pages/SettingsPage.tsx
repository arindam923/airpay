"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";

const currencies = ["USDC", "USDT", "EURC", "PYUSD"];
const schedules = ["Instant", "Daily", "Weekly", "Monthly"];

function Toggle({
  on,
  onChange,
  label,
  desc,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-d-edge-soft/60 py-3.5 last:border-0">
      <div>
        <p className="text-[13px] font-medium text-d-ink">{label}</p>
        <p className="text-[11.5px] text-d-muted">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-d-accent" : "bg-d-edge"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            on ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState("Lattice Studio");
  const [currency, setCurrency] = useState(currencies[0]);
  const [schedule, setSchedule] = useState(schedules[1]);
  const [payoutWallet, setPayoutWallet] = useState("0x7a3b9c1e4f5d8a2b6c0e9f29d");
  const [emailPayouts, setEmailPayouts] = useState(true);
  const [emailFailures, setEmailFailures] = useState(true);
  const [emailProduct, setEmailProduct] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace.trim()) {
      setError("Workspace name is required.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{8,}$/.test(payoutWallet.trim())) {
      setError("Payout wallet must be a valid 0x address.");
      return;
    }
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace preferences, settlement, and notifications."
      />

      {saved && (
        <div className="mb-4 rounded-xl border border-d-success/40 bg-d-success/10 px-4 py-3 text-[13px] font-medium text-d-ink">
          Settings saved.
        </div>
      )}

      <form onSubmit={save} className="flex flex-col gap-4">
        <section className="rounded-xl border border-d-edge bg-d-panel p-5">
          <h2 className="text-[14px] font-medium text-d-ink">Workspace</h2>
          <p className="mt-0.5 text-[12px] text-d-muted">Shown on invoices and receipts.</p>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Workspace name</span>
            <input
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="h-10 w-full max-w-[380px] rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13.5px] text-d-ink focus:border-d-accent focus:outline-none"
            />
          </label>
        </section>

        <section className="rounded-xl border border-d-edge bg-d-panel p-5">
          <h2 className="text-[14px] font-medium text-d-ink">Settlement</h2>
          <p className="mt-0.5 text-[12px] text-d-muted">How and where you receive funds.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Settlement currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3 text-[13.5px] text-d-ink focus:border-d-accent focus:outline-none"
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Payout schedule</span>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3 text-[13.5px] text-d-ink focus:border-d-accent focus:outline-none"
              >
                {schedules.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Treasury wallet</span>
              <input
                value={payoutWallet}
                onChange={(e) => setPayoutWallet(e.target.value)}
                spellCheck={false}
                className="h-10 w-full rounded-lg border border-d-edge bg-d-raised px-3.5 font-mono text-[13px] text-d-ink focus:border-d-accent focus:outline-none"
              />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-d-edge bg-d-panel p-5">
          <h2 className="text-[14px] font-medium text-d-ink">Notifications</h2>
          <p className="mt-0.5 text-[12px] text-d-muted">Emails sent to arindam@airpay.dev.</p>
          <div className="mt-2">
            <Toggle on={emailPayouts} onChange={setEmailPayouts} label="Payout processed" desc="When a settlement lands in your treasury wallet." />
            <Toggle on={emailFailures} onChange={setEmailFailures} label="Payment failures" desc="Instant alert when a payment fails to confirm." />
            <Toggle on={emailProduct} onChange={setEmailProduct} label="Product updates" desc="New features and changelog, once a month." />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="h-10 rounded-lg bg-d-accent px-5 text-[13px] font-medium text-white transition-colors hover:bg-d-accent-deep"
          >
            Save changes
          </button>
          {error && <p className="text-[12.5px] font-medium text-d-failed">{error}</p>}
        </div>
      </form>
    </>
  );
}
