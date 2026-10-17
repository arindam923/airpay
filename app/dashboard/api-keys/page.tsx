import type { Metadata } from "next";
import ApiKeysPage from "@/components/dashboard/pages/ApiKeysPage";

export const metadata: Metadata = {
  title: "API keys — AirPay Dashboard",
  description: "Create and revoke keys for the AirPay API.",
};

export default function Page() {
  return <ApiKeysPage />;
}
