import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { useAtomValue } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";

/**
 * Hook for fetching and monitoring token budget and current usage.
 */
export function useTokenBudget() {
  const appId = useAtomValue(selectedAppIdAtom);

  // Get configuration (which includes budget settings)
  const { data: config } = useQuery({
    queryKey: ["token-optimization-config", appId],
    queryFn: async () => {
      return await ipc.tokenOptimization.getConfig(appId ?? undefined);
    },
  });

  // Get current cost summary
  const { data: summary } = useQuery({
    queryKey: ["cost-summary", appId],
    queryFn: async () => {
      return await ipc.tokenOptimization.getCostSummary({
        period: "monthly",
        appId: appId ?? undefined,
      });
    },
    // Refresh more frequently since costs update as messages are sent
    refetchInterval: 30000, 
  });

  return {
    config,
    summary,
    budgetLimit: config?.costBudget?.amount ?? 0,
    currentCost: summary?.totalCost ?? 0,
    usagePercentage: summary?.usagePercentage ?? 0,
    isWarning: (summary?.usagePercentage ?? 0) >= (config?.costBudget?.warningThreshold ?? 80),
  };
}
