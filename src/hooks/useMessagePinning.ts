import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";

/**
 * Hook for managing message pinning (protecting messages from context pruning).
 */
export function useMessagePinning() {
  const queryClient = useQueryClient();

  /**
   * Mutation to pin a message.
   */
  const pinMessage = useMutation({
    mutationFn: async (messageId: number) => {
      await ipc.tokenOptimization.pinMessage(messageId);
    },
    onSuccess: (_, messageId) => {
      // Invalidate message priority query
      queryClient.invalidateQueries({ queryKey: ["message-priority", messageId] });
      // We might also want to invalidate the chat messages to show the pinned status
      queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });

  /**
   * Mutation to unpin a message.
   */
  const unpinMessage = useMutation({
    mutationFn: async (messageId: number) => {
      await ipc.tokenOptimization.unpinMessage(messageId);
    },
    onSuccess: (_, messageId) => {
      queryClient.invalidateQueries({ queryKey: ["message-priority", messageId] });
      queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });

  return {
    pinMessage: pinMessage.mutateAsync,
    unpinMessage: unpinMessage.mutateAsync,
    isPinning: pinMessage.isPending,
    isUnpinning: unpinMessage.isPending,
  };
}

/**
 * Hook to get the priority and pinning status of a message.
 */
export function useMessagePriority(messageId: number) {
  return useQuery({
    queryKey: ["message-priority", messageId],
    queryFn: async () => {
      return await ipc.tokenOptimization.getMessagePriority(messageId);
    },
    enabled: !!messageId,
  });
}
