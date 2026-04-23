// Token Optimization Types
// Feature: token-optimization

import { z } from "zod";

/**
 * Token Optimization Configuration
 * Defines settings for token usage optimization, pruning strategies, and cost tracking
 */
export interface TokenOptimizationConfig {
  // Pruning settings
  pruningStrategy: "conservative" | "balanced" | "aggressive";
  enableAutoPruning: boolean;
  pruningThreshold: number; // Percentage of context window (default: 80)

  // Token allocation settings
  tokenAllocation: {
    inputContextRatio: number; // 0-1, default: 0.7
    systemInstructionsRatio: number; // 0-1, default: 0.1
    outputGenerationRatio: number; // 0-1, default: 0.2
  };

  // Cost tracking settings
  enableCostTracking: boolean;
  costBudget?: {
    amount: number; // USD
    period: "daily" | "weekly" | "monthly";
    warningThreshold: number; // Percentage (default: 80)
  };

  // Message history settings
  enableMessagePinning: boolean;
  slidingWindowSize?: number; // Number of high-priority messages to retain

  // Integration settings
  coordinateWithCompaction: boolean; // Default: true
  coordinateWithSmartContext: boolean; // Default: true
}

/**
 * Message Priority Score
 * Tracks the importance of a message for retention during pruning
 */
export interface MessagePriority {
  messageId: number;
  score: number; // 0-100
  factors: {
    recency: number; // 0-100
    userInteraction: number; // 0-100 (edits, approvals)
    semanticRelevance: number; // 0-100
    referenceCount: number; // Number of times referenced by later messages
  };
  isPinned: boolean;
  isProtected: boolean; // System messages, recent user/assistant
}

/**
 * Provider Configuration
 * Defines provider-specific token limits and pricing
 */
export interface ProviderConfig {
  providerId: string;
  contextWindow: number;
  maxOutputTokens?: number;
  pricing: {
    inputTokensPerMillion: number; // USD per 1M input tokens
    outputTokensPerMillion: number; // USD per 1M output tokens
    lastUpdated: Date;
  };
  optimalAllocation: {
    inputContextRatio: number;
    systemInstructionsRatio: number;
    outputGenerationRatio: number;
  };
  supportsExtendedContext: boolean;
  extendedContextWindow?: number;
}

/**
 * Token Budget
 * Tracks token allocation and usage for a conversation
 */
export interface TokenBudget {
  total: number;
  allocated: {
    inputContext: number;
    systemInstructions: number;
    outputGeneration: number;
  };
  used: {
    inputContext: number;
    systemInstructions: number;
    outputGeneration: number;
  };
  remaining: number;
  provider: string;
}

/**
 * Cost Record
 * Stores token usage and cost information for a message
 */
export interface CostRecord {
  id: number;
  timestamp: Date;
  provider: string;
  appId: number;
  chatId: number;
  messageId: number;
  inputTokens: number;
  outputTokens: number;
  inputCost: number; // USD
  outputCost: number; // USD
  totalCost: number; // USD
  model: string;
}

/**
 * Pruning Result
 * Contains information about a pruning operation
 */
export interface PruningResult {
  originalMessageCount: number;
  prunedMessageCount: number;
  tokensRemoved: number;
  strategy: "conservative" | "balanced" | "aggressive";
  preservedMessages: number[];
  removedMessages: number[];
  compressionSummaries: Array<{
    messageRange: [number, number];
    summary: string;
  }>;
}

/**
 * Optimization Metrics
 * Analytics data for token optimization effectiveness
 */
