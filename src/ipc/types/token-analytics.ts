import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";

// =============================================================================
// Token Analytics Schemas
// =============================================================================

export const GetTokenStatisticsParamsSchema = z.object({
  conversationId: z.string().optional(),
  skillName: z.string().optional(),
  modelType: z.string().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
});

export type GetTokenStatisticsParams = z.infer<
  typeof GetTokenStatisticsParamsSchema
>;

export const TokenStatisticsSchema = z.object({
  totalTokens: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  requestCount: z.number(),
  averageTokensPerRequest: z.number(),
  peakTokensPerRequest: z.number(),
  timeRange: z.object({
    start: z.number(),
    end: z.number(),
  }),
});

export type TokenStatistics = z.infer<typeof TokenStatisticsSchema>;

export const TopConsumerSchema = z.object({
  name: z.string(),
  totalTokens: z.number(),
  percentage: z.number(),
  requestCount: z.number(),
});

export type TopConsumer = z.infer<typeof TopConsumerSchema>;

export const GetTopConsumersParamsSchema = z.object({
  type: z.enum(["conversation", "skill", "model"]),
  limit: z.number().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
});

export type GetTopConsumersParams = z.infer<
  typeof GetTopConsumersParamsSchema
>;

export const GetTopConsumersResultSchema = z.array(TopConsumerSchema);

export const CostBreakdownSchema = z.object({
  totalCost: z.number(),
  byModel: z.record(
    z.string(),
    z.object({
      inputCost: z.number(),
      outputCost: z.number(),
      totalCost: z.number(),
      inputTokens: z.number(),
      outputTokens: z.number(),
    }),
  ),
  currency: z.string(),
});

export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;

export const CalculateCostParamsSchema = z.object({
  conversationId: z.string().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
});

export type CalculateCostParams = z.infer<typeof CalculateCostParamsSchema>;

export const ExportUsageDataParamsSchema = z.object({
  format: z.enum(["csv", "json"]),
  conversationId: z.string().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
});

export type ExportUsageDataParams = z.infer<
  typeof ExportUsageDataParamsSchema
>;

export const ExportUsageDataResultSchema = z.object({
  data: z.string(),
  filename: z.string(),
});

export type ExportUsageDataResult = z.infer<
  typeof ExportUsageDataResultSchema
>;

export const UsageOverTimeDataPointSchema = z.object({
  timestamp: z.number(),
  tokens: z.number(),
  requests: z.number(),
});

export type UsageOverTimeDataPoint = z.infer<
  typeof UsageOverTimeDataPointSchema
>;

export const GetUsageOverTimeParamsSchema = z.object({
  conversationId: z.string().optional(),
  granularity: z.enum(["hour", "day", "week", "month"]),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
});

export type GetUsageOverTimeParams = z.infer<
  typeof GetUsageOverTimeParamsSchema
>;

export const GetUsageOverTimeResultSchema = z.array(
  UsageOverTimeDataPointSchema,
);

// =============================================================================
// Token Analytics Contracts
// =============================================================================

export const tokenAnalyticsContracts = {
  getStatistics: defineContract({
    channel: "token-analytics:get-statistics",
    input: GetTokenStatisticsParamsSchema,
    output: TokenStatisticsSchema,
  }),

  getTopConsumers: defineContract({
    channel: "token-analytics:get-top-consumers",
    input: GetTopConsumersParamsSchema,
    output: GetTopConsumersResultSchema,
  }),

  calculateCost: defineContract({
    channel: "token-analytics:calculate-cost",
    input: CalculateCostParamsSchema,
    output: CostBreakdownSchema,
  }),

  exportUsageData: defineContract({
    channel: "token-analytics:export-data",
    input: ExportUsageDataParamsSchema,
    output: ExportUsageDataResultSchema,
  }),

  getUsageOverTime: defineContract({
    channel: "token-analytics:get-usage-over-time",
    input: GetUsageOverTimeParamsSchema,
    output: GetUsageOverTimeResultSchema,
  }),
};

// =============================================================================
// Token Analytics Client
// =============================================================================

export const tokenAnalyticsClient = createClient(tokenAnalyticsContracts);
