import type { Metadata } from "next";
import PaymentsPage from "@/components/dashboard/pages/PaymentsPage";

export const metadata: Metadata = {
  title: "Payments — AirPay Dashboard",
  description: "Search, filter, and export every payment in your workspace.",
};

export default function Page() {
  return <PaymentsPage />;
}
