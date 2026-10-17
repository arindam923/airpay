const features = [
  {
    title: "Instant settlements",
    body: "Our engine monitors the mempool in real-time. Payments confirm in under 800 milliseconds — funds land in your wallet, not minutes later.",
    accent: "bg-mint",
    icon: (
      <path d="M2 12l4-5 3.5 3L14 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    ),
    demo: "speed",
  },
  {
    title: "Lowest fees",
    body: "One flat 0.9% per transaction. No monthly costs, no hidden spreads, no setup charges — you keep what you earn.",
    accent: "bg-violet text-cream",
    icon: (
      <path d="M8 2v12M4.5 5.5L8 2l3.5 3.5M4.5 12.5L8 16l3.5-3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    ),
    demo: "fees",
  },
  {
    title: "Global access",
    body: "Bitcoin, Ethereum, Solana, and every major L2. 40+ chains behind one integration — your customers pay their way.",
    accent: "bg-sky text-cream",
    icon: (
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2.2" />
    ),
    demo: "chains",
  },
  {
    title: "Decentralized security",
    body: "Non-custodial by default. Funds flow directly between wallets — we never touch your keys, we never hold your crypto.",
    accent: "bg-coral text-cream",
    icon: (
      <path d="M8 2l5 2.5v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6v-4L8 2z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    ),
    demo: "security",
  },
];

export default function Features() {
  return (
    <section id="product" className="border-t border-ink/10 bg-cream py-[110px]">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="mx-auto mb-16 max-w-[620px] text-center">
          <span className="inline-block rounded-full bg-violet px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-cream">
            Features
          </span>
          <h2 className="mt-6 font-sans text-[clamp(30px,3.4vw,46px)] font-medium leading-[1.08] tracking-[-0.03em]">
            Powerful features for modern crypto payments
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-[1.6] text-ink-soft">
            Everything you need to accept, manage, and settle digital assets —
            built for teams that ship.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <article
              key={f.title}
              className={`animate-rise stagger-${i + 1} flex flex-col rounded-[20px] border-2 border-ink bg-paper p-5 shadow-[6px_6px_0_var(--color-ink)] transition-transform hover:-translate-y-1.5`}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${f.accent}`}>
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-ink">
                    {f.icon}
                  </svg>
                </span>
                <h3 className="text-[17px] font-semibold leading-tight tracking-[-0.01em]">
                  {f.title}
                </h3>
              </div>

              <div className="mt-5 min-h-[190px] rounded-2xl border-[1.5px] border-ink/15 bg-cream p-4" data-ui>
                <FeatureDemo type={f.demo} />
              </div>

              <p className="mt-5 text-[14px] leading-[1.55] text-ink-soft">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureDemo({ type }: { type: string }) {
  if (type === "speed") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Confirmation time
          </p>
          <span className="flex items-center gap-1.5 rounded-full bg-mint/25 px-2 py-0.5 text-[10px] font-semibold text-ink">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink" />
            live
          </span>
        </div>
        <svg viewBox="0 0 200 70" className="mt-3 w-full flex-1" fill="none">
          <path
            d="M0 62 C 20 58, 30 60, 45 50 S 70 48, 85 38 S 120 40, 135 28 S 165 30, 180 16 S 195 14, 200 8"
            stroke="var(--color-violet)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="180" cy="16" r="4" fill="var(--color-violet)" stroke="var(--color-ink)" strokeWidth="1.5" />
        </svg>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-[20px] font-semibold tracking-[-0.02em]">0.78s</p>
          <p className="text-[10px] text-ink-soft">avg. confirmation</p>
        </div>
      </div>
    );
  }

  if (type === "fees") {
    const rows = [
      { label: "You charge", value: "$1,250.00", c: "text-ink" },
      { label: "Network fee", value: "-$0.02", c: "text-ink-soft" },
      { label: "AirPay (0.9%)", value: "-$11.25", c: "text-ink-soft" },
    ];
    return (
      <div className="flex h-full flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
          Fee breakdown
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b border-ink/10 pb-2">
              <span className="text-[12px] text-ink-soft">{r.label}</span>
              <span className={`font-mono text-[12px] font-medium ${r.c}`}>{r.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between rounded-lg border-[1.5px] border-ink bg-mint px-3 py-2">
            <span className="text-[12px] font-semibold">You receive</span>
            <span className="font-mono text-[13px] font-semibold">$1,238.73</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "chains") {
    const chains = [
      { s: "₿", c: "bg-sun" },
      { s: "Ξ", c: "bg-violet text-cream" },
      { s: "◎", c: "bg-mint" },
      { s: "$", c: "bg-sky text-cream" },
      { s: "S", c: "bg-pink text-cream" },
    ];
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Supported networks
          </p>
          <span className="rounded-full bg-violet px-2 py-0.5 text-[10px] font-semibold text-cream">40+</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {chains.map((ch, i) => (
            <span
              key={i}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-ink text-[13px] font-semibold ${ch.c}`}
            >
              {ch.s}
            </span>
          ))}
          <span className="flex h-9 items-center rounded-lg border-[1.5px] border-dashed border-ink/40 px-2.5 text-[11px] font-medium text-ink-soft">
            +35 more
          </span>
        </div>
        <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-ink-soft">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mint" />
          Base · Arbitrum · Optimism · Solana
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-ink bg-coral">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5l5 2.5v3.5c0 3-2.2 4.8-5 6-2.8-1.2-5-3-5-6V4l5-2.5z" stroke="var(--color-cream)" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M5.5 8l1.8 1.8 3.2-3.4" stroke="var(--color-cream)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p className="text-[12px] font-semibold">Custody shield</p>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-lg border-[1.5px] border-ink/15 px-3 py-2">
          <span className="font-mono text-[11px] text-ink-soft">customer → 0x4e8c…a1b2</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border-[1.5px] border-ink/15 px-3 py-2">
          <span className="font-mono text-[11px] text-ink-soft">you → 0x7a3b…f29d</span>
        </div>
      </div>
      <p className="mt-auto pt-3 text-[11px] text-ink-soft">
        Direct wallet-to-wallet. <span className="font-semibold text-ink">No intermediary.</span>
      </p>
    </div>
  );
}
