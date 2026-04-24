/**
 * IPC handlers for the multi-agent workflow system.
 */

import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import {
  getAllAgents,
  getAgentById,
  createCustomAgent,
  updateCustomAgent,
  deleteCustomAgent,
} from "@/multi-agent/registry";
import {
  getWorkflowsForChat,
  cancelWorkflow,
} from "@/multi-agent/orchestrator";
import type {
  AgentDefinitionDto,
  CreateCustomAgentParams,
  UpdateCustomAgentParams,
  WorkflowExecutionDto,
} from "@/ipc/types/multi-agent";

const logger = log.scope("multi_agent_handlers");
const handle = createLoggedHandler(logger);

export function registerMultiAgentHandlers(): void {
  // Get all available agents (built-in + custom)
  handle(
    "multi-agent:get-agents",
    async (): Promise<AgentDefinitionDto[]> => {
      return getAllAgents().map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        role: agent.role,
        capabilities: [...agent.capabilities],
        icon: agent.icon,
        color: agent.color,
        isCustom: agent.isCustom,
        maxToolCallSteps: agent.maxToolCallSteps,
      }));
    },
  );

  // Get a single agent by ID
  handle(
    "multi-agent:get-agent",
    async (_event, params: { id: string }): Promise<AgentDefinitionDto | null> => {
      const agent = getAgentById(params.id);
      if (!agent) return null;
      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        role: agent.role,
        capabilities: [...agent.capabilities],
        icon: agent.icon,
        color: agent.color,
        isCustom: agent.isCustom,
        maxToolCallSteps: agent.maxToolCallSteps,
      };
    },
  );

  // Create a custom agent
  handle(
    "multi-agent:create-custom-agent",
    async (
      _event,
      params: CreateCustomAgentParams,
    ): Promise<AgentDefinitionDto> => {
      const agent = createCustomAgent(params);
      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        role: agent.role,
        capabilities: [...agent.capabilities],
        icon: agent.icon,
        color: agent.color,
        isCustom: agent.isCustom,
        maxToolCallSteps: agent.maxToolCallSteps,
      };
    },
  );

  // Update a custom agent
  handle(
    "multi-agent:update-custom-agent",
    async (
      _event,
      params: UpdateCustomAgentParams,
    ): Promise<AgentDefinitionDto | null> => {
      const { id, ...updates } = params;
      const agent = updateCustomAgent(id, updates);
      if (!agent) return null;
      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        role: agent.role,
        capabilities: [...agent.capabilities],
        icon: agent.icon,
        color: agent.color,
        isCustom: agent.isCustom,
        maxToolCallSteps: agent.maxToolCallSteps,
      };
    },
  );

  // Delete a custom agent
  handle(
    "multi-agent:delete-custom-agent",
    async (
      _event,
      params: { id: string },
    ): Promise<{ success: boolean }> => {
      const success = deleteCustomAgent(params.id);
      return { success };
    },
  );

  // Get active workflows for a chat
  handle(
    "multi-agent:get-active-workflows",
    async (
      _event,
      params: { chatId: number },
    ): Promise<WorkflowExecutionDto[]> => {
      return getWorkflowsForChat(params.chatId).map((w) => ({
        ...w,
        tasks: w.tasks.map((t) => ({ ...t, dependsOn: [...t.dependsOn] })),
      }));
    },
  );

  // Cancel a workflow
  handle(
    "multi-agent:cancel-workflow",
    async (
      _event,
      params: { workflowId: string },
    ): Promise<{ success: boolean }> => {
      const success = cancelWorkflow(params.workflowId);
      return { success };
    },
  );
}
