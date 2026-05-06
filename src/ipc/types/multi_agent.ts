import { z } from "zod";
import {
  defineContract,
  defineEvent,
  createClient,
  createEventClient,
} from "../contracts/core";

// =============================================================================
// Multi-Agent Schemas
// =============================================================================

/**
 * Agent role types
 */
export const AgentRoleSchema = z.enum([
  "orchestrator",
  "code",
  "test",
  "documentation",
  "research",
  "database",
  "custom",
]);

export type AgentRole = z.infer<typeof AgentRoleSchema>;

/**
 * Agent profile schema
 */
export const AgentProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  role: AgentRoleSchema,
  systemPrompt: z.string(),
  allowedTools: z.array(z.string()).nullable(),
  config: z.record(z.string(), z.unknown()).nullable(),
  isBuiltin: z.boolean(),
  isEnabled: z.boolean(),
  createdAt: z.union([z.date(), z.string()]),
  updatedAt: z.union([z.date(), z.string()]),
});

export type AgentProfile = z.infer<typeof AgentProfileSchema>;

/**
 * Agent execution status
 */
export const AgentExecutionStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export type AgentExecutionStatus = z.infer<typeof AgentExecutionStatusSchema>;

/**
 * Agent execution schema
 */
export const AgentExecutionSchema = z.object({
  id: z.number(),
  chatId: z.number(),
  agentProfileId: z.number(),
  parentExecutionId: z.number().nullable(),
  status: AgentExecutionStatusSchema,
  task: z.string(),
  result: z.string().nullable(),
  error: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  startedAt: z.union([z.date(), z.string()]).nullable(),
  completedAt: z.union([z.date(), z.string()]).nullable(),
  createdAt: z.union([z.date(), z.string()]),
});

export type AgentExecution = z.infer<typeof AgentExecutionSchema>;

/**
 * Agent message schema
 */
