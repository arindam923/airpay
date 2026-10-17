import type { Metadata } from "next";
import AuditLogPage from "@/components/dashboard/pages/AuditLogPage";

export const metadata: Metadata = {
  title: "Audit log — AirPay Dashboard",
  description: "Immutable record of every action in this workspace.",
};

export default function Page() {
  return <AuditLogPage />;
}
