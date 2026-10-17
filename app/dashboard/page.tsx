import type { Metadata } from "next";
import Overview from "@/components/dashboard/Overview";

export const metadata: Metadata = {
  title: "Overview — AirPay Dashboard",
  description:
    "Track payments, revenue, and settlements across all chains in the AirPay dashboard.",
};

export default function DashboardPage() {
  return <Overview />;
}
