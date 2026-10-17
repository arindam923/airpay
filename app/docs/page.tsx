import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API documentation — AirPay",
  description:
    "Quick starts, endpoint reference, webhooks, and SDKs for the AirPay payment API.",
};

type Seg = { t: string; c?: string };

const curlLines: Seg[][] = [
  [
    { t: "curl ", c: "text-violet" },
    { t: "-X POST ", c: "text-cream" },
    { t: "https://api.airpay.dev/v1/payments", c: "text-mint" },
  ],
  [
    { t: "  -H ", c: "text-cream" },
    { t: '"Authorization: Bearer ap_live_…"', c: "text-sun" },
  ],
  [
    { t: "  -H ", c: "text-cream" },
    { t: '"Content-Type: application/json"', c: "text-sun" },
  ],
  [
    { t: "  -d ", c: "text-cream" },
    { t: "'{\"amount\":125000,\"currency\":\"usdc\",\"chain\":\"base\"}'", c: "text-mint" },
  ],
];

const endpoints = [
  { method: "POST", path: "/v1/payments", desc: "Create a payment or hosted paylink." },
  { method: "GET", path: "/v1/payments/:id", desc: "Retrieve a payment and its confirmations." },
  { method: "GET", path: "/v1/payments", desc: "List payments with cursor pagination." },
  { method: "POST", path: "/v1/payouts", desc: "Settle balances to a treasury wallet." },
  { method: "POST", path: "/v1/webhooks", desc: "Register an event delivery endpoint." },
  { method: "GET", path: "/v1/customers", desc: "List customers aggregated across chains." },
];

