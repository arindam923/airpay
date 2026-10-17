"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Is AirPay custodial?",
    a: "No. AirPay is non-custodial by default. Funds flow directly from your customer's wallet to a wallet you control. We never hold your keys or your crypto.",
  },
  {
    q: "How fast are settlements?",
    a: "Most payments confirm in under 800 milliseconds thanks to our real-time mempool monitoring. On Layer 2 networks like Base and Arbitrum, settlement is near-instant.",
  },
  {
    q: "Which blockchains are supported?",
    a: "We support 40+ networks including Bitcoin, Ethereum, Solana, Arbitrum, Optimism, Base, Polygon, and more. New chains go live within two weeks of announcement.",
  },
  {
    q: "How do webhooks work?",
    a: "Every payment event is delivered to your endpoint as a signed HTTP POST. Failed deliveries are retried automatically with exponential backoff for up to 72 hours.",
  },
  {
    q: "Can I migrate from Stripe?",
    a: "Yes. Our migration tool imports your Stripe customers, subscriptions, and payment methods. Most teams complete migration in under a day with zero downtime.",
  },
  {
    q: "What about accounting and compliance?",
    a: "Automated transaction reports, CSV exports, and integrations with QuickBooks and Xero. We're SOC 2 Type II certified and support travel rule compliance.",
  },
];

const avatars = [
  { i: "JK", c: "bg-violet text-cream" },
  { i: "AM", c: "bg-coral text-cream" },
  { i: "RS", c: "bg-sun text-ink" },
  { i: "TL", c: "bg-mint text-ink" },
  { i: "+9", c: "bg-ink text-cream" },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-[110px]">
      <div className="mx-auto max-w-[1440px] px-6 md:px-10">
        <div className="grid grid-cols-12 gap-y-10 lg:gap-x-10">
          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <span className="inline-block rounded-full bg-mint px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em]">
                24/7 support
              </span>
              <h2 className="mt-6 font-sans text-[clamp(28px,3vw,42px)] font-medium leading-[1.08] tracking-[-0.03em]">
                Round-the-clock help, whenever you need it
              </h2>
              <p className="mt-5 max-w-[34ch] text-[16px] leading-[1.6] text-ink-soft">
                Real engineers, not bots. Our team is available around the clock
                with a median response time under 4 minutes.
              </p>

              <div className="mt-7 flex items-center">
                {avatars.map((a, i) => (
                  <span
                    key={a.i}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-cream text-[12px] font-bold ${a.c} ${i > 0 ? "-ml-3" : ""}`}
                  >
                    {a.i}
                  </span>
                ))}
              </div>

              <div className="mt-8 rounded-[20px] border-2 border-ink bg-cream p-5 shadow-[5px_5px_0_var(--color-ink)]">
                <p className="text-[14px] font-semibold">How can we help you?</p>
                <p className="mt-1 text-[13px] text-ink-soft">
                  Average first response: 3m 42s
                </p>
                <a
                  href="mailto:hello@airpay.dev"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-cream transition-transform hover:-translate-y-0.5"
                >
                  Chat with us
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="col-span-12 flex flex-col gap-3 lg:col-span-8">
            {faqs.map((faq, i) => {
              const isOpen = open === i;
              return (
                <button
                  key={faq.q}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className={`rounded-[20px] border-2 border-ink p-6 text-left transition-colors md:p-7 ${
                    isOpen ? "bg-violet text-cream shadow-[5px_5px_0_var(--color-ink)]" : "bg-cream hover:bg-sun/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[19px] font-semibold tracking-[-0.01em]">
                      {faq.q}
                    </span>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink ${
                        isOpen ? "bg-sun text-ink" : "bg-paper"
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        {isOpen ? (
                          <path d="M2.5 7h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                        ) : (
                          <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                        )}
                      </svg>
                    </span>
                  </div>
                  {isOpen && (
                    <p className="mt-4 max-w-[56ch] text-[15px] leading-[1.6] text-cream/85">
                      {faq.a}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
