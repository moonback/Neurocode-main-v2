/**
 * Multi-Agent Orchestrator
 *
 * Decomposes user requests into sub-tasks, assigns them to specialized agents,
 * manages execution flow (sequential/parallel/pipeline), and aggregates results.
 */

import crypto from "node:crypto";
import log from "electron-log";
import { AgentMessageBus } from "./message_bus";
import { getAgentById, findBestAgent, getAllAgents } from "./registry";
import type {
  AgentDefinition,
  AgentCapability,
  WorkflowExecution,
  WorkflowTask,
  WorkflowStrategy,
  AgentExecutionStatus,
} from "./types";

const logger = log.scope("multi_agent_orchestrator");

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface TaskDecomposition {
  readonly description: string;
  readonly requiredCapabilities: readonly AgentCapability[];
  readonly dependsOn: readonly number[];
  readonly preferredAgentId?: string;
}

export interface OrchestratorCallbacks {
  onWorkflowUpdate: (workflow: WorkflowExecution) => void;
  onTaskStart: (task: WorkflowTask, agent: AgentDefinition) => void;
  onTaskComplete: (task: WorkflowTask) => void;
  onTaskFail: (task: WorkflowTask, error: string) => void;
  executeAgentTask: (
    agent: AgentDefinition,
    taskDescription: string,
    context: WorkflowContext,
  ) => Promise<string>;
}

export interface WorkflowContext {
  readonly chatId: number;
  readonly appId: number;
  readonly appPath: string;
  readonly previousResults: Map<string, string>;
  readonly messageBus: AgentMessageBus;
}

// ============================================================================
// Active Workflows
// ============================================================================

const activeWorkflows = new Map<string, WorkflowExecution>();

export function getActiveWorkflow(
  workflowId: string,
): WorkflowExecution | undefined {
  return activeWorkflows.get(workflowId);
}

export function getWorkflowsForChat(chatId: number): WorkflowExecution[] {
  return [...activeWorkflows.values()].filter((w) => w.chatId === chatId);
}

// ============================================================================
// Workflow Creation
// ============================================================================

/**
 * Create a new workflow from a list of decomposed tasks.
 */
export function createWorkflow(
  chatId: number,
  appId: number,
  userRequest: string,
  tasks: readonly TaskDecomposition[],
  strategy: WorkflowStrategy = "sequential",
): WorkflowExecution {
  const workflowId = crypto.randomUUID();

  const workflowTasks: WorkflowTask[] = tasks.map((task, index) => {
    // Find the best agent for this task
    const preferredAgent = task.preferredAgentId
      ? getAgentById(task.preferredAgentId)
      : undefined;
    const assignedAgent =
      preferredAgent ?? findBestAgent(task.requiredCapabilities);

    if (!assignedAgent) {
      logger.warn(
        `No agent found for capabilities: ${task.requiredCapabilities.join(", ")}`,
      );
    }

    return {
      id: `task:${workflowId}:${index}`,
      description: task.description,
      assignedAgentId: assignedAgent?.id ?? "agent:code",
      status: "pending" as AgentExecutionStatus,
      dependsOn: task.dependsOn.map((dep) => `task:${workflowId}:${dep}`),
      order: index,
    };
  });

  const workflow: WorkflowExecution = {
    id: workflowId,
    chatId,
    appId,
    userRequest,
    strategy,
    tasks: workflowTasks,
    status: "pending",
    startedAt: Date.now(),
  };

  activeWorkflows.set(workflowId, workflow);
  logger.info(
    `Created workflow ${workflowId} with ${workflowTasks.length} tasks (strategy: ${strategy})`,
  );

  return workflow;
}

// ============================================================================
// Workflow Execution
// ============================================================================

/**
 * Execute a workflow according to its strategy.
 */
