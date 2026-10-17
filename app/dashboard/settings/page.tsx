import type { Metadata } from "next";
import SettingsPage from "@/components/dashboard/pages/SettingsPage";

export const metadata: Metadata = {
  title: "Settings — AirPay Dashboard",
  description: "Workspace, settlement, and notification preferences.",
};

export default function Page() {
  return <SettingsPage />;
}
