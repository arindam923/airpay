type Seg = { t: string; c?: string };

const codeLines: Seg[][] = [
  [
    { t: "import ", c: "text-violet" },
    { t: "{ airpay }", c: "text-cream" },
    { t: " from ", c: "text-violet" },
    { t: '"@airpay/sdk"', c: "text-mint" },
  ],
  [],
  [
    { t: "const ", c: "text-violet" },
    { t: "payment", c: "text-sky" },
    { t: " = ", c: "text-cream" },
    { t: "await ", c: "text-violet" },
    { t: "airpay.", c: "text-cream" },
    { t: "create", c: "text-sky" },
    { t: "({", c: "text-cream" },
  ],
  [
    { t: "  amount: ", c: "text-cream" },
    { t: "125000", c: "text-sun" },
    { t: ",", c: "text-cream" },
    { t: " // in cents", c: "text-cream/40" },
  ],
  [
    { t: "  currency: ", c: "text-cream" },
    { t: '"usdc"', c: "text-mint" },
    { t: ",", c: "text-cream" },
  ],
  [
    { t: "  chain: ", c: "text-cream" },
    { t: '"base"', c: "text-mint" },
    { t: ",", c: "text-cream" },
  ],
  [
    { t: "  metadata: ", c: "text-cream" },
    { t: "{ order: ", c: "text-cream" },
    { t: '"#1042"', c: "text-mint" },
    { t: " },", c: "text-cream" },
  ],
  [
    { t: "  confirmations: ", c: "text-cream" },
    { t: "0", c: "text-sun" },
    { t: ",", c: "text-cream" },
    { t: " // sub-second", c: "text-cream/40" },
  ],
  [{ t: "});", c: "text-cream" }],
  [],
  [{ t: "// → pay_9x2k · confirmed in 0.78s", c: "text-cream/40" }],
];

export default function Api() {
  return (
    <section id="developers" className="bg-ink py-[110px] text-cream">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 items-center gap-y-12 lg:gap-x-12">
          <div className="col-span-12 lg:col-span-6">
            <div className="rounded-[20px] border-2 border-cream/15 bg-[#221b14] shadow-[8px_8px_0_rgba(250,244,232,0.15)]" data-ui>
              <div className="flex items-center gap-2 border-b border-cream/10 px-5 py-3.5">
                <span className="h-3 w-3 rounded-full bg-coral" />
                <span className="h-3 w-3 rounded-full bg-sun" />
                <span className="h-3 w-3 rounded-full bg-mint" />
                <span className="ml-3 rounded-md bg-cream/10 px-3 py-1 font-mono text-[11px] text-cream/60">
                  checkout.ts
                </span>
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-[1.75]">
                <code>
                  {codeLines.map((line, i) => (
                    <span key={i} className="block">
                      {line.map((seg, j) => (
                        <span key={j} className={seg.c}>
                          {seg.t}
                        </span>
                      ))}
                    </span>
                  ))}
                </code>
              </pre>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {["TypeScript", "Python", "Go", "Ruby", "PHP"].map((lang, i) => (
                <span
                  key={lang}
                  className={`rounded-full border-[1.5px] px-4 py-1.5 font-mono text-[12px] ${
                    i === 0
                      ? "border-mint bg-mint text-ink"
                      : "border-cream/20 text-cream/70"
                  }`}
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6">
            <span className="inline-block rounded-full bg-mint px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink">
              For developers
            </span>
            <h2 className="mt-6 font-sans text-[clamp(30px,3.4vw,46px)] font-medium leading-[1.08] tracking-[-0.03em]">
              Build with our simple REST API and SDKs
            </h2>
            <p className="mt-5 max-w-[48ch] text-[16px] leading-[1.6] text-cream/70">
              Integrate AirPay in minutes with a clean REST API and lightweight
              SDKs. Create payments, receive callbacks, and manage gateways —
              quick starts in the docs.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="/docs"
                className="inline-flex items-center gap-2 rounded-full bg-mint px-8 py-3.5 text-[15px] font-semibold text-ink shadow-[4px_4px_0_var(--color-cream)] transition-all hover:-translate-y-0.5"
              >
                View API documentation
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a
                href="/docs#sdks"
                className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-cream/40 px-8 py-3.5 text-[15px] font-medium text-cream transition-all hover:-translate-y-0.5 hover:border-cream hover:bg-cream/10"
              >
                SDKs & modules
              </a>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { v: "99.99%", l: "API uptime" },
                { v: "0.78s", l: "Avg. confirmation" },
                { v: "40+", l: "Chains supported" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border-[1.5px] border-cream/15 bg-cream/5 p-5">
                  <p className="font-sans text-[26px] font-medium tracking-[-0.02em] text-sun">
                    {s.v}
                  </p>
                  <p className="mt-1 text-[12px] text-cream/60">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