export async function executeWorkflow(
  workflowId: string,
  context: Omit<WorkflowContext, "previousResults" | "messageBus">,
  callbacks: OrchestratorCallbacks,
  abortSignal?: AbortSignal,
): Promise<WorkflowExecution> {
  const workflow = activeWorkflows.get(workflowId);
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  workflow.status = "running";
  callbacks.onWorkflowUpdate(workflow);

  const messageBus = new AgentMessageBus(workflowId);
  const previousResults = new Map<string, string>();
  const fullContext: WorkflowContext = {
    ...context,
    previousResults,
    messageBus,
  };

  try {
    switch (workflow.strategy) {
      case "sequential":
        await executeSequential(workflow, fullContext, callbacks, abortSignal);
        break;
      case "parallel":
        await executeParallel(workflow, fullContext, callbacks, abortSignal);
        break;
      case "pipeline":
        await executePipeline(workflow, fullContext, callbacks, abortSignal);
        break;
      case "adaptive":
        await executeAdaptive(workflow, fullContext, callbacks, abortSignal);
        break;
    }

    // Aggregate results
    const completedResults = workflow.tasks
      .filter((t) => t.status === "completed" && t.result)
      .map((t) => `### ${t.description}\n${t.result}`)
      .join("\n\n---\n\n");

    workflow.aggregatedResult = completedResults;
    workflow.status = workflow.tasks.every((t) => t.status === "completed")
      ? "completed"
      : "failed";
    workflow.completedAt = Date.now();
  } catch (err) {
    workflow.status = "failed";
    workflow.completedAt = Date.now();
    logger.error(`Workflow ${workflowId} failed:`, err);
  } finally {
    messageBus.destroy();
    callbacks.onWorkflowUpdate(workflow);
  }

  return workflow;
}

// ============================================================================
// Execution Strategies
// ============================================================================

async function executeSequential(
  workflow: WorkflowExecution,
  context: WorkflowContext,
  callbacks: OrchestratorCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  const sorted = [...workflow.tasks].sort((a, b) => a.order - b.order);

  for (const task of sorted) {
    if (abortSignal?.aborted) {
      task.status = "cancelled";
      continue;
    }
    await executeTask(task, workflow, context, callbacks);
  }
}

async function executeParallel(
  workflow: WorkflowExecution,
  context: WorkflowContext,
  callbacks: OrchestratorCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  // Group tasks by dependency level
  const levels = groupByDependencyLevel(workflow.tasks);

  for (const level of levels) {
    if (abortSignal?.aborted) break;

    // Execute all tasks in this level concurrently
    await Promise.allSettled(
      level.map((task) => executeTask(task, workflow, context, callbacks)),
    );
  }
}

async function executePipeline(
  workflow: WorkflowExecution,
  context: WorkflowContext,
  callbacks: OrchestratorCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  // Pipeline: each task feeds its output to the next
  const sorted = [...workflow.tasks].sort((a, b) => a.order - b.order);

  for (const task of sorted) {
    if (abortSignal?.aborted) {
      task.status = "cancelled";
      continue;
    }
    await executeTask(task, workflow, context, callbacks);
    // Pipeline stops on first failure
    if (task.status === "failed") break;
  }
}

async function executeAdaptive(
  workflow: WorkflowExecution,
  context: WorkflowContext,
  callbacks: OrchestratorCallbacks,
  abortSignal?: AbortSignal,
): Promise<void> {
  // Adaptive: independent tasks in parallel, dependent tasks sequential
  const levels = groupByDependencyLevel(workflow.tasks);

  for (const level of levels) {
    if (abortSignal?.aborted) break;

    if (level.length === 1) {
      await executeTask(level[0], workflow, context, callbacks);
    } else {
      await Promise.allSettled(
        level.map((task) => executeTask(task, workflow, context, callbacks)),
      );
    }
  }
}

// ============================================================================
// Task Execution
// ============================================================================

