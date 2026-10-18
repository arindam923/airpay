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
    <section id="cta" className="bg-coral py-[110px] text-cream">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="mx-auto max-w-[760px] text-center">
          <h2 className="font-sans text-[clamp(36px,5vw,68px)] font-medium leading-[1.02] tracking-[-0.035em]">
            Ready to accept your first payment?
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-[1.6] text-cream/85">
            Join the waitlist and we&apos;ll send you an API key and a sandbox
            environment when access opens. No credit card required.
          </p>

          {status === "success" ? (
            <div className="mx-auto mt-9 inline-flex items-center gap-3 rounded-full border-2 border-ink bg-cream px-8 py-4 text-ink shadow-[4px_4px_0_var(--color-ink)]">
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
                You&apos;re on the list — we&apos;ll be in touch.
              </span>
            </div>
          ) : (
            <form
              className="mx-auto mt-9 flex max-w-[520px] flex-col gap-3 sm:flex-row"
              onSubmit={submit}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={status === "loading"}
                className="flex-1 rounded-full border-2 border-ink bg-cream px-6 py-4 text-[15px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-4 focus:ring-ink/20 disabled:opacity-60"
              />
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
                className="rounded-full bg-ink px-8 py-4 text-[15px] font-semibold text-cream shadow-[4px_4px_0_var(--color-sun)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "loading" ? "Joining…" : "Join waitlist"}
              </button>
            </form>
          )}

          {status === "error" && error && (
            <p className="mt-4 text-[13px] font-medium text-cream/90">{error}</p>
          )}
        </div>
      </div>
    </section>
  );
}
