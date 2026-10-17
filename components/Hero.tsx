"use client";

const brands = [
  "matter.",
  "Explo",
  "towa",
  "stamps",
  "RIGID",
  "Kilter",
  "Northbeam",
  "Hexlab",
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-6 pt-16 pb-16 md:px-10 lg:pt-20">
        <div className="grid grid-cols-12 items-center gap-y-12 lg:gap-x-10">
          <div className="col-span-12 lg:col-span-6">
            <div className="animate-rise inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-sun px-4 py-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 0l1.6 4.4L13 6l-4.4 1.6L7 12 5.4 7.6 1 6l4.4-1.6L7 0z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">
                crypto payments made easy
              </span>
            </div>

            <h1 className="animate-rise stagger-1 mt-7 font-sans text-[clamp(52px,6.4vw,96px)] font-medium leading-[0.98] tracking-[-0.035em]">
              Accept crypto.
              <br />
              <span className="text-violet">Settle instantly.</span>
            </h1>

            <p className="animate-rise stagger-2 mt-7 max-w-[44ch] text-lg leading-[1.55] text-ink-soft">
              The payment gateway for the modern internet. Non-custodial,
              sub-second confirmation, and every tool your team needs.
            </p>

            <div className="animate-rise stagger-3 mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#cta"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-8 py-3.5 text-[15px] font-medium text-cream shadow-[4px_4px_0_var(--color-violet)] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--color-violet)]"
              >
                Create free account
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 7h10M8 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <a
                href="/dashboard"
                className="inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-ink bg-cream px-8 py-3.5 text-[15px] font-medium transition-all hover:-translate-y-0.5 hover:bg-sun"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 1.5v9l7.5-4.5L3 1.5z" fill="currentColor" />
                </svg>
                Get live demo
              </a>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <HeroCard />
          </div>
        </div>
      </div>

      <div className="border-t border-ink/10">
        <div className="mx-auto max-w-[1440px] px-6 py-10 md:px-10">
          <p className="mb-6 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Powering payments for
          </p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="animate-marquee flex w-max items-center gap-16 pr-16">
              {[...brands, ...brands].map((b, i) => (
                <span
                  key={`${b}-${i}`}
                  className="font-sans text-[22px] font-semibold tracking-[-0.02em] text-ink/35"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroCard() {
  return (
    <div className="relative mx-auto h-[540px] max-w-[520px]" data-ui>
      <div className="absolute -right-6 top-10 h-72 w-72 rounded-full bg-sun" />
      <div className="absolute -left-10 bottom-24 h-40 w-40 rounded-full border-[3px] border-dashed border-violet/50" />

      <div className="animate-float-a absolute -top-2 left-2 z-20 flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-cream px-4 py-2.5 shadow-[4px_4px_0_var(--color-ink)]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mint">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6.5l2.5 2.5L10 3.5"
              stroke="var(--color-ink)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <p className="text-[12px] font-semibold leading-none">Payment received</p>
          <p className="mt-1 text-[11px] leading-none text-ink-soft">confirmed in 0.78s</p>
        </div>
      </div>

      <div className="absolute left-1/2 top-1/2 z-10 w-[86%] max-w-[440px] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-[20px] border-2 border-ink bg-cream p-6 shadow-[10px_10px_0_var(--color-ink)]">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
              Payment link
            </p>
            <span className="flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-mint px-2.5 py-1 text-[11px] font-semibold">
              <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-ink" />
              Active
            </span>
          </div>

          <p className="mt-4 text-[15px] text-ink-soft">Invoice #1042 — Design package</p>
          <p className="mt-1 font-sans text-[44px] font-medium leading-none tracking-[-0.03em]">
            $1,250<span className="text-ink-soft">.00</span>
          </p>

          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
            Pay with
          </p>
          <div className="mt-2.5 flex gap-2">
            {[
              { s: "₿", c: "bg-sun" },
              { s: "Ξ", c: "bg-violet text-cream" },
              { s: "◎", c: "bg-mint" },
              { s: "$", c: "bg-sky" },
              { s: "S", c: "bg-pink text-cream" },
            ].map((coin, i) => (
              <span
                key={i}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-ink text-[15px] font-semibold ${coin.c}`}
              >
                {coin.s}
              </span>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl border-[1.5px] border-ink/15 bg-paper px-4 py-3">
            <div>
              <p className="text-[11px] text-ink-soft">To your wallet</p>
              <p className="font-mono text-[13px]">0x7a3b…f29d</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink-soft">
              <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 5V3a2 2 0 00-2-2H3a2 2 0 00-2 2v6a2 2 0 002 2h2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>

          <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-violet py-3.5 text-[15px] font-semibold text-cream shadow-[3px_3px_0_var(--color-ink)] transition-all hover:bg-violet-deep">
            Pay $1,250.00
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-soft">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <rect x="2" y="4.5" width="7" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M3.8 4.5V3a1.8 1.8 0 013.5 0v1.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Secured by AirPay · Non-custodial
          </p>
        </div>
      </div>

      <div className="animate-float-b absolute -left-2 bottom-6 z-20 flex h-24 w-24 flex-col items-center justify-center rounded-full border-2 border-ink bg-coral text-center shadow-[4px_4px_0_var(--color-ink)]">
        <span className="text-[19px] font-semibold leading-none text-cream">0.9%</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-cream/80">
          flat fee
        </span>
      </div>

      <div className="animate-float-a absolute -right-1 top-24 z-20 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-violet shadow-[4px_4px_0_var(--color-ink)]">
        <span className="text-[20px] font-semibold text-cream">Ξ</span>
      </div>
      <div className="animate-float-b absolute bottom-40 right-0 z-20 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-ink bg-pink shadow-[4px_4px_0_var(--color-ink)]">
        <span className="text-[17px] font-semibold text-cream">S</span>
      </div>
    </div>
  );
}