async function executeTask(
  task: WorkflowTask,
  workflow: WorkflowExecution,
  context: WorkflowContext,
  callbacks: OrchestratorCallbacks,
): Promise<void> {
  // Check dependencies are met
  for (const depId of task.dependsOn) {
    const dep = workflow.tasks.find((t) => t.id === depId);
    if (dep && dep.status !== "completed") {
      task.status = "failed";
      task.error = `Dependency not met: ${depId}`;
      callbacks.onTaskFail(task, task.error);
      return;
    }
  }

  const agent = getAgentById(task.assignedAgentId);
  if (!agent) {
    task.status = "failed";
    task.error = `Agent not found: ${task.assignedAgentId}`;
    callbacks.onTaskFail(task, task.error);
    return;
  }

  task.status = "running";
  callbacks.onTaskStart(task, agent);
  callbacks.onWorkflowUpdate(workflow);

  try {
    const result = await callbacks.executeAgentTask(
      agent,
      task.description,
      context,
    );
    task.status = "completed";
    task.result = result;
    context.previousResults.set(task.id, result);
    callbacks.onTaskComplete(task);
  } catch (err) {
    task.status = "failed";
    task.error = err instanceof Error ? err.message : String(err);
    callbacks.onTaskFail(task, task.error);
  }

  callbacks.onWorkflowUpdate(workflow);
}

// ============================================================================
// Helpers
// ============================================================================

function groupByDependencyLevel(tasks: WorkflowTask[]): WorkflowTask[][] {
  const levels: WorkflowTask[][] = [];
  const placed = new Set<string>();

  let remaining = [...tasks];
  while (remaining.length > 0) {
    const currentLevel = remaining.filter((t) =>
      t.dependsOn.every((dep) => placed.has(dep)),
    );

    if (currentLevel.length === 0) {
      // Circular dependency or unresolvable — dump remaining into last level
      levels.push(remaining);
      break;
    }

    levels.push(currentLevel);
    for (const t of currentLevel) placed.add(t.id);
    remaining = remaining.filter((t) => !placed.has(t.id));
  }

  return levels;
}

/**
 * Automatically decompose a user request into tasks using heuristics.
 * For more sophisticated decomposition, the LLM can be used.
 */
export function autoDecompose(userRequest: string): TaskDecomposition[] {
  const lower = userRequest.toLowerCase();
  const tasks: TaskDecomposition[] = [];

  // Detect architecture/planning needs
  if (
    lower.includes("architect") ||
    lower.includes("design") ||
    lower.includes("plan") ||
    lower.includes("structure")
  ) {
    tasks.push({
      description: `Analyze architecture and create implementation plan: ${userRequest}`,
      requiredCapabilities: ["architecture", "planning"],
      dependsOn: [],
    });
  }

  // Main implementation task
  tasks.push({
    description: `Implement: ${userRequest}`,
    requiredCapabilities: ["file-read", "file-write", "code-search"],
    dependsOn: tasks.length > 0 ? [0] : [],
  });

  // Detect review needs
  if (
    lower.includes("review") ||
    lower.includes("quality") ||
    lower.includes("security") ||
    lower.includes("check")
  ) {
    tasks.push({
      description: `Review code changes for: ${userRequest}`,
      requiredCapabilities: ["code-review", "security-review"],
      dependsOn: [tasks.length - 1],
    });
  }

  // Detect test needs
  if (
    lower.includes("test") ||
    lower.includes("spec") ||
    lower.includes("coverage")
  ) {
    tasks.push({
      description: `Write tests for: ${userRequest}`,
      requiredCapabilities: ["test-generation"],
      dependsOn: [tasks.length - 1],
    });
  }

  // Detect debug needs
  if (
    lower.includes("bug") ||
    lower.includes("fix") ||
    lower.includes("debug") ||
    lower.includes("error")
  ) {
    // For debugging, the debug agent should be the primary one
    if (tasks.length === 1) {
      tasks[0] = {
        ...tasks[0],
        requiredCapabilities: ["debugging", "file-read", "file-write"],
      };
    }
  }

  return tasks;
}

/**
 * Cancel a running workflow.
 */
export function cancelWorkflow(workflowId: string): boolean {
  const workflow = activeWorkflows.get(workflowId);
  if (!workflow || workflow.status !== "running") return false;

  for (const task of workflow.tasks) {
    if (task.status === "pending" || task.status === "running") {
      task.status = "cancelled";
    }
  }
  workflow.status = "cancelled";
  workflow.completedAt = Date.now();
  return true;
}

/**
 * Clean up a completed workflow from the active set.
 */
export function cleanupWorkflow(workflowId: string): void {
  activeWorkflows.delete(workflowId);
}
