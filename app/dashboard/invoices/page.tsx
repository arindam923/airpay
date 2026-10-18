import type { Metadata } from "next";
import InvoicesPage from "@/components/dashboard/pages/InvoicesPage";

export const metadata: Metadata = {
  title: "Invoices — AirPay Dashboard",
  description: "Create, share, and track invoices for your customers.",
};

export default function Page() {
  return <InvoicesPage />;
}
