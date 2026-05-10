/**
 * TokenManager - Manages token budgets and validates against model limits
 *
 * This class is responsible for:
 * - Allocating token budgets based on task complexity
 * - Validating budgets against model context window limits
 * - Tracking token usage with database persistence
 * - Providing usage statistics with filtering
 *
 * Requirements: 3.1, 3.4, 3.6, 3.7, 7.1, 7.2
 */

import { findLanguageModel } from "@/ipc/utils/findLanguageModel";
import { LargeLanguageModel } from "@/lib/schemas";
import { db } from "@/db";
import { tokenAnalytics } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Configuration for token budget management per model type
 */
export interface TokenBudgetConfig {
  modelType: string;
  contextWindow: number;
  maxOutputTokens: number;
  defaultBudget: number;
  warningThreshold: number; // 0.8 (80%)
  criticalThreshold: number; // 0.9 (90%)
}

/**
 * Token budget allocation for a request
 */
export interface TokenBudget {
  total: number;
  used: number;
  remaining: number;
  warningThreshold: number; // 80% of total
  criticalThreshold: number; // 90% of total
}

/**
 * Token usage tracking for a request
 */
export interface TokenUsage {
  requestId: string;
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  modelType: string;
  conversationId?: string;
  skillName?: string;
}

/**
 * Result of budget validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  maxAllowed?: number;
}

/**
 * Agent request information for budget allocation
 */
export interface AgentRequest {
  requestId: string;
  taskComplexity: "simple" | "medium" | "complex";
  model: LargeLanguageModel;
  conversationId?: string;
  estimatedContextTokens?: number;
}

/**
 * Filter criteria for usage statistics
 */
export interface StatisticsFilter {
  conversationId?: string;
  skillName?: string;
  startTime?: Date;
  endTime?: Date;
  modelType?: string;
}

/**
 * Aggregated usage statistics
 */
export interface UsageStatistics {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  averageTokensPerRequest: number;
  optimizationsSaved: number;
  estimatedCost: number; // in cents
  byConversation?: Record<string, ConversationStats>;
  bySkill?: Record<string, SkillStats>;
  byModel?: Record<string, ModelStats>;
}

/**
 * Statistics per conversation
 */
export interface ConversationStats {
  conversationId: string;
  requestCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Statistics per skill
 */
export interface SkillStats {
  skillName: string;
  requestCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Statistics per model
 */
export interface ModelStats {
  modelType: string;
  requestCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONTEXT_WINDOW = 128_000;
const WARNING_THRESHOLD_PERCENT = 0.8;
const CRITICAL_THRESHOLD_PERCENT = 0.9;

/**
 * Default budget allocations based on task complexity
 * These are percentages of the available context window
 */
const COMPLEXITY_BUDGET_RATIOS = {
  simple: 0.3, // 30% of context window
  medium: 0.6, // 60% of context window
  complex: 0.85, // 85% of context window
} as const;

// =============================================================================
// TokenManager Class
// =============================================================================

export class TokenManager {
  /**
   * Allocate a token budget for a request based on task complexity
   *
   * @param request - The agent request containing task complexity and model info
   * @returns TokenBudget - The allocated budget with thresholds
   *
   * Requirements: 3.1
   */
  async allocateBudget(request: AgentRequest): Promise<TokenBudget> {
    // Get model configuration
    const config = await this.getModelConfig(request.model);

    // Calculate budget based on task complexity
    const complexityRatio = COMPLEXITY_BUDGET_RATIOS[request.taskComplexity];
    const totalBudget = Math.floor(config.contextWindow * complexityRatio);

    // Account for estimated context tokens if provided
    const estimatedContext = request.estimatedContextTokens || 0;
    const usedTokens = estimatedContext;
    const remaining = Math.max(0, totalBudget - usedTokens);

    // Calculate threshold values
    const warningThreshold = Math.floor(
      totalBudget * WARNING_THRESHOLD_PERCENT,
    );
    const criticalThreshold = Math.floor(
      totalBudget * CRITICAL_THRESHOLD_PERCENT,
    );

    return {
      total: totalBudget,
      used: usedTokens,
      remaining,
      warningThreshold,
      criticalThreshold,
    };
  }

