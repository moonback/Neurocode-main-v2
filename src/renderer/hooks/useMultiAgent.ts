/**
 * React Query hooks for multi-agent system
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import type {
  CreateAgentProfileParams,
  UpdateAgentProfileParams,
  StartAgentExecutionParams,
  MultiAgentOrchestrationParams,
} from "@/ipc/types/multi_agent";
import { queryKeys } from "@/lib/queryKeys";
import { useEffect } from "react";

/**
 * Get all agent profiles
 */
export function useAgentProfiles() {
  return useQuery({
    queryKey: queryKeys.multiAgent.profiles(),
    queryFn: () => ipc.multiAgent.getAgentProfiles(),
  });
}

/**
 * Get a single agent profile
 */
export function useAgentProfile(profileId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.multiAgent.profile({ profileId: profileId! }),
    queryFn: () => ipc.multiAgent.getAgentProfile(profileId!),
    enabled: profileId !== undefined,
  });
}

/**
 * Get agent executions for a chat
 */
export function useAgentExecutions(chatId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.multiAgent.executions({ chatId: chatId! }),
    queryFn: () => ipc.multiAgent.getAgentExecutions(chatId!),
    enabled: chatId !== undefined,
    refetchInterval: 2000, // Poll every 2 seconds for updates
  });
}

/**
 * Get or create a dedicated agent chat for an app
 */
export function useGetOrCreateAgentChat(appId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.multiAgent.agentChat({ appId: appId! }),
    queryFn: () => ipc.multiAgent.getOrCreateAgentChat(appId!),
    enabled: appId !== undefined,
    staleTime: Infinity, // Chat ID won't change once created
  });
}

/**
 * Get a single agent execution
 */
export function useAgentExecution(executionId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.multiAgent.execution({ executionId: executionId! }),
    queryFn: () => ipc.multiAgent.getAgentExecution(executionId!),
    enabled: executionId !== undefined,
  });
}

/**
 * Get agent messages for an execution
 */
export function useAgentMessages(executionId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.multiAgent.messages({ executionId: executionId! }),
    queryFn: () => ipc.multiAgent.getAgentMessages(executionId!),
    enabled: executionId !== undefined,
  });
}

/**
 * Get agent communications for a chat
 */
export function useAgentCommunications(chatId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.multiAgent.communications({ chatId: chatId! }),
    queryFn: () => ipc.multiAgent.getAgentCommunications(chatId!),
    enabled: chatId !== undefined,
  });
}

/**
 * Create a new agent profile
 */
export function useCreateAgentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateAgentProfileParams) =>
      ipc.multiAgent.createAgentProfile(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.multiAgent.profiles(),
      });
    },
  });
}

/**
 * Update an agent profile
 */
export function useUpdateAgentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: UpdateAgentProfileParams) =>
      ipc.multiAgent.updateAgentProfile(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.multiAgent.profiles(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.multiAgent.profile({ profileId: variables.id }),
      });
    },
  });
}

/**
 * Delete an agent profile
 */
export function useDeleteAgentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: number) =>
      ipc.multiAgent.deleteAgentProfile(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.multiAgent.profiles(),
      });
    },
  });
}

/**
 * Start an agent execution
 */
export function useStartAgentExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: StartAgentExecutionParams) =>
      ipc.multiAgent.startAgentExecution(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.multiAgent.executions({ chatId: variables.chatId }),
      });
    },
  });
}

/**
 * Orchestrate multiple agents
 */
export function useOrchestrateAgents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: MultiAgentOrchestrationParams) =>
      ipc.multiAgent.orchestrateAgents(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.multiAgent.executions({ chatId: variables.chatId }),
      });
    },
  });
}

/**
 * Cancel an agent execution
 */
export function useCancelAgentExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (executionId: number) =>
      ipc.multiAgent.cancelAgentExecution(executionId),
    onSuccess: () => {
      // Invalidate all executions to refresh status
      queryClient.invalidateQueries({
        queryKey: queryKeys.multiAgent.all,
      });
    },
  });
}

/**
 * Subscribe to agent execution updates
 */
export function useAgentExecutionUpdates(chatId: number | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (chatId === undefined) return;

    const unsubscribe = ipc.events.multiAgent.onOnExecutionUpdate((payload) => {
      if (payload.chatId === chatId) {
        // Invalidate executions query to trigger refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.multiAgent.executions({ chatId }),
        });
      }
    });

    return unsubscribe;
  }, [chatId, queryClient]);
}

/**
 * Subscribe to agent communications
 */
export function useAgentCommunicationUpdates(chatId: number | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (chatId === undefined) return;

    const unsubscribe = ipc.events.multiAgent.onOnCommunication((payload) => {
      if (payload.chatId === chatId) {
        // Invalidate communications query to trigger refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.multiAgent.communications({ chatId }),
        });
      }
    });

    return unsubscribe;
  }, [chatId, queryClient]);
}
