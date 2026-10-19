"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "../PageHeader";
import TransactionsTable from "../TransactionsTable";
import ExportButton from "../ui/ExportButton";
import { useDashboard } from "../DashboardContext";
import { orpcClient } from "@/lib/orpc/client";
import type { Payment } from "../data";
import type { PublicIntent } from "@/lib/api-types";
import { toPayment } from "../utils";
import { feeUsd, netUsd } from "@/lib/fees";

export default function TransactionsPage() {
  const { openPayment } = useDashboard();
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await orpcClient.payments.listByOrg({})) as PublicIntent[],
  });

  const payments = (data ?? []).map(toPayment);

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every transaction flowing through your AirPay account, with fees and settlement details."
        actions={
          <ExportButton
            filename="transactions.csv"
            title="CSV"
            rows={[
              [
                "Transaction",
                "Merchant",
                "Payer",
                "Gross",
                "Fee",
                "Net",
                "Coin",
                "Chain",
                "Status",
                "Tx hash",
                "Confirmations",
                "Receiver",
                "Time",
              ],
              ...payments.map((p) => [
                p.id,
                p.merchant,
                p.payer ?? "",
                p.amount,
                (p.feeUsd ?? feeUsd(p.amountUsd, p.feeBps)).toFixed(2),
                (p.netUsd ?? netUsd(p.amountUsd, p.feeBps)).toFixed(2),
                p.coin,
                p.chain,
                p.status,
                p.txHash ?? "",
                `${p.confirmations}/${p.requiredConfirmations}`,
                p.receiver,
                p.time,
              ]),
            ]}
          />
        }
      />
      <TransactionsTable
        query={query}
        onSearch={setQuery}
        onRowClick={openPayment as (p: Payment) => void}
        items={payments}
        loading={isLoading}
      />
    </>
  );
}
