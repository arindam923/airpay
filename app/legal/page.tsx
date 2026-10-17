import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal — AirPay",
  description: "Privacy policy, terms of service, security, and compliance at AirPay.",
};

const sections = [
  {
    id: "privacy",
    title: "Privacy policy",
    lead: "What we collect, why we collect it, and how long we keep it.",
    body: [
      "AirPay processes payment metadata (amounts, chains, transaction hashes, and contact details you provide at checkout) to operate the payment network you use. We never take custody of your funds: settlement happens directly between payer and payee on-chain.",
      "Account data — workspace name, team member emails, and API key labels — is stored encrypted at rest and used only to run the service. We do not sell personal data, and we do not share it with third parties except as required to settle a payment (for example, broadcasting a transaction to a public blockchain) or to comply with lawful requests.",
      "Logs and analytics are retained for 90 days, then aggregated or deleted. You can request a full export or deletion of your workspace data at any time by emailing privacy@airpay.dev.",
    ],
  },
  {
    id: "terms",
    title: "Terms of service",
    lead: "The agreement between you and AirPay when you use the service.",
    body: [
      "AirPay provides non-custodial payment infrastructure. You are responsible for the security of your API keys, treasury wallets, and the legality of the goods or services you sell. The service is provided “as is” without warranties of uninterrupted availability, though we target 99.99% API uptime.",
      "Fees are disclosed before you enable a plan: 0.9% of successfully confirmed volume on the Pro plan, with gas sponsored on supported chains. You may cancel at any time; accrued balances settle in the next payout cycle.",
      "We may suspend accounts that are used for fraud, sanctions violations, or abuse of the network. Material changes to these terms are announced 30 days in advance via email and the dashboard.",
    ],
  },
  {
    id: "security",
    title: "Security",
    lead: "How we protect the network, and how we expect you to.",
    body: [
      "All traffic is TLS 1.3. Secrets — including webhook signing keys and API key hashes — are stored in an HSM-backed vault with envelope encryption. Production access requires hardware keys and is limited to a just-in-time elevated role; every access is recorded in our audit log.",
      "Every API key has a scope (full or read-only), an IP allowlist option, and automatic revocation. Webhook payloads are signed with HMAC-SHA256 and include a timestamp to prevent replay.",
      "We run continuous dependency scanning, third-party penetration tests twice a year, and a public bug bounty. Report vulnerabilities to security@airpay.dev — we aim to respond within 24 hours.",
    ],
  },
  {
    id: "compliance",
    title: "Compliance",
    lead: "Programs, audits, and regional availability.",
    body: [
      "AirPay maintains SOC 2 Type II attestation and undergoes annual penetration testing by an independent firm. Our sub-processors are listed in the trust center and covered by data processing agreements.",
      "We support travel-rule data exchange for qualifying transfers and integrate screening for sanctioned addresses at payment creation and again before payout. Regions where restrictions apply are blocked at the network edge.",
      "For compliance questionnaires, audit reports, or DPA requests, contact compliance@airpay.dev. Enterprise customers can request a dedicated trust-center account with live status feeds.",
    ],
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-[820px] items-center justify-between px-6 py-4 md:px-10">
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

      <main className="mx-auto max-w-[820px] px-6 py-16 md:px-10 md:py-24">
        <span className="inline-block rounded-full bg-sun px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink">
          Legal
        </span>
        <h1 className="mt-6 font-sans text-[clamp(36px,5vw,56px)] font-medium leading-[1.05] tracking-[-0.03em]">
          Policies & trust
        </h1>
        <p className="mt-5 max-w-[54ch] text-[17px] leading-[1.6] text-ink/70">
          Plain-language summaries of how AirPay handles data, accounts, and
          security. Last updated October 1, 2026.
        </p>

        <nav className="mt-10 flex flex-wrap gap-3">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border-2 border-ink bg-cream px-5 py-2 text-[13px] font-semibold shadow-[2px_2px_0_var(--color-ink)] transition-all hover:-translate-y-0.5 hover:bg-sun"
            >
              {s.title}
            </a>
          ))}
        </nav>

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="mt-16 scroll-mt-24">
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-[14px] font-bold text-violet">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="font-sans text-[clamp(26px,3vw,34px)] font-medium tracking-[-0.02em]">
                {s.title}
              </h2>
            </div>
            <p className="mt-3 pl-9 text-[16px] font-medium text-ink/60">{s.lead}</p>
            <div className="mt-5 flex flex-col gap-4 pl-9">
              {s.body.map((p, j) => (
                <p key={j} className="text-[15px] leading-[1.7] text-ink/80">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}

        <div className="mt-20 rounded-[20px] border-2 border-ink bg-cream p-8 shadow-[6px_6px_0_var(--color-ink)]">
          <p className="text-[15px] font-semibold">Questions?</p>
          <p className="mt-2 text-[14.5px] leading-[1.6] text-ink/70">
            Email{" "}
            <a href="mailto:legal@airpay.dev" className="font-medium text-violet hover:underline">
              legal@airpay.dev
            </a>{" "}
            and we&apos;ll get back to you within two business days.
          </p>
        </div>
      </main>
    </div>
  );
}
