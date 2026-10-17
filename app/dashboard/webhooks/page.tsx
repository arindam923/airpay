import type { Metadata } from "next";
import WebhooksPage from "@/components/dashboard/pages/WebhooksPage";

export const metadata: Metadata = {
  title: "Webhooks — AirPay Dashboard",
  description: "Configure endpoints and inspect real-time event deliveries.",
};

export default function Page() {
  return <WebhooksPage />;
}
