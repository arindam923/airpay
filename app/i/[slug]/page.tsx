import type { Metadata } from "next";
import Link from "next/link";
import HostedCheckout from "@/components/pay/HostedCheckout";
import { getInvoiceBySlug, listInvoiceItems, toPublicInvoice } from "@/lib/invoices";
import { getCheckoutAppearance } from "@/lib/checkout-appearance.server";
import type { PublicLink } from "@/lib/links";

// The invoice lookup reads the database per request, so this route renders on
// demand rather than being prerendered.
export const instant = false;

export const metadata: Metadata = {
  title: "Invoice — AirPay",
  description: "View and pay a secure invoice powered by AirPay.",
};

function Shell({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <main className="mx-auto flex w-full max-w-[460px] flex-1 items-center px-5 py-10">
        <div className="w-full rounded-[24px] border-2 border-ink bg-cream p-7 text-center shadow-[6px_6px_0_var(--color-ink)]">
          <h1 className="font-sans text-[24px] font-semibold tracking-[-0.02em]">{title}</h1>
          <p className="mx-auto mt-3 max-w-[34ch] text-[14.5px] leading-[1.55] text-ink-soft">{body}</p>
          <Link
            href="/"
            className="mt-7 inline-flex h-12 items-center justify-center rounded-full border-2 border-ink bg-cream px-7 text-[14.5px] font-semibold shadow-[3px_3px_0_var(--color-ink)] transition-all hover:-translate-y-0.5 hover:bg-sun"
          >
            Go to AirPay
          </Link>
        </div>
      </main>
    </div>
  );
}

export default async function InvoicePage({ params }: PageProps<"/i/[slug]">) {
  const { slug } = await params;
  const row = await getInvoiceBySlug(slug);

  if (!row || row.status === "void") {
    return (
      <Shell
        title="This invoice isn't available"
        body="The invoice was voided or the link is invalid. Ask the merchant to send a fresh invoice."
      />
    );
  }

  if (row.status === "paid") {
    return (
      <Shell
        title="Invoice already paid"
        body="This invoice has already been settled. If you need a receipt, contact the merchant."
      />
    );
  }

  const invoice = toPublicInvoice(row, await listInvoiceItems(row.id));
  const appearance = await getCheckoutAppearance(row.organizationId);
  const receiver = row.receiver || process.env.RECEIVER_ADDRESS || "";

  const link: PublicLink = {
    id: row.id,
    slug: row.slug,
    title: `Invoice ${row.number}`,
    merchant: row.merchant,
    mode: "fixed",
    amountUsd: row.total_usd,
    min: 0,
    max: null,
    chainKey: row.chain_key,
    chainName: invoice.chainName,
    coin: row.token,
    receiver,
    allowed: row.allowed ?? {},
    environment: row.environment,
    active: true,
    createdAt: row.created_at,
  };

  return (
    <HostedCheckout
      receiver={receiver}
      link={link}
      invoice={invoice}
      invoiceId={row.id}
      appearance={appearance}
    />
  );
}
