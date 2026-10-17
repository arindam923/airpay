import type { Metadata } from "next";
import CustomersPage from "@/components/dashboard/pages/CustomersPage";

export const metadata: Metadata = {
  title: "Customers — AirPay Dashboard",
  description: "Everyone who has paid you, aggregated across chains.",
};

export default function Page() {
  return <CustomersPage />;
}
