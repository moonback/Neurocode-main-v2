/**
 * Core types for the multi-agent workflow system.
 *
 * Defines agent roles, capabilities, messages, and orchestration types
 * used throughout the multi-agent infrastructure.
 */

// ============================================================================
// Agent Role & Capability Types
// ============================================================================

/**
 * Built-in specialized agent roles.
 * Each role has a tailored system prompt and tool subset.
 */
export const BUILT_IN_AGENT_ROLES = [
  "code",
  "review",
  "test",
  "debug",
  "architect",
] as const;

export type BuiltInAgentRole = (typeof BUILT_IN_AGENT_ROLES)[number];

/**
 * Full set of agent roles including custom agents.
 */
export type AgentRole = BuiltInAgentRole | `custom:${string}`;

/**
 * Capability tags that describe what an agent can do.
 * Used by the orchestrator for agent selection.
 */
export type AgentCapability =
  | "file-read"
  | "file-write"
  | "code-search"
  | "web-search"
  | "test-generation"
  | "code-review"
  | "architecture"
  | "debugging"
  | "planning"
  | "documentation"
  | "refactoring"
  | "security-review"
  | "performance-optimization";

// ============================================================================
// Agent Definition
// ============================================================================

/**
 * Defines a specialized agent with its role, prompt, capabilities, and tool access.
 */
export interface AgentDefinition {
  /** Unique identifier for this agent */
  readonly id: string;
  /** Human-readable display name */
  readonly name: string;
  /** Short description of what this agent does */
  readonly description: string;
  /** Agent role (built-in or custom) */
  readonly role: AgentRole;
  /** System prompt that defines the agent's behavior */
  readonly systemPrompt: string;
  /** Capabilities this agent provides */
  readonly capabilities: readonly AgentCapability[];
  /**
   * Tool names this agent is allowed to use.
   * If undefined, the agent inherits the default tool set for its mode.
   */
  readonly allowedTools?: readonly string[];
  /**
   * Tool names explicitly excluded for this agent.
   * Applied after allowedTools filtering.
   */
  readonly excludedTools?: readonly string[];
  /** Icon identifier for UI display (lucide icon name) */
  readonly icon: string;
  /** Color for UI display (CSS color value or tailwind class) */
  readonly color: string;
  /** Whether this is a user-created custom agent */
  readonly isCustom: boolean;
  /** Maximum number of tool call steps for this agent */
  readonly maxToolCallSteps?: number;
}

// ============================================================================
// Inter-Agent Communication
// ============================================================================

/**
 * Message types for inter-agent communication.
 */
export type AgentMessageType =
  | "task-assignment"
  | "task-result"
  | "info-request"
  | "info-response"
  | "status-update"
  | "handoff"
  | "broadcast";

/**
 * A message exchanged between agents via the message bus.
 */
export interface AgentMessage {
  /** Unique message ID */
  readonly id: string;
  /** Timestamp of when the message was created */
  readonly timestamp: number;
  /** Type of message */
  readonly type: AgentMessageType;
  /** ID of the sending agent */
  readonly fromAgentId: string;
  /** ID of the receiving agent (null for broadcasts) */
  readonly toAgentId: string | null;
  /** The message payload */
  readonly payload: AgentMessagePayload;
  /** Optional correlation ID to link related messages */
  readonly correlationId?: string;
}

/**
 * Payload variants for agent messages.
 */
export type AgentMessagePayload =
  | TaskAssignmentPayload
  | TaskResultPayload
  | InfoRequestPayload
  | InfoResponsePayload
  | StatusUpdatePayload
  | HandoffPayload
  | BroadcastPayload;

export interface TaskAssignmentPayload {
  readonly kind: "task-assignment";
  readonly taskDescription: string;
  readonly context: Record<string, unknown>;
  readonly priority: "low" | "normal" | "high" | "critical";
}

export interface TaskResultPayload {
  readonly kind: "task-result";
  readonly success: boolean;
  readonly result: string;
  readonly artifacts?: readonly string[];
  readonly warnings?: readonly string[];
}

export interface InfoRequestPayload {
  readonly kind: "info-request";
  readonly question: string;
  readonly context?: Record<string, unknown>;
}

export interface InfoResponsePayload {
  readonly kind: "info-response";
  readonly answer: string;
  readonly confidence: number;
}

export interface StatusUpdatePayload {
  readonly kind: "status-update";
  readonly status: AgentExecutionStatus;
  readonly progress?: number;
  readonly detail?: string;
}

export interface HandoffPayload {
  readonly kind: "handoff";
  readonly reason: string;
  readonly suggestedAgentRole: AgentRole;
  readonly context: Record<string, unknown>;
}

export interface BroadcastPayload {
  readonly kind: "broadcast";
  readonly topic: string;
  readonly data: Record<string, unknown>;
}

// ============================================================================
// Orchestration Types
// ============================================================================

/**
 * Execution status of an agent within a workflow.
 */
export type AgentExecutionStatus =
  | "pending"
  | "running"
  | "waiting-for-input"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * A sub-task within a multi-agent workflow.
 */
export interface WorkflowTask {
  /** Unique task ID */
  readonly id: string;
  /** Human-readable description */
  readonly description: string;
  /** ID of the agent assigned to this task */
  readonly assignedAgentId: string;
  /** Current execution status */
  status: AgentExecutionStatus;
  /** Task result (populated on completion) */
  result?: string;
  /** Error message if failed */
  error?: string;
  /** IDs of tasks that must complete before this one starts */
  readonly dependsOn: readonly string[];
  /** Execution order (lower = earlier) */
  readonly order: number;
}

/**
 * Execution strategy for a workflow.
 */
export type WorkflowStrategy =
  | "sequential"
  | "parallel"
  | "pipeline"
  | "adaptive";

/**
 * A complete multi-agent workflow execution.
 */
export interface WorkflowExecution {
  /** Unique workflow ID */
  readonly id: string;
  /** Associated chat ID */
  readonly chatId: number;
  /** Associated app ID */
  readonly appId: number;
  /** The original user request */
  readonly userRequest: string;
  /** Execution strategy */
  readonly strategy: WorkflowStrategy;
  /** Tasks in this workflow */
  tasks: WorkflowTask[];
  /** Overall status */
  status: AgentExecutionStatus;
  /** When the workflow started */
  readonly startedAt: number;
  /** When the workflow completed (if done) */
  completedAt?: number;
  /** Aggregated result from all agents */
  aggregatedResult?: string;
}

// ============================================================================
// Custom Agent Persistence
// ============================================================================

/**
 * Serializable format for custom agent definitions stored in settings.
 */
export interface CustomAgentConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly systemPrompt: string;
  readonly capabilities: readonly AgentCapability[];
  readonly allowedTools?: readonly string[];
  readonly excludedTools?: readonly string[];
  readonly icon: string;
  readonly color: string;
  readonly maxToolCallSteps?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}
