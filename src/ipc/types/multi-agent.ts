/**
 * IPC contracts for the multi-agent workflow system.
 */

import { z } from "zod";
import {
  defineContract,
  defineEvent,
  createClient,
  createEventClient,
} from "../contracts/core";

// =============================================================================
// Schemas
// =============================================================================

export const AgentCapabilitySchema = z.enum([
  "file-read",
  "file-write",
  "code-search",
  "web-search",
  "test-generation",
  "code-review",
  "architecture",
  "debugging",
  "planning",
  "documentation",
  "refactoring",
  "security-review",
  "performance-optimization",
]);

export const AgentDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  role: z.string(),
  capabilities: z.array(AgentCapabilitySchema),
  icon: z.string(),
  color: z.string(),
  isCustom: z.boolean(),
  maxToolCallSteps: z.number().optional(),
});
export type AgentDefinitionDto = z.infer<typeof AgentDefinitionSchema>;

export const WorkflowTaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  assignedAgentId: z.string(),
  status: z.enum([
    "pending",
    "running",
    "waiting-for-input",
    "completed",
    "failed",
    "cancelled",
  ]),
  result: z.string().optional(),
  error: z.string().optional(),
  dependsOn: z.array(z.string()),
  order: z.number(),
});

export const WorkflowExecutionSchema = z.object({
  id: z.string(),
  chatId: z.number(),
  appId: z.number(),
  userRequest: z.string(),
  strategy: z.enum(["sequential", "parallel", "pipeline", "adaptive"]),
  tasks: z.array(WorkflowTaskSchema),
  status: z.enum([
    "pending",
    "running",
    "waiting-for-input",
    "completed",
    "failed",
    "cancelled",
  ]),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  aggregatedResult: z.string().optional(),
});
export type WorkflowExecutionDto = z.infer<typeof WorkflowExecutionSchema>;

export const CreateCustomAgentParamsSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  systemPrompt: z.string().min(1),
  capabilities: z.array(AgentCapabilitySchema),
  allowedTools: z.array(z.string()).optional(),
  excludedTools: z.array(z.string()).optional(),
  icon: z.string(),
  color: z.string(),
  maxToolCallSteps: z.number().optional(),
});
export type CreateCustomAgentParams = z.infer<
  typeof CreateCustomAgentParamsSchema
>;

export const UpdateCustomAgentParamsSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().min(1).optional(),
  capabilities: z.array(AgentCapabilitySchema).optional(),
  allowedTools: z.array(z.string()).optional(),
  excludedTools: z.array(z.string()).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  maxToolCallSteps: z.number().optional(),
});
export type UpdateCustomAgentParams = z.infer<
  typeof UpdateCustomAgentParamsSchema
>;

export const StartWorkflowParamsSchema = z.object({
  chatId: z.number(),
  appId: z.number(),
  userRequest: z.string(),
  strategy: z
    .enum(["sequential", "parallel", "pipeline", "adaptive"])
    .optional(),
  selectedAgentIds: z.array(z.string()).optional(),
});
export type StartWorkflowParams = z.infer<typeof StartWorkflowParamsSchema>;

export const WorkflowUpdatePayloadSchema = z.object({
  workflow: WorkflowExecutionSchema,
});

export const TaskUpdatePayloadSchema = z.object({
  workflowId: z.string(),
  task: WorkflowTaskSchema,
  agentName: z.string().optional(),
});

// =============================================================================
// Contracts (Invoke/Response)
// =============================================================================

export const multiAgentContracts = {
  getAgents: defineContract({
    channel: "multi-agent:get-agents",
    input: z.void(),
    output: z.array(AgentDefinitionSchema),
  }),
  getAgent: defineContract({
    channel: "multi-agent:get-agent",
    input: z.object({ id: z.string() }),
    output: AgentDefinitionSchema.nullable(),
  }),
  createCustomAgent: defineContract({
    channel: "multi-agent:create-custom-agent",
    input: CreateCustomAgentParamsSchema,
    output: AgentDefinitionSchema,
  }),
  updateCustomAgent: defineContract({
    channel: "multi-agent:update-custom-agent",
    input: UpdateCustomAgentParamsSchema,
    output: AgentDefinitionSchema.nullable(),
  }),
  deleteCustomAgent: defineContract({
    channel: "multi-agent:delete-custom-agent",
    input: z.object({ id: z.string() }),
    output: z.object({ success: z.boolean() }),
  }),
  cancelWorkflow: defineContract({
    channel: "multi-agent:cancel-workflow",
    input: z.object({ workflowId: z.string() }),
    output: z.object({ success: z.boolean() }),
  }),
  getActiveWorkflows: defineContract({
    channel: "multi-agent:get-active-workflows",
    input: z.object({ chatId: z.number() }),
    output: z.array(WorkflowExecutionSchema),
  }),
  startWorkflow: defineContract({
    channel: "multi-agent:start-workflow",
    input: StartWorkflowParamsSchema,
    output: WorkflowExecutionSchema,
  }),
} as const;

// =============================================================================
// Event Contracts (Main -> Renderer)
// =============================================================================

export const multiAgentEvents = {
  workflowUpdate: defineEvent({
    channel: "multi-agent:workflow-update",
    payload: WorkflowUpdatePayloadSchema,
  }),
  taskStart: defineEvent({
    channel: "multi-agent:task-start",
    payload: TaskUpdatePayloadSchema,
  }),
  taskComplete: defineEvent({
    channel: "multi-agent:task-complete",
    payload: TaskUpdatePayloadSchema,
  }),
  taskFail: defineEvent({
    channel: "multi-agent:task-fail",
    payload: TaskUpdatePayloadSchema,
  }),
} as const;

// =============================================================================
// Clients
// =============================================================================

export const multiAgentClient = createClient(multiAgentContracts);
export const multiAgentEventClient = createEventClient(multiAgentEvents);
