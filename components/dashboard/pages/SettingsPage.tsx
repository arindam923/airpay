"use client";

import { useState } from "react";
import PageHeader from "../PageHeader";
import { Card, CardHeader } from "../ui/Card";
import Toggle from "../ui/Toggle";

const currencies = ["USDC", "USDT", "EURC", "PYUSD"];
const schedules = ["Instant", "Daily", "Weekly", "Monthly"];

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
        <div className="mb-4 rounded-2xl border border-d-success/40 bg-d-success/10 px-4 py-3 text-[13px] font-medium text-d-ink">
          Settings saved.
        </div>
      )}

      <form onSubmit={save} className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Workspace" description="Shown on invoices and receipts." />
          <div className="p-5">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-d-muted">Workspace name</span>
              <input
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                className="h-10 w-full max-w-[380px] rounded-lg border border-d-edge bg-d-raised px-3.5 text-[13.5px] text-d-ink focus:border-d-accent focus:outline-none"
              />
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="Settlement" description="How and where you receive funds." />
          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          </div>
        </Card>

        <Card>
          <CardHeader title="Notifications" description="Emails sent to arindam@airpay.dev." />
          <div className="p-5">
            <div>
              {[
                { label: "Payout processed", desc: "When a settlement lands in your treasury wallet.", on: emailPayouts, set: setEmailPayouts },
                { label: "Payment failures", desc: "Instant alert when a payment fails to confirm.", on: emailFailures, set: setEmailFailures },
                { label: "Product updates", desc: "New features and changelog, once a month.", on: emailProduct, set: setEmailProduct },
              ].map(({ label, desc, on, set }) => (
                <div key={label} className="flex items-center justify-between border-b border-d-edge-soft/60 py-3.5 last:border-0">
                  <div>
                    <p className="text-[13px] font-medium text-d-ink">{label}</p>
                    <p className="text-[11.5px] text-d-muted">{desc}</p>
                  </div>
                  <Toggle on={on} onChange={set} label={label} />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="d-glow h-10 rounded-lg bg-d-accent px-5 text-[13px] font-medium text-cream transition-colors hover:bg-d-accent-deep"
          >
            Save changes
          </button>
          {error && <p className="text-[12.5px] font-medium text-d-failed">{error}</p>}
        </div>
      </form>
    </>
  );
}
