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
    { t: "https://api.airpay.dev/v1/checkout_sessions", c: "text-mint" },
  ],
  [
    { t: "  -H ", c: "text-cream" },
    { t: '"Authorization: Bearer ap_test_…"', c: "text-sun" },
  ],
  [
    { t: "  -H ", c: "text-cream" },
    { t: '"Content-Type: application/json"', c: "text-sun" },
  ],
  [
    { t: "  -d ", c: "text-cream" },
    {
      t: '\'{"amount":1250,"chain":"base","token":"USDC","success_url":"https://shop.dev/ok"}\'',
      c: "text-mint",
    },
  ],
];

const endpoints = [
  { method: "GET", path: "/v1/account", desc: "Retrieve the authenticated account and key." },
  { method: "GET", path: "/v1/config", desc: "Enabled chains, tokens, and settlement addresses." },
  { method: "POST", path: "/v1/payment_intents", desc: "Create a headless payment intent." },
  { method: "GET", path: "/v1/payment_intents", desc: "List payment intents with cursor pagination." },
  { method: "GET", path: "/v1/payment_intents/:id", desc: "Retrieve a payment intent." },
  { method: "POST", path: "/v1/payment_intents/:id/confirm", desc: "Attach a transaction hash." },
  { method: "POST", path: "/v1/payment_intents/:id/cancel", desc: "Cancel an open payment intent." },
  { method: "POST", path: "/v1/checkout_sessions", desc: "Create a hosted checkout session." },
  { method: "GET", path: "/v1/checkout_sessions", desc: "List checkout sessions." },
  { method: "GET", path: "/v1/checkout_sessions/:id", desc: "Retrieve a checkout session." },
  { method: "POST", path: "/v1/checkout_sessions/:id/expire", desc: "Expire a checkout session." },
];

const methodStyle: Record<string, string> = {
  POST: "bg-mint text-ink",
  GET: "bg-sky text-ink",
};

const sdks = [
  { name: "TypeScript", pkg: "npm i @airpay/sdk", color: "bg-violet text-cream" },
  { name: "Browser JS", pkg: "npm i @airpay/js", color: "bg-sky text-ink" },
  { name: "Python", pkg: "pip install airpay", color: "bg-sun text-ink" },
  { name: "Go", pkg: "go get github.com/arindam923/airpay/sdk/go", color: "bg-mint text-ink" },
  { name: "PHP", pkg: "composer require airpay/airpay", color: "bg-coral text-cream" },
];

const webhookEvents: [string, string][] = [
  ["payment.confirmed", "A payment reached your confirmation threshold."],
  ["payment.failed", "A payment expired or failed on-chain."],
  ["checkout.session.completed", "A hosted checkout finished successfully."],
  ["invoice.paid", "An invoice was paid in full."],
  ["link.created", "A payment link went live."],
  ["webhook.test", "Sent when you add or test an endpoint."],
];

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
            Create a key in the dashboard, then create your first checkout
            session. Amounts are in the currency&apos;s smallest unit — cents for
            USD stablecoins.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[16px] border-2 border-ink/10 bg-cream px-5 py-4">
              <code className="font-mono text-[13px] font-semibold text-violet">Secret keys</code>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-ink/70">
                <code className="font-mono text-[13px]">ap_test_…</code> /{" "}
                <code className="font-mono text-[13px]">ap_live_…</code>. Server-side only, full
                workspace access.
              </p>
            </div>
            <div className="rounded-[16px] border-2 border-ink/10 bg-cream px-5 py-4">
              <code className="font-mono text-[13px] font-semibold text-violet">
                Publishable keys
              </code>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-ink/70">
                <code className="font-mono text-[13px]">pk_test_…</code> /{" "}
                <code className="font-mono text-[13px]">pk_live_…</code>. Safe in browsers; read
                config and confirm intents.
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-[60ch] text-[13.5px] leading-[1.6] text-ink/60">
            Send requests to <code className="font-mono text-[13px]">https://api.airpay.dev</code>{" "}
            with an <code className="font-mono text-[13px]">Authorization: Bearer</code> header.
            Add an <code className="font-mono text-[13px]">Idempotency-Key</code> to safely retry
            creates.
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
                key={`${e.method} ${e.path}`}
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
          <h2 className="font-sans text-[28px] font-medium tracking-[-0.02em]">SDKs & libraries</h2>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-ink/70">
            Official client libraries, hand-written against the same OpenAPI spec.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sdks.map((sdk) => (
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
          <p className="mt-3 max-w-[68ch] text-[15px] leading-[1.6] text-ink/70">
            AirPay signs every delivery with HMAC-SHA256. The{" "}
            <code className="rounded bg-ink/8 px-1.5 py-0.5 font-mono text-[13px]">
              AirPay-Signature
            </code>{" "}
            header looks like{" "}
            <code className="rounded bg-ink/8 px-1.5 py-0.5 font-mono text-[13px]">
              t=1699999999,v1=…
            </code>
            . Compute the HMAC over{" "}
            <code className="rounded bg-ink/8 px-1.5 py-0.5 font-mono text-[13px]">
              &lt;t&gt;.&lt;raw body&gt;
            </code>{" "}
            and compare in constant time. Failed deliveries retry with exponential backoff.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {webhookEvents.map(([event, desc]) => (
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
            Start in sandbox on testnets, then flip the Go-live switch when
            you&apos;re ready for mainnet.
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
