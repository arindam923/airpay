const wallets = [
  { name: "MetaMask", detail: "Browser & mobile", c: "bg-coral text-cream", s: "M" },
  { name: "Coinbase Wallet", detail: "Custody-free", c: "bg-violet text-cream", s: "C" },
  { name: "Phantom", detail: "Solana ready", c: "bg-sky text-cream", s: "P" },
  { name: "Rabby", detail: "Multi-chain", c: "bg-sun text-ink", s: "R" },
  { name: "20+ more wallets", detail: "WalletConnect", c: "bg-ink text-cream", s: "+" },
];

export default function Reliability() {
  return (
    <section className="bg-sun py-[110px] text-ink">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 items-center gap-y-12 lg:gap-x-12">
          <div className="col-span-12 lg:col-span-6">
            <span className="inline-block rounded-full bg-ink px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-sun">
              Reliability & ecosystem
            </span>
            <h2 className="mt-6 font-sans text-[clamp(30px,3.4vw,46px)] font-medium leading-[1.08] tracking-[-0.03em]">
              Reliability & ecosystem
            </h2>
            <p className="mt-5 max-w-[44ch] text-[16px] leading-[1.6] text-ink/70">
              Accept crypto payments from any wallet worldwide — your customers
              pay with their preferred wallet, and funds settle straight to
              yours.
            </p>

            <div className="mt-10 flex flex-col gap-6">
              {[
                { v: "99.99%", l: "Historical uptime for services" },
                { v: "0.78s", l: "Average payment confirmation" },
                { v: "40+", l: "Blockchains, one integration" },
              ].map((s) => (
                <div key={s.l} className="flex items-baseline gap-6 border-b-2 border-ink/15 pb-6">
                  <span className="font-sans text-[clamp(40px,4vw,58px)] font-medium leading-none tracking-[-0.03em]">
                    {s.v}
                  </span>
                  <span className="max-w-[22ch] text-[14px] leading-[1.4] text-ink/70">
                    {s.l}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <div className="mx-auto max-w-[440px]">
              <div className="rounded-[20px] border-2 border-ink bg-cream p-6 shadow-[8px_8px_0_var(--color-ink)]" data-ui>
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-semibold">Select your wallet</p>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink-soft">
                    <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="mt-4 flex flex-col gap-2.5">
                  {wallets.map((w) => (
                    <button
                      key={w.name}
                      className="flex items-center justify-between rounded-xl border-[1.5px] border-ink/15 bg-paper px-4 py-3 transition-colors hover:border-ink hover:bg-sun/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-ink text-[13px] font-bold ${w.c}`}>
                          {w.s}
                        </span>
                        <div className="text-left">
                          <p className="text-[14px] font-semibold leading-tight">{w.name}</p>
                          <p className="text-[11px] text-ink-soft">{w.detail}</p>
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-soft">
                        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-[20px] border-2 border-ink bg-ink p-6 text-cream shadow-[6px_6px_0_rgba(25,20,16,0.25)]">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mint">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2l5 2.5v4c0 3-2.2 4.8-5 6-2.8-1.2-5-3-5-6V4.5L8 2z" stroke="var(--color-ink)" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold">Connect and forget</p>
                    <p className="mt-1 text-[13px] leading-[1.5] text-cream/70">
                      Link your wallet once and AirPay auto-detects incoming
                      payments — received in your personal wallet in less than
                      a second.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