  /**
   * Validate a budget adjustment against model context window limits
   *
   * @param budget - The proposed budget amount
   * @param model - The model to validate against
   * @returns ValidationResult - Whether the budget is valid and any error message
   *
   * Requirements: 3.6, 3.7
   */
  async validateBudget(
    budget: number,
    model: LargeLanguageModel,
  ): Promise<ValidationResult> {
    // Get model configuration
    const config = await this.getModelConfig(model);

    // Validate budget doesn't exceed context window
    if (budget > config.contextWindow) {
      return {
        valid: false,
        error: `Budget ${budget} exceeds model context window of ${config.contextWindow} tokens`,
        maxAllowed: config.contextWindow,
      };
    }

    // Validate budget is positive
    if (budget <= 0) {
      return {
        valid: false,
        error: `Budget must be positive, got ${budget}`,
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Get model configuration including context window and output limits
   *
   * @param model - The model identifier
   * @returns TokenBudgetConfig - Configuration for the model
   *
   * @private
   */
  private async getModelConfig(
    model: LargeLanguageModel,
  ): Promise<TokenBudgetConfig> {
    const modelOption = await findLanguageModel(model);

    const contextWindow = modelOption?.contextWindow || DEFAULT_CONTEXT_WINDOW;
    const maxOutputTokens =
      modelOption?.maxOutputTokens || Math.floor(contextWindow * 0.5);

    // Default budget is 60% of context window (medium complexity)
    const defaultBudget = Math.floor(
      contextWindow * COMPLEXITY_BUDGET_RATIOS.medium,
    );

    return {
      modelType: `${model.provider}/${model.name}`,
      contextWindow,
      maxOutputTokens,
      defaultBudget,
      warningThreshold: WARNING_THRESHOLD_PERCENT,
      criticalThreshold: CRITICAL_THRESHOLD_PERCENT,
    };
  }

  // =============================================================================
  // Token Usage Tracking Methods
  // =============================================================================

  /**
   * Track token consumption for a request with database persistence
   *
   * @param requestId - The request identifier
   * @param usage - Token usage information
   *
   * Requirements: 3.4, 7.1, 7.2
   */
  trackUsage(requestId: string, usage: TokenUsage): void {
    try {
      // Insert usage record into database
      db.insert(tokenAnalytics)
        .values({
          requestId: usage.requestId || requestId,
          conversationId: usage.conversationId || null,
          skillName: usage.skillName || null,
          timestamp: new Date(usage.timestamp),
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
          modelType: usage.modelType,
          optimizationsSaved: 0, // Will be populated by optimization engine
          costEstimate: null, // Will be calculated if pricing is available
        })
        .run();
    } catch (error) {
      // Log error but don't throw - tracking failures shouldn't break the main flow
      console.error("Failed to track token usage:", error);
    }
  }

  /**
   * Get usage statistics with filtering
   *
   * @param filter - Filter criteria for statistics
   * @returns Usage statistics aggregated by the filter criteria
   *
   * Requirements: 3.4, 7.1, 7.2
   */
  getStatistics(filter: StatisticsFilter): UsageStatistics {
    try {
      // Build WHERE conditions based on filter
      const conditions = [];

      if (filter.conversationId) {
        conditions.push(
          eq(tokenAnalytics.conversationId, filter.conversationId),
        );
      }

      if (filter.skillName) {
        conditions.push(eq(tokenAnalytics.skillName, filter.skillName));
      }

      if (filter.startTime) {
        conditions.push(gte(tokenAnalytics.timestamp, filter.startTime));
      }

      if (filter.endTime) {
        conditions.push(lte(tokenAnalytics.timestamp, filter.endTime));
      }

      if (filter.modelType) {
        conditions.push(eq(tokenAnalytics.modelType, filter.modelType));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get overall statistics
      const overallStats = db
        .select({
          totalRequests: sql<number>`COUNT(*)`,
          totalInputTokens: sql<number>`SUM(${tokenAnalytics.inputTokens})`,
          totalOutputTokens: sql<number>`SUM(${tokenAnalytics.outputTokens})`,
          totalTokens: sql<number>`SUM(${tokenAnalytics.totalTokens})`,
          optimizationsSaved: sql<number>`SUM(${tokenAnalytics.optimizationsSaved})`,
          estimatedCost: sql<number>`SUM(COALESCE(${tokenAnalytics.costEstimate}, 0))`,
        })
        .from(tokenAnalytics)
        .where(whereClause)
        .get();

      const totalRequests = Number(overallStats?.totalRequests || 0);
      const totalInputTokens = Number(overallStats?.totalInputTokens || 0);
      const totalOutputTokens = Number(overallStats?.totalOutputTokens || 0);
      const totalTokens = Number(overallStats?.totalTokens || 0);
      const optimizationsSaved = Number(overallStats?.optimizationsSaved || 0);
      const estimatedCost = Number(overallStats?.estimatedCost || 0);

      const averageTokensPerRequest =
        totalRequests > 0 ? totalTokens / totalRequests : 0;

      // Get statistics by conversation if not filtering by specific conversation
      let byConversation: Record<string, ConversationStats> | undefined;
      if (!filter.conversationId) {
        const conversationStats = db
          .select({
            conversationId: tokenAnalytics.conversationId,
            requestCount: sql<number>`COUNT(*)`,
            totalTokens: sql<number>`SUM(${tokenAnalytics.totalTokens})`,
            inputTokens: sql<number>`SUM(${tokenAnalytics.inputTokens})`,
            outputTokens: sql<number>`SUM(${tokenAnalytics.outputTokens})`,
          })
          .from(tokenAnalytics)
          .where(whereClause)
          .groupBy(tokenAnalytics.conversationId)
          .all();

        byConversation = {};
        for (const stat of conversationStats) {
          if (stat.conversationId) {
            byConversation[stat.conversationId] = {
              conversationId: stat.conversationId,
              requestCount: Number(stat.requestCount),
              totalTokens: Number(stat.totalTokens),
              inputTokens: Number(stat.inputTokens),
              outputTokens: Number(stat.outputTokens),
            };
          }
        }
      }

      // Get statistics by skill if not filtering by specific skill
      let bySkill: Record<string, SkillStats> | undefined;
      if (!filter.skillName) {
        const skillStats = db
          .select({
            skillName: tokenAnalytics.skillName,
            requestCount: sql<number>`COUNT(*)`,
            totalTokens: sql<number>`SUM(${tokenAnalytics.totalTokens})`,
            inputTokens: sql<number>`SUM(${tokenAnalytics.inputTokens})`,
            outputTokens: sql<number>`SUM(${tokenAnalytics.outputTokens})`,
          })
          .from(tokenAnalytics)
          .where(whereClause)
          .groupBy(tokenAnalytics.skillName)
          .all();

        bySkill = {};
        for (const stat of skillStats) {
          if (stat.skillName) {
            bySkill[stat.skillName] = {
              skillName: stat.skillName,
              requestCount: Number(stat.requestCount),
              totalTokens: Number(stat.totalTokens),
              inputTokens: Number(stat.inputTokens),
              outputTokens: Number(stat.outputTokens),
            };
          }
        }
      }

      // Get statistics by model if not filtering by specific model
      let byModel: Record<string, ModelStats> | undefined;
      if (!filter.modelType) {
        const modelStats = db
          .select({
            modelType: tokenAnalytics.modelType,
            requestCount: sql<number>`COUNT(*)`,
            totalTokens: sql<number>`SUM(${tokenAnalytics.totalTokens})`,
            inputTokens: sql<number>`SUM(${tokenAnalytics.inputTokens})`,
            outputTokens: sql<number>`SUM(${tokenAnalytics.outputTokens})`,
          })
          .from(tokenAnalytics)
          .where(whereClause)
          .groupBy(tokenAnalytics.modelType)
          .all();

        byModel = {};
        for (const stat of modelStats) {
          byModel[stat.modelType] = {
            modelType: stat.modelType,
            requestCount: Number(stat.requestCount),
            totalTokens: Number(stat.totalTokens),
            inputTokens: Number(stat.inputTokens),
            outputTokens: Number(stat.outputTokens),
          };
        }
      }

      return {
        totalRequests,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        averageTokensPerRequest,
        optimizationsSaved,
        estimatedCost,
        byConversation,
        bySkill,
        byModel,
      };
    } catch (error) {
      console.error("Failed to get token statistics:", error);
      // Return empty statistics on error
      return {
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        averageTokensPerRequest: 0,
        optimizationsSaved: 0,
        estimatedCost: 0,
      };
    }
  }

  /**
   * Export usage data in specified format
   *
   * @param _format - Export format (csv or json)
   * @returns Exported data as string
   *
   * TODO: Implement in Task 14.1 (Phase 3)
   */
  async exportData(_format: "csv" | "json"): Promise<string> {
    // To be implemented in Task 14.1
    throw new Error(
      "exportData not yet implemented - will be added in Task 14.1",
    );
  }
}
