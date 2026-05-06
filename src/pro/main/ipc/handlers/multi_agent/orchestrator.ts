/**
 * Multi-Agent Orchestrator
 * Coordinates multiple specialized agents working in parallel or sequentially
 */

import { IpcMainInvokeEvent } from "electron";
import log from "electron-log";
import { db } from "@/db";
import {
  agentProfiles,
  agentExecutions,
  agentCommunications,
  chats,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import {
  executeAgentsInParallel,
  executeAgentsSequentially,
} from "./agent_executor";
import {
  selectAgentsWithLLM,
  validateAgentSelection,
  type LLMAgentSelectionResult,
} from "./llm_agent_selector";
import type {
  AgentProfile,
  AgentExecution,
  MultiAgentOrchestrationParams,
} from "@/ipc/types/multi_agent";

const logger = log.scope("multi_agent_orchestrator");

/**
 * Agent selection strategy based on task analysis
 */
interface AgentSelectionResult {
  primaryAgent: AgentProfile;
  supportingAgents: AgentProfile[];
  reasoning: string;
  parallelExecution?: boolean;
  method?: "llm" | "fallback" | "manual";
  confidence?: number;
}

/**
 * Execution context for a single agent
 */
interface AgentExecutionContext {
  execution: AgentExecution;
  profile: AgentProfile;
  abortController: AbortController;
}

/**
 * Multi-agent orchestrator class
 */
export class MultiAgentOrchestrator {
  private activeExecutions = new Map<number, AgentExecutionContext>();
  private abortControllers = new Map<number, AbortController>();

  /**
   * Orchestrate multiple agents for a given task
   */
  async orchestrate(
    event: IpcMainInvokeEvent,
    params: MultiAgentOrchestrationParams,
  ): Promise<{ executionIds: number[] }> {
    logger.info("Starting multi-agent orchestration", {
      chatId: params.chatId,
      selectedAgentId: params.selectedAgentId,
      parallelExecution: params.parallelExecution,
    });

    // Verify chat exists
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, params.chatId),
    });

    if (!chat) {
      throw new DyadError(
        `Chat not found: ${params.chatId}`,
        DyadErrorKind.NotFound,
      );
    }

    // Get agent selection
    const selection = params.selectedAgentId
      ? await this.getManualSelection(params.selectedAgentId)
      : params.useLLMSelection !== false
        ? await this.analyzeAndSelectAgentsWithLLM(params.prompt)
        : await this.analyzeAndSelectAgents(params.prompt);

    logger.info("Agent selection complete", {
      primaryAgent: selection.primaryAgent.name,
      supportingAgents: selection.supportingAgents.map((a) => a.name),
      reasoning: selection.reasoning,
      method: selection.method || "manual",
      confidence: selection.confidence,
      usedLLM: params.useLLMSelection !== false && !params.selectedAgentId,
    });

    // Validate selection
    if (selection.parallelExecution !== undefined) {
      const validation = validateAgentSelection(
        selection as LLMAgentSelectionResult,
        params.prompt,
      );
      if (!validation.valid) {
        logger.warn("Agent selection validation issues", {
          issues: validation.issues,
        });
      }
    }

    // Use parallelExecution from selection if not explicitly set
    const shouldExecuteInParallel =
      params.parallelExecution ?? selection.parallelExecution;

    // Create executions
    const executionIds: number[] = [];

    // Create primary agent execution
    const primaryExecution = await this.createExecution(
      params.chatId,
      selection.primaryAgent.id,
      params.prompt,
      null,
      {
        reasoning: selection.reasoning,
        method: selection.method || "manual",
        confidence: selection.confidence
          ? Math.round(selection.confidence * 100)
          : undefined,
      },
    );
    executionIds.push(primaryExecution.id);

    // Create supporting agent executions
    if (params.parallelExecution && selection.supportingAgents.length > 0) {
      for (const agent of selection.supportingAgents) {
        const execution = await this.createExecution(
          params.chatId,
          agent.id,
          `Support task: ${params.prompt}`,
          primaryExecution.id,
          {
            reasoning: `Supporting ${selection.primaryAgent.displayName} for: ${selection.reasoning}`,
            method: selection.method || "manual",
            confidence: selection.confidence
              ? Math.round(selection.confidence * 100)
              : undefined,
          },
        );
        executionIds.push(execution.id);
      }
    }

    // Start executions
    if (shouldExecuteInParallel) {
      // Parallel execution - don't await, let them run in background
      executeAgentsInParallel(event, executionIds, this.abortControllers).catch(
        (error) => {
          logger.error("Parallel execution failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        },
      );
    } else {
      // Sequential execution - don't await, let them run in background
      executeAgentsSequentially(
        event,
        executionIds,
        this.abortControllers,
      ).catch((error) => {
        logger.error("Sequential execution failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return { executionIds };
  }

  /**
   * Get manual agent selection
   */
  private async getManualSelection(
    agentId: number,
  ): Promise<LLMAgentSelectionResult> {
    const agent = await db.query.agentProfiles.findFirst({
      where: and(
        eq(agentProfiles.id, agentId),
        eq(agentProfiles.isEnabled, true),
      ),
    });

    if (!agent) {
      throw new DyadError(
        `Agent profile not found or disabled: ${agentId}`,
        DyadErrorKind.NotFound,
      );
    }

    return {
      primaryAgent: agent as AgentProfile,
      supportingAgents: [],
      reasoning: "Manual agent selection by user",
      parallelExecution: false,
      method: "manual" as const,
    };
  }

  /**
   * Analyze task and select appropriate agents using LLM
   */
  private async analyzeAndSelectAgentsWithLLM(
    task: string,
  ): Promise<LLMAgentSelectionResult> {
    // Get all enabled agents
    const enabledAgents = await db.query.agentProfiles.findMany({
      where: eq(agentProfiles.isEnabled, true),
    });

    if (enabledAgents.length === 0) {
      throw new DyadError(
        "No enabled agent profiles found",
        DyadErrorKind.Precondition,
      );
    }

    // Use LLM-based selection
    return await selectAgentsWithLLM(task, enabledAgents as AgentProfile[]);
  }

  /**
   * @deprecated Use analyzeAndSelectAgentsWithLLM instead
   * Legacy keyword-based agent selection (kept for reference)
   */
  private async analyzeAndSelectAgents(
    task: string,
  ): Promise<AgentSelectionResult> {
    // Get all enabled agents
    const enabledAgents = await db.query.agentProfiles.findMany({
      where: eq(agentProfiles.isEnabled, true),
    });

    if (enabledAgents.length === 0) {
      throw new DyadError(
        "No enabled agent profiles found",
        DyadErrorKind.Precondition,
      );
    }

    // Simple keyword-based agent selection
    // In production, this would use LLM-based analysis
    const taskLower = task.toLowerCase();

    let primaryAgent: AgentProfile | undefined;
    const supportingAgents: AgentProfile[] = [];

    // Check for orchestrator (default for complex tasks)
    const orchestrator = enabledAgents.find((a) => a.role === "orchestrator");

    // Determine primary agent based on keywords
    if (
      taskLower.includes("test") ||
      taskLower.includes("unit test") ||
      taskLower.includes("e2e")
    ) {
      primaryAgent = enabledAgents.find((a) => a.role === "test");
    } else if (
      taskLower.includes("document") ||
      taskLower.includes("readme") ||
      taskLower.includes("comment")
    ) {
      primaryAgent = enabledAgents.find((a) => a.role === "documentation");
    } else if (
      taskLower.includes("search") ||
      taskLower.includes("find") ||
      taskLower.includes("research")
    ) {
      primaryAgent = enabledAgents.find((a) => a.role === "research");
    } else if (
      taskLower.includes("database") ||
      taskLower.includes("sql") ||
      taskLower.includes("query")
    ) {
      primaryAgent = enabledAgents.find((a) => a.role === "database");
    } else if (
      taskLower.includes("code") ||
      taskLower.includes("implement") ||
      taskLower.includes("fix") ||
      taskLower.includes("bug")
    ) {
      primaryAgent = enabledAgents.find((a) => a.role === "code");
    }

    // Default to orchestrator if no specific agent found
    if (!primaryAgent) {
      primaryAgent = orchestrator || enabledAgents[0];
    }

    // For complex tasks, add supporting agents
    if (orchestrator && primaryAgent.role !== "orchestrator") {
      // If task mentions multiple concerns, add relevant supporting agents
      if (taskLower.includes("test") && primaryAgent.role !== "test") {
        const testAgent = enabledAgents.find((a) => a.role === "test");
        if (testAgent) supportingAgents.push(testAgent as AgentProfile);
      }

      if (
        taskLower.includes("document") &&
        primaryAgent.role !== "documentation"
      ) {
        const docAgent = enabledAgents.find((a) => a.role === "documentation");
        if (docAgent) supportingAgents.push(docAgent as AgentProfile);
      }
    }

    const reasoning = `Selected ${primaryAgent.role} agent as primary based on task analysis. ${
      supportingAgents.length > 0
        ? `Supporting agents: ${supportingAgents.map((a) => a.role).join(", ")}`
        : "No supporting agents needed."
    }`;

    return {
      primaryAgent: primaryAgent as AgentProfile,
      supportingAgents,
      reasoning,
    };
  }

  /**
   * Create an agent execution record
   */
  private async createExecution(
    chatId: number,
    agentProfileId: number,
    task: string,
    parentExecutionId: number | null,
    selectionInfo?: {
      reasoning: string;
      method: "llm" | "fallback" | "manual";
      confidence?: number;
    },
  ): Promise<AgentExecution> {
    const execution = await db
      .insert(agentExecutions)
      .values({
        chatId,
        agentProfileId,
        parentExecutionId,
        task,
        status: "pending",
        selectionReasoning: selectionInfo?.reasoning || null,
        selectionMethod: selectionInfo?.method || null,
        selectionConfidence: selectionInfo?.confidence || null,
      })
      .returning()
      .then((rows) => rows[0]);

    logger.info("Created agent execution", {
      executionId: execution.id,
      agentProfileId,
      chatId,
    });

    return execution as AgentExecution;
  }

  /**
   * Cancel an agent execution
   */
  async cancelExecution(executionId: number): Promise<boolean> {
    const abortController = this.abortControllers.get(executionId);

    if (!abortController) {
      logger.warn("Execution not found or not active", { executionId });
      return false;
    }

    // Abort the execution
    abortController.abort();

    // Update database
    await db
      .update(agentExecutions)
      .set({
        status: "cancelled",
        completedAt: new Date(),
      })
      .where(eq(agentExecutions.id, executionId));

    // Remove from abort controllers
    this.abortControllers.delete(executionId);
    this.activeExecutions.delete(executionId);

    logger.info("Cancelled agent execution", { executionId });

    return true;
  }

  /**
   * Complete an agent execution
   */
  async completeExecution(
    executionId: number,
    result: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await db
      .update(agentExecutions)
      .set({
        status: "completed",
        result,
        metadata,
        completedAt: new Date(),
      })
      .where(eq(agentExecutions.id, executionId));

    this.activeExecutions.delete(executionId);

    logger.info("Completed agent execution", { executionId });
  }

  /**
   * Fail an agent execution
   */
  async failExecution(executionId: number, error: string): Promise<void> {
    await db
      .update(agentExecutions)
      .set({
        status: "failed",
        error,
        completedAt: new Date(),
      })
      .where(eq(agentExecutions.id, executionId));

    this.activeExecutions.delete(executionId);

    logger.error("Failed agent execution", { executionId, error });
  }

  /**
   * Send communication between agents
   */
  async sendCommunication(
    chatId: number,
    fromExecutionId: number,
    toExecutionId: number,
    messageType: "task_delegation" | "result_report" | "question" | "answer",
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await db.insert(agentCommunications).values({
      chatId,
      fromExecutionId,
      toExecutionId,
      messageType,
      content,
      metadata,
    });

    logger.info("Agent communication sent", {
      fromExecutionId,
      toExecutionId,
      messageType,
    });
  }
}

// Singleton instance
export const multiAgentOrchestrator = new MultiAgentOrchestrator();
