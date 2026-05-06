/**
 * Agent Executor
 * Executes individual agents using the local agent stream handler
 */

import { IpcMainInvokeEvent } from "electron";
import log from "electron-log";
import { db } from "@/db";
import { agentExecutions, agentMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeSend } from "@/ipc/utils/safe_sender";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { handleLocalAgentStream } from "../local_agent/local_agent_handler";
import { TOOL_DEFINITIONS } from "../local_agent/tool_definitions";
import type { ChatStreamParams } from "@/ipc/types";
import type { AgentProfile } from "@/ipc/types/multi_agent";
import crypto from "node:crypto";

const logger = log.scope("agent_executor");

/**
 * Execute an agent with its specific configuration
 */
export async function executeAgent(
  event: IpcMainInvokeEvent,
  executionId: number,
  abortController: AbortController,
): Promise<void> {
  logger.info("🚀 Starting agent execution", { executionId });

  // Get execution with profile
  logger.info("📥 Fetching execution data from database", { executionId });
  const execution = await db.query.agentExecutions.findFirst({
    where: eq(agentExecutions.id, executionId),
    with: {
      agentProfile: true,
      chat: {
        with: {
          app: true,
        },
      },
    },
  });

  if (!execution) {
    logger.error("❌ Execution not found in database", { executionId });
    throw new DyadError(
      `Execution not found: ${executionId}`,
      DyadErrorKind.NotFound,
    );
  }

  const profile = execution.agentProfile as AgentProfile;
  const chat = execution.chat;

  logger.info("✅ Execution data loaded", {
    executionId,
    agentName: profile.name,
    agentRole: profile.role,
    task: execution.task,
    chatId: execution.chatId,
    hasChatData: !!chat,
    hasAppData: !!chat?.app,
  });

  if (!chat) {
    logger.error("❌ Chat not found for execution", {
      executionId,
      chatId: execution.chatId,
    });
    throw new DyadError(
      `Chat not found for execution: ${executionId}. Chat ID ${execution.chatId} does not exist in the database.`,
      DyadErrorKind.NotFound,
    );
  }

  if (!chat.app) {
    logger.error("❌ Chat has no associated app", {
      executionId,
      chatId: execution.chatId,
    });
    throw new DyadError(
      `Chat ${execution.chatId} has no associated app. Agents require a chat with an app to execute tasks.`,
      DyadErrorKind.Validation,
    );
  }

  try {
    // Update status to running
    logger.info("⏳ Updating execution status to 'running'", { executionId });
    await db
      .update(agentExecutions)
      .set({
        status: "running",
        startedAt: new Date(),
      })
      .where(eq(agentExecutions.id, executionId));

    // Notify renderer
    logger.info("📡 Sending execution update to renderer", {
      executionId,
      status: "running",
    });
    safeSend(event.sender, "multi-agent:execution-update", {
      chatId: execution.chatId,
      execution: {
        ...execution,
        status: "running",
        startedAt: new Date(),
      },
    });

    // Create a placeholder message for the agent's response
    logger.info("💬 Creating placeholder message", { executionId });
    const [placeholderMessage] = await db
      .insert(agentMessages)
      .values({
        executionId,
        role: "assistant",
        content: "",
      })
      .returning();

    logger.info("✅ Placeholder message created", {
      executionId,
      messageId: placeholderMessage.id,
    });

    // Build agent-specific system prompt
    logger.info("📝 Building agent system prompt", {
      executionId,
      agentName: profile.name,
    });
    const systemPrompt = buildAgentSystemPrompt(profile, execution.task);
    logger.info("✅ System prompt built", {
      executionId,
      promptLength: systemPrompt.length,
    });

    // Filter tools based on agent's allowedTools
    logger.info("🔧 Filtering tools for agent", {
      executionId,
      agentName: profile.name,
      hasAllowedTools: !!profile.allowedTools,
      allowedToolsCount: profile.allowedTools?.length || 0,
    });

    const allowedToolNames = new Set(profile.allowedTools || []);
    const filteredTools =
      profile.allowedTools && profile.allowedTools.length > 0
        ? TOOL_DEFINITIONS.filter((tool) => allowedToolNames.has(tool.name))
        : TOOL_DEFINITIONS;

    logger.info("✅ Tools filtered", {
      executionId,
      agentName: profile.name,
      totalTools: TOOL_DEFINITIONS.length,
      allowedTools: filteredTools.length,
      toolNames: filteredTools.map((t) => t.name),
    });

    // Create ChatStreamParams for the agent
    logger.info("📦 Creating chat stream params", { executionId });
    const agentStreamParams: ChatStreamParams = {
      chatId: chat.id,
      prompt: execution.task,
      // Don't include redo or attachments for agent executions
    };

    // Generate a unique request ID for this agent execution
    const dyadRequestId = crypto.randomUUID();
    logger.info("🆔 Generated request ID", { executionId, dyadRequestId });

    // Store metadata about the execution
    logger.info("💾 Storing execution metadata", { executionId });
    await db
      .update(agentExecutions)
      .set({
        metadata: {
          dyadRequestId,
          allowedTools: filteredTools.map((t) => t.name),
          systemPrompt,
        },
      })
      .where(eq(agentExecutions.id, executionId));

    logger.info("✅ Metadata stored", { executionId });

    // Log model configuration before execution
    logger.info("🔧 Reading settings for model configuration", {
      executionId,
    });
    const { readSettings } = await import("@/main/settings");
    const currentSettings = readSettings();
    logger.info("📊 Model configuration", {
      executionId,
      selectedModel: currentSettings.selectedModel,
      provider: currentSettings.selectedModel.provider,
      modelName: currentSettings.selectedModel.name,
      hasProviderSettings: !!currentSettings.providerSettings,
      providerKeys: Object.keys(currentSettings.providerSettings || {}),
      hasOpenRouterKey: !!currentSettings.providerSettings?.openrouter?.apiKey,
    });

    // Execute the agent using the local agent stream handler
    logger.info("🎯 Starting local agent stream handler", {
      executionId,
      agentName: profile.name,
      dyadRequestId,
      toolCount: filteredTools.length,
      chatId: chat.id,
      hasApp: !!chat.app,
      appId: chat.app?.id,
    });

    logger.info("📋 Chat stream params", {
      executionId,
      params: agentStreamParams,
    });

    logger.info("📋 Handler options", {
      executionId,
      placeholderMessageId: placeholderMessage.id,
      systemPromptLength: systemPrompt.length,
      dyadRequestId,
      readOnly: false,
      planModeOnly: false,
    });

    const success = await handleLocalAgentStream(
      event,
      agentStreamParams,
      abortController,
      {
        placeholderMessageId: placeholderMessage.id,
        systemPrompt,
        dyadRequestId,
        readOnly: false,
        planModeOnly: false,
      },
    );

    logger.info("🏁 Local agent stream handler completed", {
      executionId,
      success,
    });

    if (success) {
      // Get the final message content
      logger.info("📥 Fetching final message content", {
        executionId,
        messageId: placeholderMessage.id,
      });

      const finalMessage = await db.query.agentMessages.findFirst({
        where: eq(agentMessages.id, placeholderMessage.id),
      });

      logger.info("✅ Final message retrieved", {
        executionId,
        contentLength: finalMessage?.content?.length || 0,
      });

      // Update execution as completed
      logger.info("✅ Updating execution status to 'completed'", {
        executionId,
      });

      await db
        .update(agentExecutions)
        .set({
          status: "completed",
          result: finalMessage?.content || "Execution completed",
          completedAt: new Date(),
        })
        .where(eq(agentExecutions.id, executionId));

      // Notify renderer
      logger.info("📡 Sending completion update to renderer", {
        executionId,
        status: "completed",
      });

      safeSend(event.sender, "multi-agent:execution-update", {
        chatId: execution.chatId,
        execution: {
          ...execution,
          status: "completed",
          result: finalMessage?.content || "Execution completed",
          completedAt: new Date(),
        },
      });

      logger.info("🎉 Agent execution completed successfully", {
        executionId,
        agentName: profile.name,
        resultLength: finalMessage?.content?.length || 0,
      });
    } else {
      logger.error("❌ Agent execution returned false", { executionId });
      throw new Error("Agent execution returned false");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error("💥 Agent execution failed", {
      executionId,
      agentName: profile.name,
      error: errorMessage,
      stack: errorStack,
    });

    // Update execution as failed
    logger.info("⚠️ Updating execution status to 'failed'", { executionId });

    await db
      .update(agentExecutions)
      .set({
        status: "failed",
        error: errorMessage,
        completedAt: new Date(),
      })
      .where(eq(agentExecutions.id, executionId));

    // Notify renderer
    logger.info("📡 Sending failure update to renderer", {
      executionId,
      status: "failed",
    });

    safeSend(event.sender, "multi-agent:execution-update", {
      chatId: execution.chatId,
      execution: {
        ...execution,
        status: "failed",
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Build agent-specific system prompt
 */
function buildAgentSystemPrompt(profile: AgentProfile, task: string): string {
  return `${profile.systemPrompt}

## Current Task

${task}

## Agent Information

- **Agent Name**: ${profile.displayName}
- **Role**: ${profile.role}
- **Available Tools**: ${profile.allowedTools?.join(", ") || "All tools"}

Focus on completing the assigned task using your specialized capabilities.`;
}

/**
 * Execute multiple agents in parallel
 */
export async function executeAgentsInParallel(
  event: IpcMainInvokeEvent,
  executionIds: number[],
  abortControllers: Map<number, AbortController>,
): Promise<void> {
  logger.info("🔀 Starting parallel agent execution", {
    executionCount: executionIds.length,
    executionIds,
  });

  const executions = executionIds.map((executionId, index) => {
    logger.info(
      `🚀 Launching parallel agent ${index + 1}/${executionIds.length}`,
      {
        executionId,
      },
    );

    const abortController =
      abortControllers.get(executionId) || new AbortController();
    abortControllers.set(executionId, abortController);

    return executeAgent(event, executionId, abortController).catch((error) => {
      logger.error("💥 Parallel agent execution failed", {
        executionId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - let other agents continue
      return null;
    });
  });

  await Promise.all(executions);

  logger.info("✅ Parallel agent execution completed", {
    executionCount: executionIds.length,
  });
}

/**
 * Execute multiple agents sequentially
 */
export async function executeAgentsSequentially(
  event: IpcMainInvokeEvent,
  executionIds: number[],
  abortControllers: Map<number, AbortController>,
): Promise<void> {
  logger.info("➡️ Starting sequential agent execution", {
    executionCount: executionIds.length,
    executionIds,
  });

  for (let i = 0; i < executionIds.length; i++) {
    const executionId = executionIds[i];
    logger.info(`🚀 Executing agent ${i + 1}/${executionIds.length}`, {
      executionId,
    });

    const abortController =
      abortControllers.get(executionId) || new AbortController();
    abortControllers.set(executionId, abortController);

    try {
      await executeAgent(event, executionId, abortController);
      logger.info(`✅ Agent ${i + 1}/${executionIds.length} completed`, {
        executionId,
      });
    } catch (error) {
      logger.error(
        `💥 Sequential agent ${i + 1}/${executionIds.length} failed`,
        {
          executionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Stop on first failure in sequential mode
      throw error;
    }
  }

  logger.info("✅ Sequential agent execution completed", {
    executionCount: executionIds.length,
  });
}
