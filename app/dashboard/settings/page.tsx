import { Suspense } from "react";
import type { Metadata } from "next";
import SettingsPage from "@/components/dashboard/pages/SettingsPage";
import PageHeader from "@/components/dashboard/PageHeader";
import { Card } from "@/components/dashboard/ui/Card";

export const metadata: Metadata = {
  title: "Settings — AirPay Dashboard",
  description: "Workspace, payout destinations, and sender email.",
};

// Suspense is required: SettingsPage reads useSearchParams for the Google
// OAuth return deep link (?email=…).
export default function Page() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader
            title="Settings"
            description="Workspace, payout destinations, and sender email."
          />
          <Card>
            <div className="px-5 py-6 text-[13px] text-d-muted">Loading settings…</div>
          </Card>
        </>
      }
    >
      <SettingsPage />
    </Suspense>
  );
}
