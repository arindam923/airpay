import Link from "next/link";

const columns = [
  {
    head: "Product",
    links: [
      { label: "Features", href: "#product" },
      { label: "Paylinks", href: "#paylinks" },
      { label: "Pricing", href: "#cta" },
      { label: "API documentation", href: "/docs" },
      { label: "Developer tools", href: "/docs#sdks" },
    ],
  },
  {
    head: "Company",
    links: [
      { label: "About us", href: "#reliability" },
      { label: "Services", href: "#product" },
      { label: "Blog", href: "/docs" },
      { label: "Careers", href: "#cta" },
      { label: "Help center", href: "/docs" },
    ],
  },
  {
    head: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal#privacy" },
      { label: "Terms of Service", href: "/legal#terms" },
      { label: "Security", href: "/legal#security" },
      { label: "Compliance", href: "/legal#compliance" },
    ],
  },
];

const socials = [
  {
    name: "X",
    path: "M3 3l7.2 9.3L3.4 21h2.5l5.5-7 5.5 7H21l-7.5-9.7L20.4 3h-2.5l-4.9 6.3L8.2 3H3z",
  },
  {
    name: "GitHub",
    path: "M8 2C4.7 2 2 4.7 2 8c0 2.6 1.7 4.9 4.1 5.6.3.1.4-.1.4-.3v-1c-1.7.4-2-.8-2-.8-.3-.7-.7-.9-.7-.9-.6-.4 0-.4 0-.4.6 0 1 .6 1 .6.6 1 1.5.7 1.9.5.1-.4.2-.7.4-.9-1.3-.2-2.7-.7-2.7-3 0-.7.3-1.2.6-1.7-.1-.2-.3-.8.1-1.7 0 0 .5-.2 1.8.7.5-.2 1.1-.2 1.6 0 1.2-.9 1.8-.7 1.8-.7.4.9.2 1.5.1 1.7.3.4.6 1 .6 1.7 0 2.3-1.4 2.8-2.7 3 .2.2.4.6.4 1.1v1.7c0 .2.1.4.4.3C18.3 12.9 20 10.6 20 8c0-3.3-2.7-6-6-6z",
  },
  {
    name: "Discord",
    path: "M13.5 3l-.4.8c1.9.6 3.4 1.6 3.4 1.6S14 6.8 11.5 6.8h-1C8 6.8 5.5 5.4 5.5 5.4s1.5-1 3.4-1.6L8.5 3S5.7 4.9 4 8.5c0 0 .5 3 2.5 4.5 0 0 .8-1 1.5-1.8-.5-.2-1.2-.6-1.2-.6s.3.2 1 .5c1.5.7 3.5.9 4.7.9s3.2-.2 4.7-.9c.7-.3 1-.5 1-.5s-.7.4-1.2.6c.7.8 1.5 1.8 1.5 1.8 2-1.5 2.5-4.5 2.5-4.5C18.3 4.9 15.5 3 13.5 3zM7.7 10.7c-.6 0-1.1-.6-1.1-1.2s.5-1.2 1.1-1.2 1.1.6 1.1 1.2-.5 1.2-1.1 1.2zm4.6 0c-.6 0-1.1-.6-1.1-1.2s.5-1.2 1.1-1.2 1.1.6 1.1 1.2-.5 1.2-1.1 1.2z",
  },
];

export default function Footer() {
  return (
    <footer className="bg-ink px-6 pt-16 pb-8 text-cream md:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="grid grid-cols-12 gap-y-10 lg:gap-x-10 border-b border-cream/10 pb-12">
          <div className="col-span-12 lg:col-span-5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet font-sans text-[15px] font-semibold text-cream">
                A
              </span>
              <span className="font-sans text-[17px] font-semibold tracking-[-0.01em]">
                AirPay
              </span>
            </Link>
            <p className="mt-5 max-w-[32ch] text-[15px] leading-[1.6] text-cream/60">
              AirPay is a decentralized payment gateway for instant, non-custodial
              transactions. Accept crypto with zero intermediaries.
            </p>
            <div className="mt-7 flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.name}
                  href="#"
                  aria-label={s.name}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-cream/25 text-cream/70 transition-colors hover:border-sun hover:text-sun"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.head} className="col-span-6 lg:col-span-2">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-cream/40">
                {col.head}
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {col.links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="text-[14px] text-cream/70 transition-colors hover:text-sun"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex select-none justify-center overflow-hidden py-8">
          <span className="font-sans text-[clamp(80px,14vw,220px)] font-semibold leading-none tracking-[-0.04em] text-transparent [-webkit-text-stroke:1.5px_rgba(250,244,232,0.14)]">
            AirPay
          </span>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-cream/10 pt-7 text-[13px] text-cream/50 md:flex-row">
          <p>© 2026 AirPay. All rights reserved.</p>
          <a href="mailto:hello@airpay.dev" className="transition-colors hover:text-sun">
            hello@airpay.dev
          </a>
          <p>San Francisco, CA</p>
        </div>
      </div>
    </footer>
  );
}
