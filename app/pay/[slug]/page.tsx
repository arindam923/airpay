import type { Metadata } from "next";
import HostedCheckout from "@/components/pay/HostedCheckout";
import { getLinkBySlug, toPublicLink } from "@/lib/links";
import { getCheckoutAppearance } from "@/lib/checkout-appearance.server";
import { settlementAddress, testnetByKey } from "@/lib/chains";

// The link lookup reads the database per request, so this route renders on
// demand rather than being prerendered.
export const instant = false;

export const metadata: Metadata = {
  title: "Confirm payment — AirPay",
  description:
    "Secure hosted checkout powered by AirPay. Select your network and coin and confirm the payment.",
};

export default async function PayPage({ params }: PageProps<"/pay/[slug]">) {
  const { slug } = await params;
  const row = await getLinkBySlug(slug);
  const link = row && row.active ? toPublicLink(row) : null;
  const receiver = link?.receiver ?? process.env.RECEIVER_ADDRESS ?? "";
  const info = row ? testnetByKey(row.chain_key) : null;
  const contract = info ? settlementAddress(info) : null;
  const settlementContract =
    contract && receiver.toLowerCase() === contract.toLowerCase() ? contract : null;
  const appearance = await getCheckoutAppearance(row?.organizationId);
  return (
    <HostedCheckout
      receiver={receiver}
      link={link}
      appearance={appearance}
      settlementContract={settlementContract}
    />
  );
}
