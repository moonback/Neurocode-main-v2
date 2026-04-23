import { z } from "zod";
import { defineContract } from "../contracts/core";

// =============================================================================
// Token Optimization Schemas
// =============================================================================

export const TokenAllocationSchema = z.object({
  inputContextRatio: z.number().min(0).max(1),
  systemInstructionsRatio: z.number().min(0).max(1),
  outputGenerationRatio: z.number().min(0).max(1),
});

export const CostBudgetSchema = z.object({
  amount: z.number().positive(),
  period: z.enum(["monthly"]),
  warningThreshold: z.number().min(0).max(100),
});

export const TokenOptimizationConfigSchema = z.object({
  pruningStrategy: z.enum(["fifo", "lifo", "balanced"]),
  enableAutoPruning: z.boolean(),
  pruningThreshold: z.number().min(0).max(100),
  tokenAllocation: TokenAllocationSchema,
  enableCostTracking: z.boolean(),
  costBudget: CostBudgetSchema,
  enableMessagePinning: z.boolean(),
  slidingWindowSize: z.number().int().positive().optional(),
  coordinateWithCompaction: z.boolean(),
  coordinateWithSmartContext: z.boolean(),
});

export type TokenOptimizationConfig = z.infer<typeof TokenOptimizationConfigSchema>;

export const CostRecordSchema = z.object({
  id: z.number(),
  timestamp: z.union([z.date(), z.string()]),
  provider: z.string(),
  appId: z.number(),
  chatId: z.number(),
  messageId: z.number().nullable(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  toolTokens: z.number(),
  inputCost: z.number(),
  outputCost: z.number(),
  totalCost: z.number(),
  model: z.string(),
});

export type CostRecord = z.infer<typeof CostRecordSchema>;

export const CostSummarySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]),
  totalCost: z.number(),
  budgetLimit: z.number(),
  usagePercentage: z.number(),
  byModel: z.record(z.string(), z.number()),
  byProvider: z.record(z.string(), z.number()),
  byApp: z.record(z.string(), z.number()),
});

export type CostSummary = z.infer<typeof CostSummarySchema>;

export const OptimizationMetricsSchema = z.object({
  totalTokens: z.number(),
  tokensSaved: z.number(),
  reductionPercentage: z.number(),
  costSaved: z.number(),
  byProvider: z.record(z.string(), z.number()),
  byApp: z.record(z.string(), z.number()),
});

export type OptimizationMetrics = z.infer<typeof OptimizationMetricsSchema>;

export const MessagePrioritySchema = z.object({
  messageId: z.number(),
  score: z.number(),
  factors: z.object({
    recency: z.number(),
    userInteraction: z.number(),
    semanticRelevance: z.number(),
    referenceCount: z.number(),
  }),
  isPinned: z.boolean(),
  isProtected: z.boolean(),
});

export type MessagePriority = z.infer<typeof MessagePrioritySchema>;

// =============================================================================
// Token Optimization Contracts
// =============================================================================

export const tokenOptimizationContracts = {
  getConfig: defineContract({
    channel: "token-optimization:get-config",
    input: z.number().optional(), // appId
    output: TokenOptimizationConfigSchema,
  }),
  updateConfig: defineContract({
    channel: "token-optimization:update-config",
    input: z.object({
      config: TokenOptimizationConfigSchema.partial(),
      appId: z.number().optional(),
    }),
    output: z.void(),
  }),
  resetConfig: defineContract({
    channel: "token-optimization:reset-config",
    input: z.number().optional(), // appId
    output: z.void(),
  }),
  getCosts: defineContract({
    channel: "token-optimization:get-costs",
    input: z.object({
      startDate: z.union([z.date(), z.string()]).optional(),
      endDate: z.union([z.date(), z.string()]).optional(),
      appId: z.number().optional(),
      chatId: z.number().optional(),
      provider: z.string().optional(),
    }),
    output: z.array(CostRecordSchema),
  }),
  getCostSummary: defineContract({
    channel: "token-optimization:get-cost-summary",
    input: z.object({
      period: z.enum(["daily", "weekly", "monthly"]),
      appId: z.number().optional(),
    }),
    output: CostSummarySchema,
  }),
  exportCosts: defineContract({
    channel: "token-optimization:export-costs",
    input: z.object({
      format: z.enum(["csv", "json"]),
      startDate: z.union([z.date(), z.string()]).optional(),
      endDate: z.union([z.date(), z.string()]).optional(),
    }),
    output: z.string(), // filepath
  }),
  pinMessage: defineContract({
    channel: "token-optimization:pin-message",
    input: z.number(), // messageId
    output: z.void(),
  }),
  unpinMessage: defineContract({
    channel: "token-optimization:unpin-message",
    input: z.number(), // messageId
    output: z.void(),
  }),
  getMessagePriority: defineContract({
    channel: "token-optimization:get-message-priority",
    input: z.number(), // messageId
    output: MessagePrioritySchema,
  }),
  getMetrics: defineContract({
    channel: "token-optimization:get-metrics",
    input: z.object({
      startDate: z.union([z.date(), z.string()]).optional(),
      endDate: z.union([z.date(), z.string()]).optional(),
      appId: z.number().optional(),
    }),
    output: OptimizationMetricsSchema,
  }),
  exportAnalytics: defineContract({
    channel: "token-optimization:export-analytics",
    input: z.object({
      format: z.enum(["json"]),
      startDate: z.union([z.date(), z.string()]).optional(),
      endDate: z.union([z.date(), z.string()]).optional(),
    }),
    output: z.string(), // filepath
  }),
  estimateNextMessageCost: defineContract({
    channel: "token-optimization:estimate-cost",
    input: z.object({
      chatId: z.number(),
      input: z.string(),
    }),
    output: z.object({
      inputTokens: z.number(),
      estimatedOutputTokens: z.number(),
      estimatedTotalCost: z.number(),
      model: z.string(),
      currency: z.string(),
    }),
  }),
};

import { createClient } from "../contracts/core";
export const tokenOptimizationClient = createClient(tokenOptimizationContracts);
