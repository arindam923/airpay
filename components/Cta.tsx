"use client";

import { useState } from "react";

export default function Cta() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <section id="cta" className="bg-coral py-[110px] text-cream">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="mx-auto max-w-[760px] text-center">
          <h2 className="font-sans text-[clamp(36px,5vw,68px)] font-medium leading-[1.02] tracking-[-0.035em]">
            Ready to accept your first payment?
          </h2>
          <p className="mx-auto mt-5 max-w-[46ch] text-[16px] leading-[1.6] text-cream/85">
            Drop your email and we&apos;ll send you an API key and a sandbox
            environment. No credit card required.
          </p>

          {sent ? (
            <div className="mx-auto mt-9 inline-flex items-center gap-3 rounded-full border-2 border-ink bg-cream px-8 py-4 text-ink shadow-[4px_4px_0_var(--color-ink)]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint">
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5l2.5 2.5L10 3.5" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[15px] font-semibold">Check your inbox — your sandbox key is on its way.</span>
            </div>
          ) : (
            <form
              className="mx-auto mt-9 flex max-w-[520px] flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSent(true);
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 rounded-full border-2 border-ink bg-cream px-6 py-4 text-[15px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-4 focus:ring-ink/20"
              />
              <button
                type="submit"
                className="rounded-full bg-ink px-8 py-4 text-[15px] font-semibold text-cream shadow-[4px_4px_0_var(--color-sun)] transition-all hover:-translate-y-0.5"
              >
                Get API key
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
