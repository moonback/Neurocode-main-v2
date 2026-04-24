/**
 * Multi-Agent Workflow System — barrel export.
 *
 * Re-exports all public APIs from the multi-agent subsystem.
 */

// Core types
export type {
  AgentRole,
  BuiltInAgentRole,
  AgentCapability,
  AgentDefinition,
  AgentMessage,
  AgentMessageType,
  AgentMessagePayload,
  AgentExecutionStatus,
  WorkflowTask,
  WorkflowStrategy,
  WorkflowExecution,
  CustomAgentConfig,
} from "./types";

export { BUILT_IN_AGENT_ROLES } from "./types";

// Agent definitions
export {
  BUILT_IN_AGENTS,
  getBuiltInAgent,
  getBuiltInAgentById,
} from "./agent_definitions";

// Registry
export {
  getAllAgents,
  getBuiltInAgentsAll,
  getCustomAgents,
  getAgentById,
  getAgentsByRole,
  getAgentsByCapabilities,
  getAgentsWithAnyCapability,
  findBestAgent,
  createCustomAgent,
  updateCustomAgent,
  deleteCustomAgent,
} from "./registry";

// Message Bus
export { AgentMessageBus } from "./message_bus";

// Orchestrator
export {
  createWorkflow,
  executeWorkflow,
  cancelWorkflow,
  cleanupWorkflow,
  getActiveWorkflow,
  getWorkflowsForChat,
  autoDecompose,
} from "./orchestrator";

export type {
  TaskDecomposition,
  OrchestratorCallbacks,
  WorkflowContext,
} from "./orchestrator";