const methodStyle: Record<string, string> = {
  POST: "bg-mint text-ink",
  GET: "bg-sky text-ink",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-[1000px] items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-violet font-sans text-[15px] font-semibold text-cream shadow-[2px_2px_0_var(--color-ink)]">
              A
            </span>
            <span className="font-sans text-[17px] font-semibold tracking-[-0.01em]">
              AirPay
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border-2 border-ink bg-cream px-5 py-2 text-[13px] font-semibold shadow-[2px_2px_0_var(--color-ink)] transition-all hover:-translate-y-0.5 hover:bg-sun"
          >
            Open dashboard
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-[1000px] px-6 py-16 md:px-10 md:py-24">
        <span className="inline-block rounded-full bg-mint px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink">
          Developers
        </span>
        <h1 className="mt-6 font-sans text-[clamp(36px,5vw,60px)] font-medium leading-[1.05] tracking-[-0.03em]">
          API documentation
        </h1>
        <p className="mt-5 max-w-[58ch] text-[17px] leading-[1.6] text-ink/70">
          Accept crypto payments with a clean REST API. Authenticate with a
          bearer key, create payments in one request, and receive signed
          webhooks when they confirm.
        </p>

        <section className="mt-16">
          <h2 className="font-sans text-[28px] font-medium tracking-[-0.02em]">Quick start</h2>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-ink/70">
            Create a live key in the dashboard, then create your first payment.
            Amounts are in the currency&apos;s smallest unit (cents for USD
            stablecoins).
          </p>
          <div className="mt-6 overflow-hidden rounded-[20px] border-2 border-ink bg-ink shadow-[6px_6px_0_var(--color-ink)]">
            <div className="flex items-center gap-2 border-b border-cream/10 px-5 py-3.5">
              <span className="h-3 w-3 rounded-full bg-coral" />
              <span className="h-3 w-3 rounded-full bg-sun" />
              <span className="h-3 w-3 rounded-full bg-mint" />
              <span className="ml-3 rounded-md bg-cream/10 px-3 py-1 font-mono text-[11px] text-cream/60">
                terminal
              </span>
            </div>
            <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-[1.75] text-cream">
              <code>
                {curlLines.map((line, i) => (
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
        </section>

        <section className="mt-16">
          <h2 className="font-sans text-[28px] font-medium tracking-[-0.02em]">Endpoints</h2>
          <div className="mt-6 overflow-hidden rounded-[20px] border-2 border-ink bg-cream shadow-[6px_6px_0_var(--color-ink)]">
            {endpoints.map((e) => (
              <div
                key={e.path}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-ink/10 px-6 py-4 last:border-0"
              >
                <span
                  className={`w-[62px] rounded-full px-3 py-1 text-center font-mono text-[11px] font-bold ${methodStyle[e.method]}`}
                >
                  {e.method}
                </span>
                <code className="font-mono text-[13.5px] font-medium">{e.path}</code>
                <span className="text-[13.5px] text-ink/60">{e.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="sdks" className="mt-16">
          <h2 className="font-sans text-[28px] font-medium tracking-[-0.02em]">SDKs & modules</h2>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-ink/70">
            Official client libraries, generated from the same OpenAPI spec.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "TypeScript", pkg: "npm i @airpay/sdk", color: "bg-violet text-cream" },
              { name: "Python", pkg: "pip install airpay", color: "bg-sun text-ink" },
              { name: "Go", pkg: "go get airpay.dev/go", color: "bg-mint text-ink" },
              { name: "Ruby", pkg: "gem install airpay", color: "bg-coral text-cream" },
              { name: "PHP", pkg: "composer require airpay", color: "bg-sky text-ink" },
              { name: "Rust", pkg: "cargo add airpay", color: "bg-ink text-cream" },
            ].map((sdk) => (
              <div
                key={sdk.name}
                className="rounded-[20px] border-2 border-ink bg-cream p-6 shadow-[4px_4px_0_var(--color-ink)] transition-transform hover:-translate-y-1"
              >
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl font-sans text-[15px] font-bold ${sdk.color}`}
                >
                  {sdk.name[0]}
                </span>
                <p className="mt-4 font-sans text-[17px] font-semibold">{sdk.name}</p>
                <code className="mt-2 block font-mono text-[12.5px] text-ink/60">
                  {sdk.pkg}
                </code>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-sans text-[28px] font-medium tracking-[-0.02em]">Webhooks</h2>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-ink/70">
            AirPay signs every delivery with HMAC-SHA256. Verify the{" "}
            <code className="rounded bg-ink/8 px-1.5 py-0.5 font-mono text-[13px]">
              AirPay-Signature
            </code>{" "}
            header before processing an event. Failed deliveries retry with
            exponential backoff for 24 hours.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[
              ["payment.confirmed", "A payment reached your confirmation threshold."],
              ["payment.failed", "A payment expired or failed on-chain."],
              ["payout.paid", "A settlement confirmed to your treasury wallet."],
              ["webhook.paused", "An endpoint was paused after repeated failures."],
            ].map(([event, desc]) => (
              <div
                key={event}
                className="rounded-[20px] border-2 border-ink bg-cream p-6 shadow-[4px_4px_0_var(--color-ink)]"
              >
                <code className="font-mono text-[13px] font-semibold text-violet">{event}</code>
                <p className="mt-2 text-[14px] leading-[1.55] text-ink/70">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-20 rounded-[20px] border-2 border-ink bg-violet p-10 text-center text-cream shadow-[8px_8px_0_var(--color-ink)]">
          <h2 className="font-sans text-[clamp(24px,3vw,36px)] font-medium tracking-[-0.02em]">
            Ready to take payments?
          </h2>
          <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-[1.6] text-cream/80">
            Create a live key, paste it into your server, and ship your first
            crypto checkout today.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard/api-keys"
              className="rounded-full border-2 border-ink bg-sun px-8 py-3.5 text-[15px] font-semibold text-ink shadow-[4px_4px_0_var(--color-ink)] transition-all hover:-translate-y-0.5"
            >
              Create an API key
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border-[1.5px] border-cream/40 px-8 py-3.5 text-[15px] font-medium text-cream transition-all hover:-translate-y-0.5 hover:border-cream hover:bg-cream/10"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
