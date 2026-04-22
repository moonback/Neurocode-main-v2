import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Hook to fetch context observability data for a specific interaction.
 *
 * Returns the full observability record including:
 * - List of included files with relevance scores
 * - Token usage per file
 * - Total tokens used
 * - Strategy applied
 *
 * @param interactionId - UUID of the interaction to fetch observability data for
 * @param options - React Query options (enabled, refetchInterval, etc.)
 *
 * @example
 * const { data, isLoading, error } = useContextObservability({
 *   interactionId: "abc-123-def-456"
 * });
 *
 * if (data && !("error" in data)) {
 *   console.log("Files included:", data.includedFiles);
 *   console.log("Total tokens:", data.totalTokensUsed);
 * }
 */
export function useContextObservability({
  interactionId,
  enabled = true,
}: {
  interactionId: string | undefined;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.smartContext.observability({ interactionId }),
    queryFn: () =>
      ipc.smartContext.getContextObservability({
        interactionId: interactionId!,
      }),
    enabled: enabled && !!interactionId,
  });
}

/**
 * Hook to fetch recent context observability records.
 *
 * Returns up to 50 most recent interactions with their observability data.
 * Useful for displaying a history of context selections or debugging.
 *
 * @param options - React Query options (enabled, refetchInterval, etc.)
 *
 * @example
 * const { data, isLoading, error } = useRecentContextObservability();
 *
 * if (data) {
 *   data.forEach(record => {
 *     console.log(`Interaction ${record.interactionId}:`);
 *     console.log(`  Strategy: ${record.strategy}`);
 *     console.log(`  Files: ${record.includedFiles.length}`);
 *     console.log(`  Tokens: ${record.totalTokensUsed}`);
 *   });
 * }
 */
export function useRecentContextObservability({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  return useQuery({
    queryKey: queryKeys.smartContext.recentObservability,
    queryFn: () => ipc.smartContext.getRecentContextObservability(),
    enabled,
  });
}
