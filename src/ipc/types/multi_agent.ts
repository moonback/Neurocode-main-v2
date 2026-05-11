import { z } from "zod";
import {
  defineContract,
  defineEvent,
  createClient,
  createEventClient,
} from "../contracts/core";

export const AgentCapabilitySchema = z.enum([
  "frontend",
  "backend",
  "testing",
  "documentation",
  "debugging",
  "architecture",
  "security",
  "performance",
  "devops",
]);

export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;

export const AgentDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  systemPrompt: z.string(),
  capabilities: z.array(AgentCapabilitySchema),
  toolConfiguration: z.object({
    allowedTools: z.array(z.string()),
    readOnly: z.boolean().default(false),
  }),
  isBuiltIn: z.boolean().default(false),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

export const CreateAgentSchema = AgentDefinitionSchema.omit({
  id: true,
  isBuiltIn: true,
});

export type CreateAgent = z.infer<typeof CreateAgentSchema>;

export const UpdateAgentSchema = CreateAgentSchema.partial();

export type UpdateAgent = z.infer<typeof UpdateAgentSchema>;

export const TaskDelegationSchema = z.object({
  taskId: z.string(),
  agentId: z.string(),
  input: z.string(),
  context: z.any().optional(),
});

export type TaskDelegation = z.infer<typeof TaskDelegationSchema>;

export const AgentTaskResultSchema = z.object({
  taskId: z.string(),
  agentId: z.string(),
  status: z.enum(["completed", "failed"]),
  output: z.string().optional(),
  error: z.string().optional(),
  tokenUsage: z.number().optional(),
});

export type AgentTaskResult = z.infer<typeof AgentTaskResultSchema>;

// =============================================================================
// Multi-Agent Contracts
// =============================================================================

export const multiAgentContracts = {
  createCustomAgent: defineContract({
    channel: "multi-agent:create-custom-agent",
    input: CreateAgentSchema,
    output: AgentDefinitionSchema,
  }),
  updateCustomAgent: defineContract({
    channel: "multi-agent:update-custom-agent",
    input: z.object({ id: z.string(), updates: UpdateAgentSchema }),
    output: AgentDefinitionSchema,
  }),
  deleteCustomAgent: defineContract({
    channel: "multi-agent:delete-custom-agent",
    input: z.object({ id: z.string() }),
    output: z.void(),
  }),
  getAgents: defineContract({
    channel: "multi-agent:get-agents",
    input: z.void(),
    output: z.array(AgentDefinitionSchema),
  }),
  delegateTask: defineContract({
    channel: "multi-agent:delegate-task",
    input: TaskDelegationSchema,
    output: AgentTaskResultSchema,
  }),
} as const;

// =============================================================================
// Multi-Agent Events
// =============================================================================

export const multiAgentEvents = {
  agentTaskStarted: defineEvent({
    channel: "multi-agent:task-started",
    payload: z.object({ taskId: z.string(), agentId: z.string() }),
  }),
  agentTaskCompleted: defineEvent({
    channel: "multi-agent:task-completed",
    payload: AgentTaskResultSchema,
  }),
  agentTaskFailed: defineEvent({
    channel: "multi-agent:task-failed",
    payload: AgentTaskResultSchema,
  }),
  agentCommunication: defineEvent({
    channel: "multi-agent:communication",
    payload: z.object({
      senderId: z.string(),
      receiverId: z.string(),
      content: z.string(),
    }),
  }),
} as const;

// =============================================================================
// Multi-Agent Clients
// =============================================================================

export const multiAgentClient = createClient(multiAgentContracts);
export const multiAgentEventClient = createEventClient(multiAgentEvents);