export const AgentMessageSchema = z.object({
  id: z.number(),
  executionId: z.number(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  aiMessagesJson: z.unknown().nullable(),
  toolName: z.string().nullable(),
  toolInput: z.record(z.string(), z.unknown()).nullable(),
  toolOutput: z.string().nullable(),
  createdAt: z.union([z.date(), z.string()]),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

/**
 * Agent communication message type
 */
export const AgentCommunicationTypeSchema = z.enum([
  "task_delegation",
  "result_report",
  "question",
  "answer",
]);

export type AgentCommunicationType = z.infer<
  typeof AgentCommunicationTypeSchema
>;

/**
 * Agent communication schema
 */
export const AgentCommunicationSchema = z.object({
  id: z.number(),
  chatId: z.number(),
  fromExecutionId: z.number(),
  toExecutionId: z.number(),
  messageType: AgentCommunicationTypeSchema,
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.union([z.date(), z.string()]),
});

export type AgentCommunication = z.infer<typeof AgentCommunicationSchema>;

/**
 * Create agent profile params
 */
export const CreateAgentProfileParamsSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  role: AgentRoleSchema,
  systemPrompt: z.string(),
  allowedTools: z.array(z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAgentProfileParams = z.infer<
  typeof CreateAgentProfileParamsSchema
>;

/**
 * Update agent profile params
 */
export const UpdateAgentProfileParamsSchema = z.object({
  id: z.number(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isEnabled: z.boolean().optional(),
});

export type UpdateAgentProfileParams = z.infer<
  typeof UpdateAgentProfileParamsSchema
>;

/**
 * Start agent execution params
 */
export const StartAgentExecutionParamsSchema = z.object({
  chatId: z.number(),
  agentProfileId: z.number().optional(), // If not provided, orchestrator decides
  task: z.string(),
  parentExecutionId: z.number().optional(),
});

export type StartAgentExecutionParams = z.infer<
  typeof StartAgentExecutionParamsSchema
>;

/**
 * Agent execution with details (includes profile and messages)
 */
export const AgentExecutionDetailSchema = AgentExecutionSchema.extend({
  agentProfile: AgentProfileSchema,
  messages: z.array(AgentMessageSchema),
  childExecutions: z.array(AgentExecutionSchema).optional(),
});

export type AgentExecutionDetail = z.infer<typeof AgentExecutionDetailSchema>;

/**
 * Multi-agent orchestration request
 */
export const MultiAgentOrchestrationParamsSchema = z.object({
  chatId: z.number(),
  prompt: z.string(),
  selectedAgentId: z.number().optional(), // Manual agent selection
  parallelExecution: z.boolean().optional(),
  useLLMSelection: z.boolean().default(true), // Use LLM for agent selection
});

export type MultiAgentOrchestrationParams = z.infer<
  typeof MultiAgentOrchestrationParamsSchema
>;

/**
 * Agent execution update event payload
 */
export const AgentExecutionUpdateSchema = z.object({
  chatId: z.number(),
  execution: AgentExecutionSchema,
});

export type AgentExecutionUpdate = z.infer<typeof AgentExecutionUpdateSchema>;

/**
 * Agent communication event payload
 */
export const AgentCommunicationEventSchema = z.object({
  chatId: z.number(),
  communication: AgentCommunicationSchema,
});

export type AgentCommunicationEvent = z.infer<
  typeof AgentCommunicationEventSchema
>;

// =============================================================================
// Multi-Agent Contracts (Invoke/Response)
// =============================================================================

export const multiAgentContracts = {
  // Agent Profile Management
  getAgentProfiles: defineContract({
    channel: "multi-agent:get-profiles",
    input: z.void(),
    output: z.array(AgentProfileSchema),
  }),

  getAgentProfile: defineContract({
    channel: "multi-agent:get-profile",
    input: z.number(), // profileId
    output: AgentProfileSchema,
  }),

  createAgentProfile: defineContract({
    channel: "multi-agent:create-profile",
    input: CreateAgentProfileParamsSchema,
    output: AgentProfileSchema,
  }),

  updateAgentProfile: defineContract({
    channel: "multi-agent:update-profile",
    input: UpdateAgentProfileParamsSchema,
    output: AgentProfileSchema,
  }),

  deleteAgentProfile: defineContract({
    channel: "multi-agent:delete-profile",
    input: z.number(), // profileId
    output: z.void(),
  }),

  // Agent Execution Management
  getAgentExecutions: defineContract({
    channel: "multi-agent:get-executions",
    input: z.number(), // chatId
    output: z.array(AgentExecutionDetailSchema),
  }),

  getAgentExecution: defineContract({
    channel: "multi-agent:get-execution",
    input: z.number(), // executionId
    output: AgentExecutionDetailSchema,
  }),

  startAgentExecution: defineContract({
    channel: "multi-agent:start-execution",
    input: StartAgentExecutionParamsSchema,
    output: AgentExecutionSchema,
  }),

  cancelAgentExecution: defineContract({
    channel: "multi-agent:cancel-execution",
    input: z.number(), // executionId
    output: z.boolean(),
  }),

  // Agent Messages
  getAgentMessages: defineContract({
    channel: "multi-agent:get-messages",
    input: z.number(), // executionId
    output: z.array(AgentMessageSchema),
  }),

  // Agent Communications
  getAgentCommunications: defineContract({
    channel: "multi-agent:get-communications",
    input: z.number(), // chatId
    output: z.array(AgentCommunicationSchema),
  }),

  // Multi-Agent Orchestration
  orchestrateAgents: defineContract({
    channel: "multi-agent:orchestrate",
    input: MultiAgentOrchestrationParamsSchema,
    output: z.object({
      executionIds: z.array(z.number()),
    }),
  }),

  // Get or create a dedicated chat for agents
  getOrCreateAgentChat: defineContract({
    channel: "multi-agent:get-or-create-agent-chat",
    input: z.number(), // appId
    output: z.number(), // chatId
  }),
} as const;

// =============================================================================
// Multi-Agent Events
// =============================================================================

export const multiAgentEvents = {
  onExecutionUpdate: defineEvent({
    channel: "multi-agent:execution-update",
    payload: AgentExecutionUpdateSchema,
  }),

  onCommunication: defineEvent({
    channel: "multi-agent:communication",
    payload: AgentCommunicationEventSchema,
  }),
} as const;

// =============================================================================
// Multi-Agent Clients
// =============================================================================

/**
 * Type-safe client for multi-agent IPC operations.
 *
 * @example
 * const profiles = await multiAgentClient.getAgentProfiles();
 * const execution = await multiAgentClient.startAgentExecution({ chatId, task });
 */
export const multiAgentClient = createClient(multiAgentContracts);

/**
 * Type-safe client for multi-agent events.
 *
 * @example
 * const unsub = multiAgentEvents.onExecutionUpdate((payload) => {
 *   console.log("Execution updated:", payload.execution);
 * });
 */
export const multiAgentEventClient = createEventClient(multiAgentEvents);
