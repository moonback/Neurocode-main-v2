import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { useState, useEffect } from "react";

/**
 * Hook for estimating the cost of the next message based on input.
 */
export function useCostEstimation(chatId: number | null, input: string) {
  // Debounce input to avoid excessive IPC calls
  const [debouncedInput, setDebouncedInput] = useState(input);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input);
    }, 1000);
    return () => clearTimeout(timer);
  }, [input]);

  return useQuery({
    queryKey: ["cost-estimation", chatId, debouncedInput],
    queryFn: async () => {
      if (!chatId || !debouncedInput.trim()) return null;
      return await ipc.tokenOptimization.estimateNextMessageCost({
        chatId,
        input: debouncedInput,
      });
    },
    enabled: !!chatId && debouncedInput.trim().length > 0,
    staleTime: 5000,
  });
}
