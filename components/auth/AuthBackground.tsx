"use client";

const coins = [
  { s: "₿", c: "bg-sun text-ink" },
  { s: "Ξ", c: "bg-violet text-cream" },
  { s: "◎", c: "bg-mint text-ink" },
  { s: "$", c: "bg-sky text-ink" },
  { s: "S", c: "bg-pink text-cream" },
];

export default function AuthBackground({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="relative hidden min-h-screen w-full overflow-hidden bg-ink lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
      {/* warm mesh base */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(85% 70% at 12% 6%, rgba(108,77,246,0.42), transparent 56%)," +
            "radial-gradient(75% 65% at 95% 92%, rgba(255,90,60,0.34), transparent 58%)," +
            "radial-gradient(55% 45% at 72% 18%, rgba(255,197,61,0.12), transparent 62%)," +
            "#14100d",
        }}
      />

      {/* fine graph grid */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,253,246,0.05) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,253,246,0.05) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          maskImage: "radial-gradient(ellipse 120% 100% at 30% 0%, black 20%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 120% 100% at 30% 0%, black 20%, transparent 78%)",
        }}
      />

      {/* concentric rings, top-right */}
      <div
        aria-hidden
        className="absolute -right-40 -top-44 h-[640px] w-[640px] rounded-full"
        style={{
          background:
            "repeating-radial-gradient(circle at center, transparent 0 37px, rgba(255,253,246,0.07) 37px 38px)",
          maskImage: "radial-gradient(circle at 50% 50%, black 38%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 38%, transparent 72%)",
        }}
      />

      {/* large outline squircle, bottom-left */}
      <div
        aria-hidden
        className="absolute -bottom-24 -left-20 h-80 w-80 rotate-12 rounded-[52px] border-2 border-cream/10"
      />
      <div
        aria-hidden
        className="absolute -bottom-10 -left-6 h-40 w-40 rotate-12 rounded-[36px] border-2 border-cream/[0.07]"
      />

      {/* brand accents */}
      <div aria-hidden className="absolute right-16 top-[58%] h-3 w-3 rounded-full bg-sun" />
      <div aria-hidden className="absolute right-28 top-[62%] h-2.5 w-2.5 rotate-45 bg-coral" />
      <div aria-hidden className="absolute left-12 top-[42%] h-2 w-2 rounded-full bg-mint/70" />

      {/* floating status card */}
      <div aria-hidden className="animate-float-a absolute right-10 top-28 z-20">
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-cream px-4 py-3 shadow-[5px_5px_0_var(--color-violet)]">
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
            <p className="text-[12px] font-semibold leading-none text-ink">Payment received</p>
            <p className="mt-1 text-[11px] leading-none text-ink-soft">confirmed in 0.78s</p>
          </div>
        </div>
      </div>

      {/* floating chain chips */}
      <div aria-hidden className="animate-float-b absolute right-12 top-[46%] z-20">
        <div className="flex -space-x-2">
          {coins.map((coin, i) => (
            <span
              key={i}
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink text-[14px] font-semibold shadow-[2px_2px_0_rgba(0,0,0,0.4)] ${coin.c}`}
            >
              {coin.s}
            </span>
          ))}
        </div>
      </div>

      {/* floating fee badge */}
      <div
        aria-hidden
        className="animate-float-a absolute bottom-32 right-14 z-20 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ink bg-violet shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
      >
        <span className="text-[22px] font-semibold text-cream">Ξ</span>
      </div>

      {/* grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 opacity-[0.4] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* content */}
      <div className="animate-rise relative z-40 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-cream/25 bg-cream/10 text-[16px] font-bold text-cream shadow-[3px_3px_0_rgba(0,0,0,0.35)] backdrop-blur-sm">
          A
        </span>
        <span className="font-sans text-[20px] font-semibold tracking-[-0.01em] text-cream">AirPay</span>
      </div>

      <div className="relative z-40 max-w-md">
        <div className="animate-rise stagger-1 mb-6 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/[0.06] px-3.5 py-1.5 backdrop-blur-sm">
          <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-mint" />
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-cream/80">
            Payments, reimagined
          </span>
        </div>

        <h2 className="animate-rise stagger-2 font-sans text-[42px] font-semibold leading-[1.04] tracking-[-0.025em] text-cream">
          {title}
        </h2>
        <p className="animate-rise stagger-3 mt-4 max-w-[38ch] text-[15px] leading-relaxed text-cream/70">
          {subtitle}
        </p>

        <div className="animate-rise stagger-4 mt-10 grid grid-cols-3 gap-3.5">
          {[
            { k: "99.7%", v: "Success rate" },
            { k: "0.78s", v: "Avg. confirm" },
            { k: "5", v: "Testnets" },
          ].map((s) => (
            <div
              key={s.v}
              className="rounded-2xl border border-cream/10 bg-cream/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,253,246,0.07)]"
            >
              <div className="font-mono text-[19px] font-semibold text-cream">{s.k}</div>
              <div className="mt-1 text-[11px] text-cream/55">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="animate-rise stagger-5 relative z-40 flex items-center gap-2 text-[12px] text-cream/45">
        <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-mint" />
        Testnet payments only — no real funds move.
      </div>
    </div>
  );
}