export interface OptimizationMetrics {
  period: {
    start: Date;
    end: Date;
  };
  tokenUsage: {
    total: number;
    byProvider: Record<string, number>;
    byApp: Record<number, number>;
    saved: number; // Tokens saved through optimization
  };
  costs: {
    total: number;
    byProvider: Record<string, number>;
    byApp: Record<number, number>;
    saved: number; // Cost saved through optimization
  };
  pruningEffectiveness: {
    averageReduction: number; // Percentage
    strategyBreakdown: Record<string, number>;
  };
  highConsumptionConversations: Array<{
    chatId: number;
    appId: number;
    totalTokens: number;
    totalCost: number;
  }>;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

/**
 * Pruning Strategy Schema
 * Validates: Requirements 8.5 - Strategy Enum Validation
 */
export const PruningStrategySchema = z.enum([
  "conservative",
  "balanced",
  "aggressive",
]);

/**
 * Token Allocation Schema
 * Validates that ratios are between 0 and 1
 */
export const TokenAllocationSchema = z.object({
  inputContextRatio: z
    .number()
    .min(0, "Input context ratio must be at least 0")
    .max(1, "Input context ratio must be at most 1"),
  systemInstructionsRatio: z
    .number()
    .min(0, "System instructions ratio must be at least 0")
    .max(1, "System instructions ratio must be at most 1"),
  outputGenerationRatio: z
    .number()
    .min(0, "Output generation ratio must be at least 0")
    .max(1, "Output generation ratio must be at most 1"),
});

/**
 * Cost Budget Period Schema
 */
export const CostBudgetPeriodSchema = z.enum(["daily", "weekly", "monthly"]);

/**
 * Cost Budget Schema
 * Validates: Requirements 8.6 - Positive Number Validation
 */
export const CostBudgetSchema = z.object({
  amount: z.number().positive("Cost budget amount must be a positive number"),
  period: CostBudgetPeriodSchema,
  warningThreshold: z
    .number()
    .min(0, "Warning threshold must be at least 0")
    .max(100, "Warning threshold must be at most 100"),
});

/**
 * Token Optimization Configuration Schema
 * Validates: Requirements 5.1, 8.1, 8.5, 8.6
 * Main configuration schema for token optimization settings
 */
export const TokenOptimizationConfigSchema = z.object({
  // Pruning settings
  pruningStrategy: PruningStrategySchema,
  enableAutoPruning: z.boolean(),
  pruningThreshold: z
    .number()
    .min(0, "Pruning threshold must be at least 0")
    .max(100, "Pruning threshold must be at most 100"),

  // Token allocation settings
  tokenAllocation: TokenAllocationSchema,

  // Cost tracking settings
  enableCostTracking: z.boolean(),
  costBudget: CostBudgetSchema.optional(),

  // Message history settings
  enableMessagePinning: z.boolean(),
  slidingWindowSize: z
    .number()
    .int("Sliding window size must be an integer")
    .positive("Sliding window size must be a positive number")
    .optional(),

  // Integration settings
  coordinateWithCompaction: z.boolean(),
  coordinateWithSmartContext: z.boolean(),
});

/**
 * Message Priority Factors Schema
 */
export const MessagePriorityFactorsSchema = z.object({
  recency: z
    .number()
    .min(0, "Recency score must be at least 0")
    .max(100, "Recency score must be at most 100"),
  userInteraction: z
    .number()
    .min(0, "User interaction score must be at least 0")
    .max(100, "User interaction score must be at most 100"),
  semanticRelevance: z
    .number()
    .min(0, "Semantic relevance score must be at least 0")
    .max(100, "Semantic relevance score must be at most 100"),
  referenceCount: z
    .number()
    .int("Reference count must be an integer")
    .nonnegative("Reference count must be non-negative"),
});

/**
 * Message Priority Schema
 */
export const MessagePrioritySchema = z.object({
  messageId: z.number().int("Message ID must be an integer"),
  score: z
    .number()
    .min(0, "Priority score must be at least 0")
    .max(100, "Priority score must be at most 100"),
  factors: MessagePriorityFactorsSchema,
  isPinned: z.boolean(),
  isProtected: z.boolean(),
});

/**
 * Provider Pricing Schema
 */
export const ProviderPricingSchema = z.object({
  inputTokensPerMillion: z
    .number()
    .nonnegative("Input token price must be non-negative"),
  outputTokensPerMillion: z
    .number()
    .nonnegative("Output token price must be non-negative"),
  lastUpdated: z.date(),
});

/**
 * Provider Optimal Allocation Schema
 */
export const ProviderOptimalAllocationSchema = z.object({
  inputContextRatio: z
    .number()
    .min(0, "Input context ratio must be at least 0")
    .max(1, "Input context ratio must be at most 1"),
  systemInstructionsRatio: z
    .number()
    .min(0, "System instructions ratio must be at least 0")
    .max(1, "System instructions ratio must be at most 1"),
  outputGenerationRatio: z
    .number()
    .min(0, "Output generation ratio must be at least 0")
    .max(1, "Output generation ratio must be at most 1"),
});

/**
 * Provider Configuration Schema
 */
export const ProviderConfigSchema = z.object({
  providerId: z.string().min(1, "Provider ID must not be empty"),
  contextWindow: z
    .number()
    .int("Context window must be an integer")
    .positive("Context window must be a positive number"),
  maxOutputTokens: z
    .number()
    .int("Max output tokens must be an integer")
    .positive("Max output tokens must be a positive number")
    .optional(),
  pricing: ProviderPricingSchema,
  optimalAllocation: ProviderOptimalAllocationSchema,
  supportsExtendedContext: z.boolean(),
  extendedContextWindow: z
    .number()
    .int("Extended context window must be an integer")
    .positive("Extended context window must be a positive number")
    .optional(),
});

/**
 * Token Budget Allocated Schema
 */
export const TokenBudgetAllocatedSchema = z.object({
  inputContext: z
    .number()
    .int("Input context tokens must be an integer")
    .nonnegative("Input context tokens must be non-negative"),
  systemInstructions: z
    .number()
    .int("System instructions tokens must be an integer")
    .nonnegative("System instructions tokens must be non-negative"),
  outputGeneration: z
    .number()
    .int("Output generation tokens must be an integer")
    .nonnegative("Output generation tokens must be non-negative"),
});

/**
 * Token Budget Schema
 */
export const TokenBudgetSchema = z.object({
  total: z
    .number()
    .int("Total tokens must be an integer")
    .nonnegative("Total tokens must be non-negative"),
  allocated: TokenBudgetAllocatedSchema,
  used: TokenBudgetAllocatedSchema,
  remaining: z
    .number()
    .int("Remaining tokens must be an integer")
    .nonnegative("Remaining tokens must be non-negative"),
  provider: z.string().min(1, "Provider must not be empty"),
});

/**
 * Cost Record Schema
 */
export const CostRecordSchema = z.object({
  id: z.number().int("Cost record ID must be an integer"),
  timestamp: z.date(),
  provider: z.string().min(1, "Provider must not be empty"),
  appId: z.number().int("App ID must be an integer"),
  chatId: z.number().int("Chat ID must be an integer"),
  messageId: z.number().int("Message ID must be an integer"),
  inputTokens: z
    .number()
    .int("Input tokens must be an integer")
    .nonnegative("Input tokens must be non-negative"),
  outputTokens: z
    .number()
    .int("Output tokens must be an integer")
    .nonnegative("Output tokens must be non-negative"),
  inputCost: z.number().nonnegative("Input cost must be non-negative"),
  outputCost: z.number().nonnegative("Output cost must be non-negative"),
  totalCost: z.number().nonnegative("Total cost must be non-negative"),
  model: z.string().min(1, "Model must not be empty"),
});

/**
 * Compression Summary Schema
 */
export const CompressionSummarySchema = z.object({
  messageRange: z.tuple([z.number().int(), z.number().int()]),
  summary: z.string(),
});

/**
 * Pruning Result Schema
 */
export const PruningResultSchema = z.object({
  originalMessageCount: z
    .number()
    .int("Original message count must be an integer")
    .nonnegative("Original message count must be non-negative"),
  prunedMessageCount: z
    .number()
    .int("Pruned message count must be an integer")
    .nonnegative("Pruned message count must be non-negative"),
  tokensRemoved: z
    .number()
    .int("Tokens removed must be an integer")
    .nonnegative("Tokens removed must be non-negative"),
  strategy: PruningStrategySchema,
  preservedMessages: z.array(z.number().int()),
  removedMessages: z.array(z.number().int()),
  compressionSummaries: z.array(CompressionSummarySchema),
});

/**
 * Optimization Metrics Period Schema
 */
export const OptimizationMetricsPeriodSchema = z.object({
  start: z.date(),
  end: z.date(),
});

/**
 * Token Usage Metrics Schema
 */
export const TokenUsageMetricsSchema = z.object({
  total: z
    .number()
    .int("Total tokens must be an integer")
    .nonnegative("Total tokens must be non-negative"),
  byProvider: z.record(z.string(), z.number().nonnegative()),
  byApp: z.record(z.string(), z.number().nonnegative()),
  saved: z
    .number()
    .int("Saved tokens must be an integer")
    .nonnegative("Saved tokens must be non-negative"),
});

/**
 * Cost Metrics Schema
 */
export const CostMetricsSchema = z.object({
  total: z.number().nonnegative("Total cost must be non-negative"),
  byProvider: z.record(z.string(), z.number().nonnegative()),
  byApp: z.record(z.string(), z.number().nonnegative()),
  saved: z.number().nonnegative("Saved cost must be non-negative"),
});

/**
 * Pruning Effectiveness Schema
 */
export const PruningEffectivenessSchema = z.object({
  averageReduction: z
    .number()
    .min(0, "Average reduction must be at least 0")
    .max(100, "Average reduction must be at most 100"),
  strategyBreakdown: z.record(z.string(), z.number().nonnegative()),
});

/**
 * High Consumption Conversation Schema
 */
export const HighConsumptionConversationSchema = z.object({
  chatId: z.number().int("Chat ID must be an integer"),
  appId: z.number().int("App ID must be an integer"),
  totalTokens: z
    .number()
    .int("Total tokens must be an integer")
    .nonnegative("Total tokens must be non-negative"),
  totalCost: z.number().nonnegative("Total cost must be non-negative"),
});

/**
 * Optimization Metrics Schema
 */
export const OptimizationMetricsSchema = z.object({
  period: OptimizationMetricsPeriodSchema,
  tokenUsage: TokenUsageMetricsSchema,
  costs: CostMetricsSchema,
  pruningEffectiveness: PruningEffectivenessSchema,
  highConsumptionConversations: z.array(HighConsumptionConversationSchema),
});

// ============================================================================
// Type Inference from Schemas
// ============================================================================

// Export inferred types for use in other modules
export type PruningStrategy = z.infer<typeof PruningStrategySchema>;
export type CostBudgetPeriod = z.infer<typeof CostBudgetPeriodSchema>;
