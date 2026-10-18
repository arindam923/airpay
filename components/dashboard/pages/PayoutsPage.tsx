"use client";

import PageHeader from "../PageHeader";
import EmptyState from "../ui/EmptyState";

function PayoutIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16v10H4zM4 10h16M8 14h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PayoutsPage() {
  return (
    <>
      <PageHeader
        title="Payouts"
        description="Scheduled and completed settlements to your treasury wallets."
      />
      <EmptyState
        icon={<PayoutIcon />}
        eyebrow="Not yet available"
        title="Automated payouts are coming soon"
        description="AirPay settles each confirmed payment straight to the receiver wallet you configure on every link and invoice. Scheduled treasury payouts and bank off-ramps will appear here once they ship."
      />
    </>
  );
}
