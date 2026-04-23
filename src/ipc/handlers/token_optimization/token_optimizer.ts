// Token Optimizer Orchestrator
// Feature: token-optimization
// Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2

import { db } from "@/db";
import { tokenOptimizationConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type {
  TokenOptimizationConfig,
  TokenBudget,
  PruningResult,
  MessagePriority,
} from "./types";
import { calculateTokenBudget } from "./token_allocator";
import {
  pruneContext,
  BalancedStrategy,
  ConservativeStrategy,
  AggressiveStrategy,
} from "./context_pruner";
import type { PruningStrategy } from "./context_pruner";
import {
  calculateMessagePriority,
  type Message,
  type UserInteraction,
} from "./message_history_manager";
import { calculateCost, recordCost } from "./cost_tracker";
import { collectMetrics } from "./analytics_engine";

/**
 * Optimization Result
 * Contains the results of a full optimization operation
 */
export interface OptimizationResult {
  optimizedMessages: Message[];
  pruningResult: PruningResult;
  tokenBudget: TokenBudget;
  costEstimate?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

/**
 * Default Token Optimization Configuration
 * Validates: Requirements 5.1
 */
const DEFAULT_CONFIG: TokenOptimizationConfig = {
  pruningStrategy: "balanced",
  enableAutoPruning: true,
  pruningThreshold: 80,
  tokenAllocation: {
    inputContextRatio: 0.7,
    systemInstructionsRatio: 0.1,
    outputGenerationRatio: 0.2,
  },
  enableCostTracking: true,
  enableMessagePinning: true,
  coordinateWithCompaction: true,
  coordinateWithSmartContext: true,
};

/**
 * Token Optimizer
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 7.1, 7.2
 *
 * Central orchestrator that coordinates all token optimization subsystems:
 * - Provider Registry: Get provider configurations
 * - Token Allocator: Calculate token budgets
 * - Message History Manager: Calculate message priorities
 * - Context Pruner: Prune messages based on strategy
 * - Cost Tracker: Track and record costs
 * - Analytics Engine: Collect metrics
 */
export class TokenOptimizer {
  /**
   * Optimize Context
   * Validates: Requirements 5.1, 5.2, 7.1, 7.2
   *
   * Main optimization function that coordinates all subsystems to optimize
   * a conversation's message history for token efficiency.
   *
   * @param messages - All messages in the conversation
   * @param provider - Provider identifier (e.g., "openai/gpt-4")
   * @param appId - Application ID for app-scoped configuration
   * @param userInteractions - Optional user interactions for priority calculation
   * @returns Optimization result with optimized messages and metadata
   */
  async optimizeContext(
    messages: Message[],
    provider: string,
    appId: number,
    userInteractions: UserInteraction[] = [],
  ): Promise<OptimizationResult> {
    // Load configuration (app-scoped or global)
    const config = await this.loadConfig(appId);

    // Check if auto-pruning is enabled
    if (!config.enableAutoPruning) {
      // Return original messages without optimization
      const tokenBudget = calculateTokenBudget(provider, config);
      return {
        optimizedMessages: messages,
        pruningResult: {
          originalMessageCount: messages.length,
          prunedMessageCount: messages.length,
          tokensRemoved: 0,
          strategy: config.pruningStrategy,
          preservedMessages: messages.map((m) => m.id),
          removedMessages: [],
          compressionSummaries: [],
        },
        tokenBudget,
      };
    }

    // Step 1: Calculate token budget based on provider
    const tokenBudget = calculateTokenBudget(provider, config);

    // Step 2: Calculate message priorities
    const priorities: MessagePriority[] = messages.map((msg) =>
      calculateMessagePriority(msg, messages, userInteractions),
    );

    // Step 3: Select pruning strategy
    const strategy = this.selectPruningStrategy(config.pruningStrategy);

    // Step 4: Check if pruning should run
    // Coordination with compaction: only prune if we're approaching the threshold
    const currentTokens = this.estimateTokenCount(messages);
    const shouldPruneNow = strategy.shouldPrune(
      currentTokens,
      tokenBudget.total,
      config.pruningThreshold,
    );

    if (!shouldPruneNow) {
      // No pruning needed, return original messages
      return {
        optimizedMessages: messages,
        pruningResult: {
          originalMessageCount: messages.length,
          prunedMessageCount: messages.length,
          tokensRemoved: 0,
          strategy: config.pruningStrategy,
          preservedMessages: messages.map((m) => m.id),
          removedMessages: [],
          compressionSummaries: [],
        },
        tokenBudget,
      };
    }

    // Step 5: Prune context
    const pruningResult = pruneContext(messages, strategy, tokenBudget);

    // Step 6: Build optimized message array
    const preservedMessageIds = new Set(pruningResult.preservedMessages);
    const optimizedMessages = messages.filter((m) =>
      preservedMessageIds.has(m.id),
    );

    // Step 7: Calculate cost estimate if cost tracking is enabled
    let costEstimate;
    if (config.enableCostTracking) {
      const inputTokens = this.estimateTokenCount(optimizedMessages);
      const outputTokens = tokenBudget.allocated.outputGeneration;
      costEstimate = calculateCost(inputTokens, outputTokens, provider);
    }

    return {
      optimizedMessages,
      pruningResult,
      tokenBudget,
      costEstimate,
    };
  }

  /**
   * Load Configuration
   * Validates: Requirements 5.1, 5.6
   *
   * Loads token optimization configuration from the database.
   * If appId is provided, loads app-scoped configuration.
   * If no app-scoped configuration exists, falls back to global configuration.
   * If no configuration exists at all, returns default configuration.
   *
   * @param appId - Optional application ID for app-scoped configuration
   * @returns Token optimization configuration
   */
  async loadConfig(appId?: number): Promise<TokenOptimizationConfig> {
    try {
      // Try to load app-scoped configuration if appId is provided
      if (appId !== undefined) {
        const appConfig = db
          .select()
          .from(tokenOptimizationConfig)
          .where(eq(tokenOptimizationConfig.appId, appId))
          .get();

        if (appConfig && appConfig.config) {
          return appConfig.config as TokenOptimizationConfig;
        }
      }

      // Fall back to global configuration (appId = null)
      const globalConfig = db
        .select()
        .from(tokenOptimizationConfig)
        .where(eq(tokenOptimizationConfig.appId, null))
        .get();

      if (globalConfig && globalConfig.config) {
        return globalConfig.config as TokenOptimizationConfig;
      }

      // No configuration found, return defaults
      return DEFAULT_CONFIG;
    } catch (error) {
      throw new DyadError(
        `Failed to load token optimization configuration: ${error instanceof Error ? error.message : String(error)}`,
        DyadErrorKind.Internal,
      );
    }
  }

  /**
   * Update Configuration
   * Validates: Requirements 5.1, 5.6
   *
   * Updates token optimization configuration in the database.
   * Performs a shallow merge with existing configuration.
   * If appId is provided, updates app-scoped configuration.
   * Otherwise, updates global configuration.
   *
   * @param config - Partial configuration to update
   * @param appId - Optional application ID for app-scoped configuration
   */
  async updateConfig(
    config: Partial<TokenOptimizationConfig>,
    appId?: number,
  ): Promise<void> {
    try {
      // Load existing configuration
      const existingConfig = await this.loadConfig(appId);

      // Merge with new configuration (shallow merge)
      const updatedConfig: TokenOptimizationConfig = {
        ...existingConfig,
        ...config,
      };

      // Check if configuration record exists
      const existing = db
        .select()
        .from(tokenOptimizationConfig)
        .where(
          appId !== undefined
            ? eq(tokenOptimizationConfig.appId, appId)
            : eq(tokenOptimizationConfig.appId, null),
        )
        .get();

      const now = new Date();

      if (existing) {
        // Update existing record
        db.update(tokenOptimizationConfig)
          .set({
            config: updatedConfig,
            updatedAt: now,
          })
          .where(eq(tokenOptimizationConfig.id, existing.id))
          .run();
      } else {
        // Insert new record
        db.insert(tokenOptimizationConfig)
          .values({
            appId: appId !== undefined ? appId : null,
            config: updatedConfig,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    } catch (error) {
      throw new DyadError(
        `Failed to update token optimization configuration: ${error instanceof Error ? error.message : String(error)}`,
        DyadErrorKind.Internal,
      );
    }
  }

  /**
   * Should Run Before Compaction
   * Validates: Requirements 7.1
   *
   * Determines if token optimization should run before context compaction.
   * This coordination logic ensures that optimization and compaction don't
   * conflict or duplicate work.
   *
   * @param messages - Current messages in the conversation
   * @param provider - Provider identifier
   * @param appId - Application ID
   * @returns True if optimization should run before compaction
   */
  async shouldRunBeforeCompaction(
    messages: Message[],
    provider: string,
    appId: number,
  ): Promise<boolean> {
    // Load configuration
    const config = await this.loadConfig(appId);

    // Check if coordination is enabled
    if (!config.coordinateWithCompaction) {
      return false;
    }

    // Check if auto-pruning is enabled
    if (!config.enableAutoPruning) {
      return false;
    }

    // Calculate token budget
    const tokenBudget = calculateTokenBudget(provider, config);

    // Select pruning strategy
    const strategy = this.selectPruningStrategy(config.pruningStrategy);

    // Check if pruning threshold is reached
    const currentTokens = this.estimateTokenCount(messages);
    return strategy.shouldPrune(
      currentTokens,
      tokenBudget.total,
      config.pruningThreshold,
    );
  }

  /**
   * Record Token Usage
   * Validates: Requirements 4.1, 4.2
   *
   * Records token usage and cost to the database for tracking and analytics.
   * This should be called after an LLM response is received.
   *
   * @param params - Token usage parameters
   */
  async recordTokenUsage(params: {
    provider: string;
    model: string;
    appId: number;
    chatId: number;
    messageId?: number;
    inputTokens: number;
    outputTokens: number;
  }): Promise<void> {
    // Load configuration to check if cost tracking is enabled
    const config = await this.loadConfig(params.appId);

    if (!config.enableCostTracking) {
      return; // Cost tracking disabled, skip recording
    }

    // Calculate cost
    const cost = calculateCost(
      params.inputTokens,
      params.outputTokens,
      params.provider,
    );

    // Record to database
    await recordCost({
      timestamp: new Date(),
      provider: params.provider,
      model: params.model,
      appId: params.appId,
      chatId: params.chatId,
      messageId: params.messageId || null,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      inputCost: cost.inputCost,
      outputCost: cost.outputCost,
      totalCost: cost.totalCost,
    });
  }

  /**
   * Get Analytics Metrics
   * Validates: Requirements 6.1
   *
   * Retrieves optimization analytics metrics for a given time period.
   *
   * @param params - Metrics query parameters
   * @returns Optimization metrics
   */
  async getAnalyticsMetrics(params: {
    startDate?: Date;
    endDate?: Date;
    appId?: number;
  }) {
    return collectMetrics(params);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Select Pruning Strategy
   * Returns the appropriate pruning strategy instance based on configuration
   */
  private selectPruningStrategy(
    strategyName: "conservative" | "balanced" | "aggressive",
  ): PruningStrategy {
    switch (strategyName) {
      case "conservative":
        return new ConservativeStrategy();
      case "balanced":
        return new BalancedStrategy();
      case "aggressive":
        return new AggressiveStrategy();
      default:
        return new BalancedStrategy();
    }
  }

  /**
   * Estimate Token Count
   * Estimates the token count for a message array using a simple heuristic.
   * In production, this should use provider-specific tokenization.
   *
   * @param messages - Messages to count tokens for
   * @returns Estimated token count
   */
  private estimateTokenCount(messages: Message[]): number {
    // Simple heuristic: ~4 characters per token
    const totalChars = messages.reduce(
      (sum, msg) => sum + msg.content.length,
      0,
    );
    return Math.ceil(totalChars / 4);
  }
}

/**
 * Singleton instance of TokenOptimizer
 * Validates: Requirements 5.1
 */
export const tokenOptimizer = new TokenOptimizer();
