"use client";

import { useState } from "react";

export default function Cta() {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), website: hp }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not join the waitlist.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not join the waitlist.");
    }
  };

  return (
    <section id="cta" className="relative overflow-hidden bg-ink py-[120px] text-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, var(--color-violet) 0, transparent 45%), radial-gradient(circle at 80% 70%, var(--color-coral) 0, transparent 40%)",
        }}
      />
      <div className="relative mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="mx-auto max-w-[760px] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-cream/20 bg-cream/5 px-4 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-cream/80">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            Early access
          </span>
          <h2 className="mt-6 font-sans text-[clamp(40px,5.5vw,76px)] font-medium leading-[1.0] tracking-[-0.035em]">
            Be first in line for
            <br />
            <span className="text-violet">non-custodial payments.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[48ch] text-[17px] leading-[1.6] text-cream/75">
            Join the waitlist for AirPay. We&apos;ll email you when sandbox
            access opens — no credit card, no commitment.
          </p>

          {status === "success" ? (
            <div className="mx-auto mt-10 inline-flex items-center gap-3 rounded-full border-2 border-cream/20 bg-cream/10 px-8 py-4 backdrop-blur">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint">
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6.5l2.5 2.5L10 3.5"
                    stroke="var(--color-ink)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-[15px] font-semibold">
                You&apos;re on the list — check your inbox soon.
              </span>
            </div>
          ) : (
            <form
              className="mx-auto mt-10 flex max-w-[560px] flex-col gap-3 sm:flex-row"
              onSubmit={submit}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={status === "loading"}
                className="flex-1 rounded-full border-2 border-cream/20 bg-cream/5 px-6 py-4 text-[15px] text-cream placeholder:text-cream/40 focus:border-cream/60 focus:outline-none focus:ring-4 focus:ring-cream/10 disabled:opacity-60"
              />
              {/* Honeypot */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                className="absolute left-[-9999px] top-[-9999px] h-0 w-0 opacity-0"
                aria-hidden
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-full bg-violet px-8 py-4 text-[15px] font-semibold text-cream shadow-[4px_4px_0_var(--color-sun)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "loading" ? "Joining…" : "Join waitlist"}
              </button>
            </form>
          )}

          {status === "error" && error && (
            <p className="mt-4 text-[13px] font-medium text-coral">{error}</p>
          )}

          <p className="mt-8 text-[12px] text-cream/50">
            No spam. Unsubscribe anytime. Built for developers and merchants.
          </p>
        </div>
      </div>
    </section>
  );
}
