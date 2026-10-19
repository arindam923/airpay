import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import HostedCheckout from "@/components/pay/HostedCheckout";
import { loadCheckoutPage } from "@/lib/api/checkout";
import { getCheckoutAppearance } from "@/lib/checkout-appearance.server";
import { settlementAddress, testnetByKey } from "@/lib/chains";

// The session lookup reads the database per request, so render on demand.
export const instant = false;

export const metadata: Metadata = {
  title: "Complete payment — AirPay",
  description:
    "Secure hosted checkout powered by AirPay. Select your network and coin and confirm the payment.",
};

export default async function CheckoutSessionPage({ params }: PageProps<"/checkout/[id]">) {
  const { id } = await params;
  const data = await loadCheckoutPage(id);
  if (!data) notFound();

  const { session, intent, link } = data;

  if (session.status === "complete" || intent.status === "confirmed") {
    if (session.success_url) redirect(session.success_url);
  }

  const info = testnetByKey(intent.chainKey);
  const contract = info ? settlementAddress(info) : null;
  const settlementContract =
    contract && intent.receiver.toLowerCase() === contract.toLowerCase() ? contract : null;
  const appearance = await getCheckoutAppearance(session.organizationId);

  return (
    <HostedCheckout
      receiver={intent.receiver}
      link={link}
      appearance={appearance}
      settlementContract={settlementContract}
      initialIntent={intent}
      successUrl={session.success_url}
      cancelUrl={session.cancel_url}
    />
  );
}
