import type { Metadata } from "next";
import PayoutsPage from "@/components/dashboard/pages/PayoutsPage";

export const metadata: Metadata = {
  title: "Payouts — AirPay Dashboard",
  description: "Scheduled and completed settlements to your treasury wallets.",
};

export default function Page() {
  return <PayoutsPage />;
}
