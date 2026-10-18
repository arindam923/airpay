import type { Metadata } from "next";
import OnboardingWizard from "@/components/dashboard/onboarding/OnboardingWizard";

export const metadata: Metadata = {
  title: "Set up your account — AirPay",
  description: "Configure your account type, networks, and payout wallet.",
};

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-[560px]">
      <div className="mb-6">
        <h1 className="font-sans text-[26px] font-medium leading-none tracking-[-0.02em] text-d-ink">
          Finish setting up your account
        </h1>
        <p className="mt-2 text-[13px] text-d-muted">
          Three quick steps before you can accept payments.
        </p>
      </div>
      <OnboardingWizard />
    </div>
  );
}
