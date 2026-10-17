const steps = [
  {
    n: "01",
    accent: "bg-sun text-ink",
    title: "Create the invoice",
    body: "Set the amount, currency, description, and due date. Hosted checkout page is generated automatically — no code required.",
    icon: (
      <path d="M4 2h8v12H4zM6 5h4M6 8h4M6 11h2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    n: "02",
    accent: "bg-mint text-ink",
    title: "Share the payment link",
    body: "Send the secure link via email, message, or embed it anywhere. Your customers pay with any wallet or coin they already hold.",
    icon: (
      <path d="M6.5 9.5l7-7M4 6l1.5 4L4 14l8-8M12 4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    n: "03",
    accent: "bg-coral text-cream",
    title: "Get paid to your wallet",
    body: "The customer opens the link and pays. Funds settle directly to your wallet in under a second — notify, done.",
    icon: (
      <path d="M2.5 8.5l3.5 3.5 7-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

export default function Paylinks() {
  return (
    <section id="paylinks" className="bg-violet py-[110px] text-cream">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="mx-auto mb-14 max-w-[640px] text-center">
          <span className="inline-block rounded-full bg-sun px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink">
            Paylinks
          </span>
          <h2 className="mt-6 font-sans text-[clamp(30px,3.4vw,46px)] font-medium leading-[1.08] tracking-[-0.03em]">
            Request, invoice, or sell with a link
          </h2>
          <p className="mx-auto mt-5 max-w-[54ch] text-[16px] leading-[1.6] text-cream/80">
            Paylinks power storefronts and one-off payments. Create invoices,
            request transfers, or sell products with a secure hosted checkout —
            no code required.
          </p>
          <a
            href="/dashboard?new=1"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream px-8 py-3.5 text-[15px] font-semibold text-ink shadow-[4px_4px_0_var(--color-ink)] transition-all hover:-translate-y-0.5 hover:bg-sun"
          >
            Create your first link
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <article
              key={s.n}
              className="relative rounded-[20px] border-2 border-ink bg-cream p-7 pt-10 text-ink shadow-[6px_6px_0_var(--color-ink)] transition-transform hover:-translate-y-1.5"
            >
              <span
                className={`absolute -top-5 left-7 flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-ink text-[15px] font-bold ${s.accent}`}
              >
                {s.n}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-ink bg-paper">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  {s.icon}
                </svg>
              </span>
              <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.01em]">{s.title}</h3>
              <p className="mt-3 text-[14px] leading-[1.55] text-ink-soft">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
