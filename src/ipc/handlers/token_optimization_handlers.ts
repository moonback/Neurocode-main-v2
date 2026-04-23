// Token Optimization IPC Handlers
// Feature: token-optimization
// Requirements: 4.3, 4.4, 4.7, 5.1, 6.1, 6.6, 7.7

import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { tokenOptimizer } from "./token_optimization/token_optimizer";
import {
  getCosts,
  getCostSummary,
  exportCosts,
} from "./token_optimization/cost_tracker";
import {
  pinMessage,
  unpinMessage,
} from "./token_optimization/message_history_manager";
import {
  collectMetrics,
  exportAnalytics,
} from "./token_optimization/analytics_engine";
import { db } from "@/db";
import { messages, messagePriorities } from "@/db/schema";
import { eq } from "drizzle-orm";
import type {
  TokenOptimizationConfig,
  MessagePriority,
} from "./token_optimization/types";
import { ipcMain } from "electron";
import { calculateTokenBreakdown } from "./token_count_handlers";
import { readSettings } from "@/main/settings";
import { findLanguageModel } from "../utils/findLanguageModel";

/**
 * Register all token optimization IPC handlers
 * Validates: Requirements 7.7
 */
export function registerTokenOptimizationHandlers() {
  // ============================================================================
  // Configuration Handlers
  // ============================================================================

  /**
   * Get token optimization configuration
   * Channel: token-optimization:get-config
   * Validates: Requirements 5.1
   */
  ipcMain.handle(
    "token-optimization:get-config",
    async (event, appId?: number) => {
      try {
        // Validate appId if provided
        if (appId !== undefined) {
          if (!Number.isInteger(appId) || appId < 0) {
            throw new DyadError(
              "App ID must be a non-negative integer",
              DyadErrorKind.Validation,
            );
          }
        }

        const config = await tokenOptimizer.loadConfig(appId);
        return config;
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to get token optimization configuration: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  /**
   * Update token optimization configuration
   * Channel: token-optimization:update-config
   * Validates: Requirements 5.1
   */
  ipcMain.handle(
    "token-optimization:update-config",
    async (
      event,
      params: { config: Partial<TokenOptimizationConfig>; appId?: number },
    ) => {
      try {
        // Validate params
        if (!params || typeof params !== "object") {
          throw new DyadError(
            "Invalid parameters: expected object with config and optional appId",
            DyadErrorKind.Validation,
          );
        }

        if (!params.config || typeof params.config !== "object") {
          throw new DyadError(
            "Invalid config: expected object",
            DyadErrorKind.Validation,
          );
        }

        // Validate appId if provided
        if (params.appId !== undefined) {
          if (!Number.isInteger(params.appId) || params.appId < 0) {
            throw new DyadError(
              "App ID must be a non-negative integer",
              DyadErrorKind.Validation,
            );
          }
        }

        await tokenOptimizer.updateConfig(params.config, params.appId);
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to update token optimization configuration: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  /**
   * Reset token optimization configuration to defaults
   * Channel: token-optimization:reset-config
   * Validates: Requirements 5.1
   */
  ipcMain.handle(
    "token-optimization:reset-config",
    async (event, appId?: number) => {
      try {
        // Validate appId if provided
        if (appId !== undefined) {
          if (!Number.isInteger(appId) || appId < 0) {
            throw new DyadError(
              "App ID must be a non-negative integer",
              DyadErrorKind.Validation,
            );
          }
        }

        // Reset by updating with an empty config (will use defaults)
        await tokenOptimizer.updateConfig({}, appId);
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to reset token optimization configuration: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  // ============================================================================
  // Cost Tracking Handlers
  // ============================================================================

  /**
   * Get cost records with filtering
   * Channel: token-optimization:get-costs
   * Validates: Requirements 4.3, 4.4
   */
  ipcMain.handle(
    "token-optimization:get-costs",
    async (
      event,
      params: {
        startDate?: Date | string;
        endDate?: Date | string;
        appId?: number;
        chatId?: number;
        provider?: string;
      },
    ) => {
      try {
        // Validate params
        if (params && typeof params !== "object") {
          throw new DyadError(
            "Invalid parameters: expected object",
            DyadErrorKind.Validation,
          );
        }

        // Convert date strings to Date objects if needed
        const queryParams = {
          startDate: params?.startDate ? new Date(params.startDate) : undefined,
          endDate: params?.endDate ? new Date(params.endDate) : undefined,
          appId: params?.appId,
          chatId: params?.chatId,
          provider: params?.provider,
        };

        // Validate dates
        if (queryParams.startDate && isNaN(queryParams.startDate.getTime())) {
          throw new DyadError("Invalid start date", DyadErrorKind.Validation);
        }

        if (queryParams.endDate && isNaN(queryParams.endDate.getTime())) {
          throw new DyadError("Invalid end date", DyadErrorKind.Validation);
        }

        // Validate appId if provided
        if (queryParams.appId !== undefined) {
          if (!Number.isInteger(queryParams.appId) || queryParams.appId < 0) {
            throw new DyadError(
              "App ID must be a non-negative integer",
              DyadErrorKind.Validation,
            );
          }
        }

        // Validate chatId if provided
        if (queryParams.chatId !== undefined) {
          if (!Number.isInteger(queryParams.chatId) || queryParams.chatId < 0) {
            throw new DyadError(
              "Chat ID must be a non-negative integer",
              DyadErrorKind.Validation,
            );
          }
        }

        const costs = await getCosts(queryParams);
        return costs;
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to get cost records: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  /**
   * Get cost summary for a period
   * Channel: token-optimization:get-cost-summary
   * Validates: Requirements 4.3
   */
  ipcMain.handle(
    "token-optimization:get-cost-summary",
    async (
      event,
      params: {
        period: Period;
        appId?: number;
      },
    ) => {
      try {
        // Validate params
        if (!params || typeof params !== "object") {
          throw new DyadError(
            "Invalid parameters: expected object with period",
            DyadErrorKind.Validation,
          );
        }

        if (!params.period) {
          throw new DyadError("Period is required", DyadErrorKind.Validation);
        }

        // Validate period
        const validPeriods: Period[] = ["daily", "weekly", "monthly"];
        if (!validPeriods.includes(params.period)) {
          throw new DyadError(
            `Invalid period: must be one of ${validPeriods.join(", ")}`,
            DyadErrorKind.Validation,
          );
        }

        // Validate appId if provided
        if (params.appId !== undefined) {
          if (!Number.isInteger(params.appId) || params.appId < 0) {
            throw new DyadError(
              "App ID must be a non-negative integer",
              DyadErrorKind.Validation,
            );
          }
        }

        const summary = await getCostSummary(params.period, params.appId);
        return summary;
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to get cost summary: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  /**
   * Export cost records to file
   * Channel: token-optimization:export-costs
   * Validates: Requirements 4.7
   */
  ipcMain.handle(
    "token-optimization:export-costs",
    async (
      event,
      params: {
        format: "csv" | "json";
        startDate?: Date | string;
        endDate?: Date | string;
      },
    ) => {
      try {
        // Validate params
        if (!params || typeof params !== "object") {
          throw new DyadError(
            "Invalid parameters: expected object with format",
            DyadErrorKind.Validation,
          );
        }

        if (!params.format) {
          throw new DyadError("Format is required", DyadErrorKind.Validation);
        }

        // Validate format
        const validFormats = ["csv", "json"];
        if (!validFormats.includes(params.format)) {
          throw new DyadError(
            `Invalid format: must be one of ${validFormats.join(", ")}`,
            DyadErrorKind.Validation,
          );
        }

        // Convert date strings to Date objects if needed
        const exportParams = {
          format: params.format,
          startDate: params.startDate ? new Date(params.startDate) : undefined,
          endDate: params.endDate ? new Date(params.endDate) : undefined,
        };

        // Validate dates
        if (exportParams.startDate && isNaN(exportParams.startDate.getTime())) {
          throw new DyadError("Invalid start date", DyadErrorKind.Validation);
        }

        if (exportParams.endDate && isNaN(exportParams.endDate.getTime())) {
          throw new DyadError("Invalid end date", DyadErrorKind.Validation);
        }

        const filepath = await exportCosts(exportParams);
        return filepath;
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to export costs: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  // ============================================================================
  // Message Management Handlers
  // ============================================================================

  /**
   * Pin a message to protect it from pruning
   * Channel: token-optimization:pin-message
   * Validates: Requirements 6.1
   */
  ipcMain.handle(
    "token-optimization:pin-message",
    async (event, messageId: number) => {
      try {
        // Validate messageId
        if (messageId === undefined || messageId === null) {
          throw new DyadError(
            "Message ID is required",
            DyadErrorKind.Validation,
          );
        }

        if (!Number.isInteger(messageId) || messageId < 0) {
          throw new DyadError(
            "Message ID must be a non-negative integer",
            DyadErrorKind.Validation,
          );
        }

        await pinMessage(messageId);
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to pin message: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  /**
   * Unpin a message to allow it to be pruned normally
   * Channel: token-optimization:unpin-message
   * Validates: Requirements 6.1
   */
  ipcMain.handle(
    "token-optimization:unpin-message",
    async (event, messageId: number) => {
      try {
        // Validate messageId
        if (messageId === undefined || messageId === null) {
          throw new DyadError(
            "Message ID is required",
            DyadErrorKind.Validation,
          );
        }

        if (!Number.isInteger(messageId) || messageId < 0) {
          throw new DyadError(
            "Message ID must be a non-negative integer",
            DyadErrorKind.Validation,
          );
        }

        await unpinMessage(messageId);
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to unpin message: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  /**
   * Get message priority score
   * Channel: token-optimization:get-message-priority
   * Validates: Requirements 6.1
   */
  ipcMain.handle(
    "token-optimization:get-message-priority",
    async (event, messageId: number) => {
      try {
        // Validate messageId
        if (messageId === undefined || messageId === null) {
          throw new DyadError(
            "Message ID is required",
            DyadErrorKind.Validation,
          );
        }

        if (!Number.isInteger(messageId) || messageId < 0) {
          throw new DyadError(
            "Message ID must be a non-negative integer",
            DyadErrorKind.Validation,
          );
        }

        // Check if message exists
        const message = await db
          .select()
          .from(messages)
          .where(eq(messages.id, messageId))
          .limit(1);

        if (message.length === 0) {
          throw new DyadError(
            `Message ${messageId} not found`,
            DyadErrorKind.NotFound,
          );
        }

        // Get priority record
        const priorityRecord = await db
          .select()
          .from(messagePriorities)
          .where(eq(messagePriorities.messageId, messageId))
          .limit(1);

        if (priorityRecord.length === 0) {
          throw new DyadError(
            `Priority score not found for message ${messageId}. Message priorities may not have been calculated yet.`,
            DyadErrorKind.NotFound,
          );
        }

        const priority = priorityRecord[0];

        // Convert to MessagePriority interface
        const messagePriority: MessagePriority = {
          messageId: priority.messageId,
          score: priority.score,
          factors: {
            recency: priority.recencyFactor,
            userInteraction: priority.interactionFactor,
            semanticRelevance: priority.relevanceFactor,
            referenceCount: priority.referenceCount,
          },
          isPinned: priority.isPinned,
          isProtected: false, // Would need to calculate this based on message context
        };

        return messagePriority;
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to get message priority: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  // ============================================================================
  // Analytics Handlers
  // ============================================================================

  /**
   * Get optimization metrics
   * Channel: token-optimization:get-metrics
   * Validates: Requirements 6.1, 6.6
   */
  ipcMain.handle(
    "token-optimization:get-metrics",
    async (
      event,
      params: {
        startDate?: Date | string;
        endDate?: Date | string;
        appId?: number;
      },
    ) => {
      try {
        // Validate params
        if (params && typeof params !== "object") {
          throw new DyadError(
            "Invalid parameters: expected object",
            DyadErrorKind.Validation,
          );
        }

        // Convert date strings to Date objects if needed
        const queryParams = {
          startDate: params?.startDate ? new Date(params.startDate) : undefined,
          endDate: params?.endDate ? new Date(params.endDate) : undefined,
          appId: params?.appId,
        };

        // Validate dates
        if (queryParams.startDate && isNaN(queryParams.startDate.getTime())) {
          throw new DyadError("Invalid start date", DyadErrorKind.Validation);
        }

        if (queryParams.endDate && isNaN(queryParams.endDate.getTime())) {
          throw new DyadError("Invalid end date", DyadErrorKind.Validation);
        }

        // Validate appId if provided
        if (queryParams.appId !== undefined) {
          if (!Number.isInteger(queryParams.appId) || queryParams.appId < 0) {
            throw new DyadError(
              "App ID must be a non-negative integer",
              DyadErrorKind.Validation,
            );
          }
        }

        const metrics = await collectMetrics(queryParams);
        return metrics;
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to get optimization metrics: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  /**
   * Export analytics data to file
   * Channel: token-optimization:export-analytics
   * Validates: Requirements 6.6
   */
  ipcMain.handle(
    "token-optimization:export-analytics",
    async (
      event,
      params: {
        format: "json";
        startDate?: Date | string;
        endDate?: Date | string;
      },
    ) => {
      try {
        // Validate params
        if (!params || typeof params !== "object") {
          throw new DyadError(
            "Invalid parameters: expected object with format",
            DyadErrorKind.Validation,
          );
        }

        if (!params.format) {
          throw new DyadError("Format is required", DyadErrorKind.Validation);
        }

        // Validate format
        if (params.format !== "json") {
          throw new DyadError(
            "Invalid format: must be json",
            DyadErrorKind.Validation,
          );
        }

        // Convert date strings to Date objects if needed
        const exportParams = {
          format: params.format,
          startDate: params.startDate ? new Date(params.startDate) : undefined,
          endDate: params.endDate ? new Date(params.endDate) : undefined,
        };

        // Validate dates
        if (exportParams.startDate && isNaN(exportParams.startDate.getTime())) {
          throw new DyadError("Invalid start date", DyadErrorKind.Validation);
        }

        if (exportParams.endDate && isNaN(exportParams.endDate.getTime())) {
          throw new DyadError("Invalid end date", DyadErrorKind.Validation);
        }

        const filepath = await exportAnalytics(exportParams);
        return filepath;
      } catch (error) {
        if (error instanceof DyadError) {
          throw error;
        }
        throw new DyadError(
          `Failed to export analytics: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );

  /**
   * Estimate the cost of the next message
   * Channel: token-optimization:estimate-cost
   */
  ipcMain.handle(
    "token-optimization:estimate-cost",
    async (event, { chatId, input }: { chatId: number; input: string }) => {
      try {
        const breakdown = await calculateTokenBreakdown(chatId, input);
        const settings = readSettings();
        const modelInfo = await findLanguageModel(settings.selectedModel);

        if (!modelInfo) {
          throw new DyadError("Current model not found", DyadErrorKind.NotFound);
        }

        const pricing = await getModelPricing(
          modelInfo.apiName,
          modelInfo.providerId,
        );

        // Estimate output tokens (simple heuristic: 20% of input or 500 tokens)
        const estimatedOutputTokens = Math.max(
          500,
          Math.floor(breakdown.estimatedTotalTokens * 0.2),
        );

        const inputCost =
          (breakdown.estimatedTotalTokens / 1_000_000) *
          pricing.inputTokensPerMillion;
        const outputCost =
          (estimatedOutputTokens / 1_000_000) * pricing.outputTokensPerMillion;

        return {
          inputTokens: breakdown.estimatedTotalTokens,
          estimatedOutputTokens,
          estimatedTotalCost: Number((inputCost + outputCost).toFixed(6)),
          model: modelInfo.apiName,
          currency: "USD",
        };
      } catch (error) {
        if (error instanceof DyadError) throw error;
        throw new DyadError(
          `Failed to estimate cost: ${error instanceof Error ? error.message : String(error)}`,
          DyadErrorKind.Internal,
        );
      }
    },
  );
}
