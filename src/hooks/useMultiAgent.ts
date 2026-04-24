/**
 * React hooks for the multi-agent workflow system.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { queryKeys } from "@/lib/queryKeys";
import { multiAgentClient, multiAgentEventClient } from "@/ipc/types";
import type {
  AgentDefinitionDto,
  CreateCustomAgentParams,
  UpdateCustomAgentParams,
} from "@/ipc/types";

/**
 * Hook to fetch all available agents (built-in + custom).
 */
export function useMultiAgentList() {
  return useQuery({
    queryKey: queryKeys.multiAgent.agents,
    queryFn: () => multiAgentClient.getAgents(),
  });
}

/**
 * Hook to create a custom agent.
 */
export function useCreateCustomAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateCustomAgentParams) =>
      multiAgentClient.createCustomAgent(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.multiAgent.agents });
    },
  });
}

/**
 * Hook to update a custom agent.
 */
export function useUpdateCustomAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: UpdateCustomAgentParams) =>
      multiAgentClient.updateCustomAgent(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.multiAgent.agents });
    },
  });
}

/**
 * Hook to delete a custom agent.
 */
export function useDeleteCustomAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => multiAgentClient.deleteCustomAgent({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.multiAgent.agents });
    },
  });
}

/**
 * Hook to subscribe to real-time workflow events.
 */
export function useWorkflowEvents(
  chatId: number | null,
  callbacks: {
    onWorkflowUpdate?: (workflow: any) => void;
    onTaskStart?: (data: any) => void;
    onTaskComplete?: (data: any) => void;
    onTaskFail?: (data: any) => void;
  },
) {
  useEffect(() => {
    if (!chatId) return;

    const unsubs: (() => void)[] = [];

    if (callbacks.onWorkflowUpdate) {
      unsubs.push(
        multiAgentEventClient.onWorkflowUpdate((payload) => {
          if (payload.workflow.chatId === chatId) {
            callbacks.onWorkflowUpdate?.(payload.workflow);
          }
        }),
      );
    }

    if (callbacks.onTaskStart) {
      unsubs.push(
        multiAgentEventClient.onTaskStart((payload) => {
          callbacks.onTaskStart?.(payload);
        }),
      );
    }

    if (callbacks.onTaskComplete) {
      unsubs.push(
        multiAgentEventClient.onTaskComplete((payload) => {
          callbacks.onTaskComplete?.(payload);
        }),
      );
    }

    if (callbacks.onTaskFail) {
      unsubs.push(
        multiAgentEventClient.onTaskFail((payload) => {
          callbacks.onTaskFail?.(payload);
        }),
      );
    }

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [chatId]);
}

/**
 * Hook to cancel a running workflow.
 */
export function useCancelWorkflow() {
  return useMutation({
    mutationFn: (workflowId: string) =>
      multiAgentClient.cancelWorkflow({ workflowId }),
  });
}

/**
 * Hook to start a new multi-agent workflow.
 */
export function useStartWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof multiAgentClient.startWorkflow>[0]) =>
      multiAgentClient.startWorkflow(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.multiAgent.workflows({ chatId: variables.chatId }),
      });
    },
  });
}
