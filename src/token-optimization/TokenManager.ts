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

/**
 * Top consumer entry (conversation, skill, or model)
 */
export interface TopConsumer {
  id: string; // conversationId, skillName, or modelType
  type: "conversation" | "skill" | "model";
  totalTokens: number;
  requestCount: number;
  percentage: number; // percentage of total tokens
}

/**
 * Model pricing information (in USD per 1M tokens)
 */
export interface ModelPricing {
  modelType: string;
  inputPricePerMillion: number; // USD per 1M input tokens
  outputPricePerMillion: number; // USD per 1M output tokens
}

/**
 * Cost breakdown by model
 */
export interface CostBreakdown {
  modelType: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number; // in USD
  outputCost: number; // in USD
  totalCost: number; // in USD
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
      console.log(
        `💾 TokenManager.trackUsage: Saving ${usage.totalTokens} tokens to database for conversation ${usage.conversationId}`,
      );
      
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
        
      console.log(
        `✅ TokenManager.trackUsage: Successfully saved token usage to database (requestId: ${usage.requestId})`,
      );
    } catch (error) {
      // Log error but don't throw - tracking failures shouldn't break the main flow
      console.error("❌ TokenManager.trackUsage: Failed to track token usage:", error);
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
   * @param format - Export format (csv or json)
   * @param filter - Filter criteria for data to export
   * @returns Exported data as string
   *
   * Requirements: 7.5
   */
  async exportData(
    format: "csv" | "json",
    filter: StatisticsFilter = {},
  ): Promise<string> {
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

      // Get all matching records
      const records = db.select().from(tokenAnalytics).where(whereClause).all();

      if (format === "csv") {
        return this.exportToCSV(records);
      } else {
        return this.exportToJSON(records);
      }
    } catch (error) {
      console.error("Failed to export data:", error);
      throw new Error(
        `Failed to export data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Export records to CSV format
   *
   * @param records - Records to export
   * @returns CSV string with proper headers and escaping
   *
   * @private
   */
  private exportToCSV(records: any[]): string {
    if (records.length === 0) {
      return "requestId,conversationId,skillName,modelType,inputTokens,outputTokens,totalTokens,optimizationsSaved,costEstimate,timestamp\n";
    }

    // CSV header
    const headers = [
      "requestId",
      "conversationId",
      "skillName",
      "modelType",
      "inputTokens",
      "outputTokens",
      "totalTokens",
      "optimizationsSaved",
      "costEstimate",
      "timestamp",
    ];

    const csvLines = [headers.join(",")];

    // CSV rows
    for (const record of records) {
      const row = [
        this.escapeCSVField(record.requestId || ""),
        this.escapeCSVField(record.conversationId || ""),
        this.escapeCSVField(record.skillName || ""),
        this.escapeCSVField(record.modelType || ""),
        record.inputTokens || 0,
        record.outputTokens || 0,
        record.totalTokens || 0,
        record.optimizationsSaved || 0,
        record.costEstimate || 0,
        record.timestamp || 0,
      ];

      csvLines.push(row.join(","));
    }

    return csvLines.join("\n") + "\n";
  }

  /**
   * Escape a CSV field value
   *
   * @param value - Value to escape
   * @returns Escaped value
   *
   * @private
   */
  private escapeCSVField(value: string): string {
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Export records to JSON format
   *
   * @param records - Records to export
   * @returns JSON string
   *
   * @private
   */
  private exportToJSON(records: any[]): string {
    return JSON.stringify(records, null, 2);
  }

  /**
   * Get top token consumers (conversations, skills, or models)
   *
   * @param filter - Filter criteria for statistics
   * @param limit - Maximum number of top consumers to return (default: 10)
   * @param type - Type of consumers to return (default: all types)
   * @returns Array of top consumers sorted by token usage
   *
   * Requirements: 7.3
   */
  getTopConsumers(
    filter: StatisticsFilter,
    limit: number = 10,
    type?: "conversation" | "skill" | "model",
  ): TopConsumer[] {
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

      // Get total tokens for percentage calculation
      const totalStats = db
        .select({
          totalTokens: sql<number>`SUM(${tokenAnalytics.totalTokens})`,
        })
        .from(tokenAnalytics)
        .where(whereClause)
        .get();

      const grandTotal = Number(totalStats?.totalTokens || 0);

      const consumers: TopConsumer[] = [];

      // Get top conversations
      if (!type || type === "conversation") {
        const conversationConsumers = db
          .select({
            id: tokenAnalytics.conversationId,
            totalTokens: sql<number>`SUM(${tokenAnalytics.totalTokens})`,
            requestCount: sql<number>`COUNT(*)`,
          })
          .from(tokenAnalytics)
          .where(whereClause)
          .groupBy(tokenAnalytics.conversationId)
          .orderBy(sql`SUM(${tokenAnalytics.totalTokens}) DESC`)
          .limit(limit)
          .all();

        for (const consumer of conversationConsumers) {
          if (consumer.id) {
            consumers.push({
              id: consumer.id,
              type: "conversation",
              totalTokens: Number(consumer.totalTokens),
              requestCount: Number(consumer.requestCount),
              percentage:
                grandTotal > 0
                  ? (Number(consumer.totalTokens) / grandTotal) * 100
                  : 0,
            });
          }
        }
      }

      // Get top skills
      if (!type || type === "skill") {
        const skillConsumers = db
          .select({
            id: tokenAnalytics.skillName,
            totalTokens: sql<number>`SUM(${tokenAnalytics.totalTokens})`,
            requestCount: sql<number>`COUNT(*)`,
          })
          .from(tokenAnalytics)
          .where(whereClause)
          .groupBy(tokenAnalytics.skillName)
          .orderBy(sql`SUM(${tokenAnalytics.totalTokens}) DESC`)
          .limit(limit)
          .all();

        for (const consumer of skillConsumers) {
          if (consumer.id) {
            consumers.push({
              id: consumer.id,
              type: "skill",
              totalTokens: Number(consumer.totalTokens),
              requestCount: Number(consumer.requestCount),
              percentage:
                grandTotal > 0
                  ? (Number(consumer.totalTokens) / grandTotal) * 100
                  : 0,
            });
          }
        }
      }

      // Get top models
      if (!type || type === "model") {
        const modelConsumers = db
          .select({
            id: tokenAnalytics.modelType,
            totalTokens: sql<number>`SUM(${tokenAnalytics.totalTokens})`,
            requestCount: sql<number>`COUNT(*)`,
          })
          .from(tokenAnalytics)
          .where(whereClause)
          .groupBy(tokenAnalytics.modelType)
          .orderBy(sql`SUM(${tokenAnalytics.totalTokens}) DESC`)
          .limit(limit)
          .all();

        for (const consumer of modelConsumers) {
          consumers.push({
            id: consumer.id,
            type: "model",
            totalTokens: Number(consumer.totalTokens),
            requestCount: Number(consumer.requestCount),
            percentage:
              grandTotal > 0
                ? (Number(consumer.totalTokens) / grandTotal) * 100
                : 0,
          });
        }
      }

      // Sort all consumers by total tokens and limit
      consumers.sort((a, b) => b.totalTokens - a.totalTokens);
      return consumers.slice(0, limit);
    } catch (error) {
      console.error("Failed to get top consumers:", error);
      return [];
    }
  }

  /**
   * Calculate cost estimates based on token usage and model pricing
   *
   * @param filter - Filter criteria for statistics
   * @param pricing - Model pricing information (optional, uses default pricing if not provided)
   * @returns Cost breakdown by model
   *
   * Requirements: 7.6
   */
  calculateCost(
    filter: StatisticsFilter,
    pricing?: ModelPricing[],
  ): CostBreakdown[] {
    try {
      // Default pricing for common models (in USD per 1M tokens)
      const defaultPricing: Record<string, ModelPricing> = {
        "claude-3-5-sonnet-20241022": {
          modelType: "claude-3-5-sonnet-20241022",
          inputPricePerMillion: 3.0,
          outputPricePerMillion: 15.0,
        },
        "claude-3-5-haiku-20241022": {
          modelType: "claude-3-5-haiku-20241022",
          inputPricePerMillion: 1.0,
          outputPricePerMillion: 5.0,
        },
        "claude-3-opus-20240229": {
          modelType: "claude-3-opus-20240229",
          inputPricePerMillion: 15.0,
          outputPricePerMillion: 75.0,
        },
        "gpt-4o": {
          modelType: "gpt-4o",
          inputPricePerMillion: 2.5,
          outputPricePerMillion: 10.0,
        },
        "gpt-4o-mini": {
          modelType: "gpt-4o-mini",
          inputPricePerMillion: 0.15,
          outputPricePerMillion: 0.6,
        },
        "gpt-4-turbo": {
          modelType: "gpt-4-turbo",
          inputPricePerMillion: 10.0,
          outputPricePerMillion: 30.0,
        },
      };

      // Build pricing map
      const pricingMap: Record<string, ModelPricing> = { ...defaultPricing };
      if (pricing) {
        for (const price of pricing) {
          pricingMap[price.modelType] = price;
        }
      }

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

      // Get token usage by model
      const modelUsage = db
        .select({
          modelType: tokenAnalytics.modelType,
          inputTokens: sql<number>`SUM(${tokenAnalytics.inputTokens})`,
          outputTokens: sql<number>`SUM(${tokenAnalytics.outputTokens})`,
        })
        .from(tokenAnalytics)
        .where(whereClause)
        .groupBy(tokenAnalytics.modelType)
        .all();

      const costBreakdown: CostBreakdown[] = [];

      for (const usage of modelUsage) {
        const inputTokens = Number(usage.inputTokens);
        const outputTokens = Number(usage.outputTokens);

        // Get pricing for this model (use default if not found)
        const modelPricing = pricingMap[usage.modelType] || {
          modelType: usage.modelType,
          inputPricePerMillion: 3.0, // default fallback
          outputPricePerMillion: 15.0, // default fallback
        };

        // Calculate costs (convert from per-million to actual cost)
        const inputCost =
          (inputTokens / 1_000_000) * modelPricing.inputPricePerMillion;
        const outputCost =
          (outputTokens / 1_000_000) * modelPricing.outputPricePerMillion;
        const totalCost = inputCost + outputCost;

        costBreakdown.push({
          modelType: usage.modelType,
          inputTokens,
          outputTokens,
          inputCost,
          outputCost,
          totalCost,
        });
      }

      // Sort by total cost descending
      costBreakdown.sort((a, b) => b.totalCost - a.totalCost);

      return costBreakdown;
    } catch (error) {
      console.error("Failed to calculate cost:", error);
      return [];
    }
  }

  // =============================================================================
  // Dynamic Context Window Management Methods
  // =============================================================================

  /**
   * Detect the context window size for a specific model type
   *
   * @param model - The model to detect context window for
   * @returns The context window size in tokens
   *
   * Requirements: 11.1
   */
  async detectContextWindow(model: LargeLanguageModel): Promise<number> {
    const config = await this.getModelConfig(model);
    return config.contextWindow;
  }

  /**
   * Adaptively include context based on available window size
   *
   * @param model - The model being used
   * @param currentContextTokens - Current context size in tokens
   * @param availableContent - Array of content items with their token counts
   * @returns Array of content items that should be included
   *
   * Requirements: 11.2, 11.3, 11.5
   */
  async adaptiveInclude<T extends { tokens: number }>(
    model: LargeLanguageModel,
    currentContextTokens: number,
    availableContent: T[],
  ): Promise<T[]> {
    const contextWindow = await this.detectContextWindow(model);
    const remainingSpace = contextWindow - currentContextTokens;

    // If we have plenty of space (>50% of window remaining), include more content
    if (remainingSpace > contextWindow * 0.5) {
      // Include all content that fits
      const included: T[] = [];
      let totalTokens = 0;

      for (const item of availableContent) {
        if (totalTokens + item.tokens <= remainingSpace) {
          included.push(item);
          totalTokens += item.tokens;
        }
      }

      return included;
    }

    // If we have limited space (<50% remaining), be more selective
    // Sort by tokens (prefer smaller items to fit more)
    const sortedContent = [...availableContent].sort(
      (a, b) => a.tokens - b.tokens,
    );

    const included: T[] = [];
    let totalTokens = 0;

    for (const item of sortedContent) {
      if (totalTokens + item.tokens <= remainingSpace) {
        included.push(item);
        totalTokens += item.tokens;
      }
    }

    return included;
  }

  /**
   * Reserve tokens for expected response length
   *
   * @param model - The model being used
   * @param expectedResponseLength - Expected response length category
   * @returns Number of tokens to reserve for the response
   *
   * Requirements: 11.4
   */
  async reserveResponseTokens(
    model: LargeLanguageModel,
    expectedResponseLength: "short" | "medium" | "long" | "very-long",
  ): Promise<number> {
    const config = await this.getModelConfig(model);
    const maxOutput = config.maxOutputTokens;

    // Reserve tokens based on expected response length
    switch (expectedResponseLength) {
      case "short":
        return Math.min(1_000, Math.floor(maxOutput * 0.1)); // 10% or 1k, whichever is smaller
      case "medium":
        return Math.min(4_000, Math.floor(maxOutput * 0.25)); // 25% or 4k, whichever is smaller
      case "long":
        return Math.min(8_000, Math.floor(maxOutput * 0.5)); // 50% or 8k, whichever is smaller
      case "very-long":
        return Math.min(16_000, Math.floor(maxOutput * 0.75)); // 75% or 16k, whichever is smaller
      default:
        return Math.min(4_000, Math.floor(maxOutput * 0.25)); // Default to medium
    }
  }

  /**
   * Provide feedback when tasks require more context than available
   *
   * @param model - The model being used
   * @param requiredTokens - Number of tokens required for the task
   * @param currentContextTokens - Current context size in tokens
   * @returns Feedback message explaining the limitation
   *
   * Requirements: 11.6
   */
  async provideFeedback(
    model: LargeLanguageModel,
    requiredTokens: number,
    currentContextTokens: number,
  ): Promise<string> {
    const contextWindow = await this.detectContextWindow(model);
    const availableSpace = contextWindow - currentContextTokens;

    if (requiredTokens <= availableSpace) {
      return "Sufficient context window available for this task.";
    }

    const deficit = requiredTokens - availableSpace;
    const deficitPercentage = ((deficit / requiredTokens) * 100).toFixed(1);

    const modelType = `${model.provider}/${model.name}`;

    return (
      `Insufficient context window for this task. ` +
      `Model ${modelType} has a context window of ${contextWindow.toLocaleString()} tokens. ` +
      `Current context uses ${currentContextTokens.toLocaleString()} tokens, ` +
      `leaving ${availableSpace.toLocaleString()} tokens available. ` +
      `This task requires ${requiredTokens.toLocaleString()} tokens ` +
      `(${deficit.toLocaleString()} tokens short, ${deficitPercentage}% deficit). ` +
      `Consider: (1) using a model with a larger context window, ` +
      `(2) reducing the amount of context included, or ` +
      `(3) breaking the task into smaller subtasks.`
    );
  }
}
