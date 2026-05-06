/**
 * IPC handlers for multi-agent system
 */

import { createTypedHandler } from "./base";
import { multiAgentContracts } from "@/ipc/types/multi_agent";
import { db } from "@/db";
import {
  agentProfiles,
  agentExecutions,
  agentMessages,
  agentCommunications,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { multiAgentOrchestrator } from "@/pro/main/ipc/handlers/multi_agent/orchestrator";
import { executeAgent } from "@/pro/main/ipc/handlers/multi_agent/agent_executor";
import type {
  AgentProfile,
  AgentExecution,
  AgentExecutionDetail,
  CreateAgentProfileParams,
  UpdateAgentProfileParams,
  StartAgentExecutionParams,
  MultiAgentOrchestrationParams,
} from "@/ipc/types/multi_agent";
import log from "electron-log";

const logger = log.scope("multi_agent_handlers");

export function registerMultiAgentHandlers() {
  // ============================================================================
  // Agent Profile Management
  // ============================================================================

  createTypedHandler(
    multiAgentContracts.getAgentProfiles,
    async (): Promise<AgentProfile[]> => {
      const profiles = await db.query.agentProfiles.findMany({
        orderBy: (profiles, { asc }) => [asc(profiles.displayName)],
      });

      return profiles as AgentProfile[];
    },
  );

  createTypedHandler(
    multiAgentContracts.getAgentProfile,
    async (_event, profileId: number): Promise<AgentProfile> => {
      const profile = await db.query.agentProfiles.findFirst({
        where: eq(agentProfiles.id, profileId),
      });

      if (!profile) {
        throw new DyadError(
          `Agent profile not found: ${profileId}`,
          DyadErrorKind.NotFound,
        );
      }

      return profile as AgentProfile;
    },
  );

  createTypedHandler(
    multiAgentContracts.createAgentProfile,
    async (_event, params: CreateAgentProfileParams): Promise<AgentProfile> => {
      // Check if name already exists
      const existing = await db.query.agentProfiles.findFirst({
        where: eq(agentProfiles.name, params.name),
      });

      if (existing) {
        throw new DyadError(
          `Agent profile with name "${params.name}" already exists`,
          DyadErrorKind.Conflict,
        );
      }

      const [profile] = await db
        .insert(agentProfiles)
        .values({
          name: params.name,
          displayName: params.displayName,
          description: params.description,
          role: params.role,
          systemPrompt: params.systemPrompt,
          allowedTools: params.allowedTools || null,
          config: params.config || null,
          isBuiltin: false,
          isEnabled: true,
        })
        .returning();

      logger.info("Created agent profile", {
        profileId: profile.id,
        name: profile.name,
      });

      return profile as AgentProfile;
    },
  );

  createTypedHandler(
    multiAgentContracts.updateAgentProfile,
    async (_event, params: UpdateAgentProfileParams): Promise<AgentProfile> => {
      const existing = await db.query.agentProfiles.findFirst({
        where: eq(agentProfiles.id, params.id),
      });

      if (!existing) {
        throw new DyadError(
          `Agent profile not found: ${params.id}`,
          DyadErrorKind.NotFound,
        );
      }

      // Prevent modifying builtin agents' core properties
      if (existing.isBuiltin) {
        if (
          params.displayName ||
          params.systemPrompt ||
          params.allowedTools ||
          params.config
        ) {
          throw new DyadError(
            "Cannot modify core properties of builtin agents",
            DyadErrorKind.Validation,
          );
        }
      }

      const updateData: Partial<typeof agentProfiles.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (params.displayName !== undefined)
        updateData.displayName = params.displayName;
      if (params.description !== undefined)
        updateData.description = params.description;
      if (params.systemPrompt !== undefined)
        updateData.systemPrompt = params.systemPrompt;
      if (params.allowedTools !== undefined)
        updateData.allowedTools = params.allowedTools;
      if (params.config !== undefined) updateData.config = params.config;
      if (params.isEnabled !== undefined)
        updateData.isEnabled = params.isEnabled;

      const [updated] = await db
        .update(agentProfiles)
        .set(updateData)
        .where(eq(agentProfiles.id, params.id))
        .returning();

      logger.info("Updated agent profile", { profileId: params.id });

      return updated as AgentProfile;
    },
  );

  createTypedHandler(
    multiAgentContracts.deleteAgentProfile,
    async (_event, profileId: number): Promise<void> => {
      const profile = await db.query.agentProfiles.findFirst({
        where: eq(agentProfiles.id, profileId),
      });

      if (!profile) {
        throw new DyadError(
          `Agent profile not found: ${profileId}`,
          DyadErrorKind.NotFound,
        );
      }

      if (profile.isBuiltin) {
        throw new DyadError(
          "Cannot delete builtin agent profiles",
          DyadErrorKind.Validation,
        );
      }

      await db.delete(agentProfiles).where(eq(agentProfiles.id, profileId));

      logger.info("Deleted agent profile", { profileId });
    },
  );

  // ============================================================================
  // Agent Execution Management
  // ============================================================================

  createTypedHandler(
    multiAgentContracts.getAgentExecutions,
    async (_event, chatId: number): Promise<AgentExecutionDetail[]> => {
      const executions = await db.query.agentExecutions.findMany({
        where: eq(agentExecutions.chatId, chatId),
        with: {
          agentProfile: true,
          messages: {
            orderBy: (agentMessages, { asc }) => [asc(agentMessages.createdAt)],
          },
          childExecutions: true,
        },
        orderBy: (agentExecutions, { desc }) => [
          desc(agentExecutions.createdAt),
        ],
      });

      return executions as AgentExecutionDetail[];
    },
  );

  createTypedHandler(
    multiAgentContracts.getAgentExecution,
    async (_event, executionId: number): Promise<AgentExecutionDetail> => {
      const execution = await db.query.agentExecutions.findFirst({
        where: eq(agentExecutions.id, executionId),
        with: {
          agentProfile: true,
          messages: {
            orderBy: (agentMessages, { asc }) => [asc(agentMessages.createdAt)],
          },
          childExecutions: true,
        },
      });

      if (!execution) {
        throw new DyadError(
          `Agent execution not found: ${executionId}`,
          DyadErrorKind.NotFound,
        );
      }

      return execution as AgentExecutionDetail;
    },
  );

  createTypedHandler(
    multiAgentContracts.startAgentExecution,
    async (
      _event,
      params: StartAgentExecutionParams,
    ): Promise<AgentExecution> => {
      logger.info("🎬 Starting agent execution request", {
        chatId: params.chatId,
        agentProfileId: params.agentProfileId,
        hasTask: !!params.task,
        taskLength: params.task?.length || 0,
      });

      // If no agent specified, let orchestrator decide
      if (!params.agentProfileId) {
        logger.info("🎯 No agent specified, delegating to orchestrator", {
          chatId: params.chatId,
        });

        const result = await multiAgentOrchestrator.orchestrate(_event, {
          chatId: params.chatId,
          prompt: params.task,
          parallelExecution: true,
          useLLMSelection: true,
        });

        logger.info("✅ Orchestrator completed", {
          chatId: params.chatId,
          executionCount: result.executionIds.length,
          executionIds: result.executionIds,
        });

        // Return the first (primary) execution
        const execution = await db.query.agentExecutions.findFirst({
          where: eq(agentExecutions.id, result.executionIds[0]),
        });

        logger.info("📤 Returning primary execution", {
          executionId: execution?.id,
          status: execution?.status,
        });

        return execution as AgentExecution;
      }

      logger.info("👤 Agent manually specified", {
        agentProfileId: params.agentProfileId,
      });

      // Verify agent profile exists and is enabled
      const profile = await db.query.agentProfiles.findFirst({
        where: and(
          eq(agentProfiles.id, params.agentProfileId),
          eq(agentProfiles.isEnabled, true),
        ),
      });

      if (!profile) {
        logger.error("❌ Agent profile not found or disabled", {
          agentProfileId: params.agentProfileId,
        });
        throw new DyadError(
          `Agent profile not found or disabled: ${params.agentProfileId}`,
          DyadErrorKind.NotFound,
        );
      }

      logger.info("✅ Agent profile verified", {
        agentProfileId: params.agentProfileId,
        agentName: profile.name,
        agentRole: profile.role,
      });

      // Create execution
      logger.info("💾 Creating execution record", {
        chatId: params.chatId,
        agentProfileId: params.agentProfileId,
      });

      const execution = await db
        .insert(agentExecutions)
        .values({
          chatId: params.chatId,
          agentProfileId: params.agentProfileId,
          parentExecutionId: params.parentExecutionId || null,
          task: params.task,
          status: "pending",
        })
        .returning()
        .then((rows) => rows[0]);

      logger.info("✅ Execution record created", {
        executionId: execution.id,
        agentProfileId: params.agentProfileId,
        status: execution.status,
      });

      // Start actual execution in background
      logger.info("🚀 Starting background execution", {
        executionId: execution.id,
      });

      const abortController = new AbortController();
      executeAgent(_event, execution.id, abortController).catch((error) => {
        logger.error("💥 Background agent execution failed", {
          executionId: execution.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      logger.info("📤 Returning execution (background task started)", {
        executionId: execution.id,
      });

      return execution as AgentExecution;
    },
  );

  createTypedHandler(
    multiAgentContracts.cancelAgentExecution,
    async (_event, executionId: number): Promise<boolean> => {
      return await multiAgentOrchestrator.cancelExecution(executionId);
    },
  );

  // ============================================================================
  // Agent Messages
  // ============================================================================

  createTypedHandler(
    multiAgentContracts.getAgentMessages,
    async (_event, executionId: number) => {
      const messages = await db.query.agentMessages.findMany({
        where: eq(agentMessages.executionId, executionId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      });

      return messages;
    },
  );

  // ============================================================================
  // Agent Communications
  // ============================================================================

  createTypedHandler(
    multiAgentContracts.getAgentCommunications,
    async (_event, chatId: number) => {
      const communications = await db.query.agentCommunications.findMany({
        where: eq(agentCommunications.chatId, chatId),
        orderBy: (communications, { asc }) => [asc(communications.createdAt)],
      });

      return communications;
    },
  );

  // ============================================================================
  // Multi-Agent Orchestration
  // ============================================================================

  createTypedHandler(
    multiAgentContracts.orchestrateAgents,
    async (_event, params: MultiAgentOrchestrationParams) => {
      return await multiAgentOrchestrator.orchestrate(_event, params);
    },
  );

  // ============================================================================
  // Agent Chat Management
  // ============================================================================

  createTypedHandler(
    multiAgentContracts.getOrCreateAgentChat,
    async (_event, appId: number): Promise<number> => {
      logger.info("🔍 Getting or creating agent chat", { appId });

      // Import chats schema
      const { chats, apps } = await import("@/db/schema");
      const { getDyadAppPath } = await import("@/paths/paths");
      const { getCurrentCommitHash } = await import("@/ipc/utils/git_utils");

      // Verify app exists
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!app) {
        logger.error("❌ App not found", { appId });
        throw new DyadError(`App not found: ${appId}`, DyadErrorKind.NotFound);
      }

      logger.info("✅ App found", { appId, appPath: app.path });

      // Look for existing agent chat (we'll use a special title to identify it)
      const existingChat = await db.query.chats.findFirst({
        where: and(eq(chats.appId, appId), eq(chats.title, "🤖 Agents")),
      });

      if (existingChat) {
        logger.info("✅ Found existing agent chat", {
          chatId: existingChat.id,
          appId,
        });
        return existingChat.id;
      }

      logger.info("📝 Creating new agent chat", { appId });

      // Get initial commit hash
      let initialCommitHash = null;
      try {
        initialCommitHash = await getCurrentCommitHash({
          path: getDyadAppPath(app.path),
        });
        logger.info("✅ Got initial commit hash", { initialCommitHash });
      } catch (error) {
        logger.warn("⚠️ Could not get initial commit hash", { error });
        // Continue without the git revision
      }

      // Create new chat with special title
      const [chat] = await db
        .insert(chats)
        .values({
          appId,
          title: "🤖 Agents",
          initialCommitHash,
        })
        .returning();

      logger.info("✅ Created new agent chat", {
        chatId: chat.id,
        appId,
        title: chat.title,
      });

      return chat.id;
    },
  );
}
