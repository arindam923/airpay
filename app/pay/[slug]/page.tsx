import type { Metadata } from "next";
import HostedCheckout from "@/components/pay/HostedCheckout";

export const metadata: Metadata = {
  title: "Confirm payment — AirPay",
  description:
    "Secure hosted checkout powered by AirPay. Select your network and coin and confirm the payment.",
};

export default function PayPage() {
  const receiver = process.env.RECEIVER_ADDRESS ?? "";
  return <HostedCheckout receiver={receiver} />;
}
