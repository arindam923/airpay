"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { label: "Product", href: "#product" },
  { label: "Paylinks", href: "#paylinks" },
  { label: "Developers", href: "#developers" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-violet font-sans text-[15px] font-semibold text-cream shadow-[2px_2px_0_var(--color-ink)]">
            A
          </span>
          <span className="font-sans text-[17px] font-semibold tracking-[-0.01em]">
            AirPay
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[15px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#cta"
            className="rounded-full bg-ink px-6 py-2.5 text-[14px] font-semibold text-cream transition-all hover:-translate-y-0.5 hover:bg-violet"
          >
            Start building
          </a>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink bg-cream md:hidden"
          aria-label="Toggle menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            {open ? (
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="mx-4 mb-4 rounded-2xl border-2 border-ink bg-cream p-4 shadow-[5px_5px_0_var(--color-ink)] md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-[15px] font-medium text-ink-soft hover:bg-paper hover:text-ink"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#cta"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-ink px-4 py-3 text-center text-[14px] font-semibold text-cream"
            >
              Start building
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
