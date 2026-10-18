import type { Metadata } from "next";
import TransactionsPage from "@/components/dashboard/pages/TransactionsPage";

export const metadata: Metadata = {
  title: "Transactions — AirPay Dashboard",
  description: "Every transaction with fees and settlement details.",
};

export default function Page() {
  return <TransactionsPage />;
}
