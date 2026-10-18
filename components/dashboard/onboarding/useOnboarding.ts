"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpcClient } from "@/lib/orpc/client";
import type { CompleteOnboardingInput } from "@/lib/schemas/onboarding";

export interface OnboardingState {
  onboarded: boolean;
  organizationId: string;
  accountType: "individual" | "team" | null;
  enabledChains: string[];
  enabledAssets: Record<string, string[]>;
  payoutWallet: string;
  enabledPairs: Record<string, string[]>;
}

export const ONBOARDING_QUERY_KEY = ["onboarding"] as const;

export function useOnboarding() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: async () => (await orpcClient.onboarding.get()) as OnboardingState,
  });

  const mutation = useMutation({
    mutationFn: async (input: CompleteOnboardingInput) =>
      (await orpcClient.onboarding.complete(input)) as { ok: boolean; invited: number },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["links"] });
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    complete: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
