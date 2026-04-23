// Analytics Engine
// Feature: token-optimization
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7

import { db } from "@/db";
import { costRecords, apps, chats } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type { OptimizationMetrics, PruningResult } from "./types";
import type { Period } from "./cost_tracker";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * Metrics Parameters
 */
export interface MetricsParams {
  startDate?: Date;
  endDate?: Date;
  appId?: number;
}

/**
 * Token Usage Metrics
 */
export interface TokenUsageMetrics {
  total: number;
  byProvider: Record<string, number>;
  byApp: Record<number, number>;
  saved: number;
}

/**
 * Effectiveness Metrics
 */
export interface EffectivenessMetrics {
  averageReduction: number; // Percentage
  strategyBreakdown: Record<string, number>;
}

/**
 * High Consumption Item
 */
export interface HighConsumptionItem {
  chatId: number;
  appId: number;
  totalTokens: number;
  totalCost: number;
}

/**
 * Trend Data Point
 */
export interface TrendDataPoint {
  timestamp: Date;
  tokens: number;
  cost: number;
}

/**
 * Trend Data
 */
export interface TrendData {
  period: Period;
  dataPoints: TrendDataPoint[];
}

/**
 * Export Parameters
 */
export interface ExportParams {
  format: "csv" | "json";
  startDate?: Date;
  endDate?: Date;
  appId?: number;
}

/**
 * Collect comprehensive optimization metrics
 * Validates: Requirements 6.1, 6.2
 *
 * @param params - Metrics query parameters
 * @returns Optimization metrics including token usage, costs, and effectiveness
 */
export async function collectMetrics(
  params: MetricsParams,
): Promise<OptimizationMetrics> {
  // Validate date range
  if (params.startDate && params.endDate && params.startDate > params.endDate) {
    throw new DyadError(
      "Start date must be before or equal to end date",
      DyadErrorKind.Validation,
    );
  }

  // Build query conditions
  const conditions = [];
  if (params.startDate) {
    conditions.push(gte(costRecords.timestamp, params.startDate));
  }
  if (params.endDate) {
    conditions.push(lte(costRecords.timestamp, params.endDate));
  }
  if (params.appId !== undefined) {
    conditions.push(eq(costRecords.appId, params.appId));
  }

  try {
    // Query cost records
    const records =
      conditions.length > 0
        ? db
            .select()
            .from(costRecords)
            .where(and(...conditions))
            .all()
        : db.select().from(costRecords).all();

    // Calculate token usage metrics
    const tokenUsage = calculateTokenUsageFromRecords(records);

    // Calculate cost metrics
    const costs = calculateCostMetricsFromRecords(records);

    // Calculate pruning effectiveness (placeholder - would need pruning history)
    const pruningEffectiveness: EffectivenessMetrics = {
      averageReduction: 0,
      strategyBreakdown: {},
    };

    // Identify high consumption conversations
    const highConsumptionConversations =
      identifyHighConsumptionFromRecords(records);

    return {
      period: {
        start: params.startDate || new Date(0),
        end: params.endDate || new Date(),
      },
      tokenUsage,
      costs,
      pruningEffectiveness,
      highConsumptionConversations,
    };
  } catch (error) {
    if (error instanceof DyadError) {
      throw error;
    }
    throw new DyadError(
      `Failed to collect metrics: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.Internal,
    );
  }
}

/**
 * Calculate token usage metrics for a date range
 * Validates: Requirements 6.2
 *
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Token usage metrics
 */
export function calculateTokenUsage(
  startDate: Date,
  endDate: Date,
): TokenUsageMetrics {
  // Validate date range
  if (startDate > endDate) {
    throw new DyadError(
      "Start date must be before or equal to end date",
      DyadErrorKind.Validation,
    );
  }

  try {
    // Query cost records in date range
    const records = db
      .select()
      .from(costRecords)
      .where(
        and(
          gte(costRecords.timestamp, startDate),
          lte(costRecords.timestamp, endDate),
        ),
      )
      .all();

    return calculateTokenUsageFromRecords(records);
  } catch (error) {
    throw new DyadError(
      `Failed to calculate token usage: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.Internal,
    );
  }
}

/**
 * Calculate pruning effectiveness from pruning results
 * Validates: Requirements 6.4
 *
 * @param pruningResults - Array of pruning results
 * @returns Effectiveness metrics
 */
export function calculatePruningEffectiveness(
  pruningResults: PruningResult[],
): EffectivenessMetrics {
  if (pruningResults.length === 0) {
    return {
      averageReduction: 0,
      strategyBreakdown: {},
    };
  }

  // Calculate effectiveness for each pruning result
  const effectivenessValues: number[] = [];
  const strategyBreakdown: Record<string, number[]> = {};

  for (const result of pruningResults) {
    // Calculate effectiveness: (tokensRemoved / originalTokens) × 100
    // Handle edge case where originalTokens is 0
    const originalTokens =
      result.tokensRemoved + (result.prunedMessageCount > 0 ? 1 : 0); // Avoid division by zero
    const effectiveness =
      originalTokens > 0 ? (result.tokensRemoved / originalTokens) * 100 : 0;

    // Clamp to [0, 100] range
    const clampedEffectiveness = Math.max(0, Math.min(100, effectiveness));

    effectivenessValues.push(clampedEffectiveness);

    // Track by strategy
    if (!strategyBreakdown[result.strategy]) {
      strategyBreakdown[result.strategy] = [];
    }
    strategyBreakdown[result.strategy].push(clampedEffectiveness);
  }

  // Calculate average reduction
  const averageReduction =
    effectivenessValues.reduce((sum, val) => sum + val, 0) /
    effectivenessValues.length;

  // Calculate average for each strategy
  const strategyAverages: Record<string, number> = {};
  for (const [strategy, values] of Object.entries(strategyBreakdown)) {
    strategyAverages[strategy] =
      values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  return {
    averageReduction: Number(averageReduction.toFixed(2)),
    strategyBreakdown: strategyAverages,
  };
}

/**
 * Identify conversations with high token consumption
 * Validates: Requirements 6.3
 *
 * @param threshold - Token count threshold for high consumption
 * @returns Array of high consumption items
 */
export function identifyHighConsumption(
  threshold: number,
): HighConsumptionItem[] {
  // Validate threshold
  if (threshold < 0) {
    throw new DyadError(
      "Threshold must be non-negative",
      DyadErrorKind.Validation,
    );
  }

  if (!Number.isInteger(threshold)) {
    throw new DyadError(
      "Threshold must be an integer",
      DyadErrorKind.Validation,
    );
  }

  try {
    // Query all cost records
    const records = db.select().from(costRecords).all();

    return identifyHighConsumptionFromRecords(records, threshold);
  } catch (error) {
    throw new DyadError(
      `Failed to identify high consumption: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.Internal,
    );
  }
}

/**
 * Generate trend data for a time period
 * Validates: Requirements 6.2, 6.5
 *
 * @param period - Time period (daily, weekly, monthly)
 * @returns Trend data with time-series data points
 */
export function generateTrendData(period: Period): TrendData {
  try {
    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date(now);

    switch (period) {
      case "daily":
        // Last 24 hours
        startDate.setHours(now.getHours() - 24);
        break;
      case "weekly":
        // Last 7 days
        startDate.setDate(now.getDate() - 7);
        break;
      case "monthly":
        // Last 30 days
        startDate.setDate(now.getDate() - 30);
        break;
    }

    // Query cost records in range
    const records = db
      .select()
      .from(costRecords)
      .where(gte(costRecords.timestamp, startDate))
      .all();

    // Group records by time bucket
    const dataPoints = aggregateByTimePeriod(records, period);

    return {
      period,
      dataPoints,
    };
  } catch (error) {
    throw new DyadError(
      `Failed to generate trend data: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.Internal,
    );
  }
}

/**
 * Export analytics data to file
 * Validates: Requirements 6.6, 6.7
 *
 * @param params - Export parameters
 * @returns File path to exported file
 */
export async function exportAnalytics(params: ExportParams): Promise<string> {
  try {
    // Collect metrics
    const metrics = await collectMetrics({
      startDate: params.startDate,
      endDate: params.endDate,
      appId: params.appId,
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `analytics-export-${timestamp}.${params.format}`;
    const filepath = path.join(os.tmpdir(), filename);

    if (params.format === "csv") {
      // Generate CSV content
      const csvContent = generateCSVFromMetrics(metrics);
      await fs.writeFile(filepath, csvContent, "utf-8");
    } else if (params.format === "json") {
      // Generate JSON content
      const jsonContent = JSON.stringify(metrics, null, 2);
      await fs.writeFile(filepath, jsonContent, "utf-8");
    } else {
      throw new DyadError(
        `Unsupported export format: ${params.format}`,
        DyadErrorKind.Validation,
      );
    }

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
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate token usage metrics from cost records
 */
function calculateTokenUsageFromRecords(
  records: Array<{
    inputTokens: number;
    outputTokens: number;
    provider: string;
    appId: number;
  }>,
): TokenUsageMetrics {
  let total = 0;
  const byProvider: Record<string, number> = {};
  const byApp: Record<number, number> = {};

  for (const record of records) {
    const tokens = record.inputTokens + record.outputTokens;
    total += tokens;

    // By provider
    if (!byProvider[record.provider]) {
      byProvider[record.provider] = 0;
    }
    byProvider[record.provider] += tokens;

    // By app
    if (!byApp[record.appId]) {
      byApp[record.appId] = 0;
    }
    byApp[record.appId] += tokens;
  }

  return {
    total,
    byProvider,
    byApp,
    saved: 0, // Would need pruning history to calculate
  };
}

/**
 * Calculate cost metrics from cost records
 */
function calculateCostMetricsFromRecords(
  records: Array<{
    totalCost: number;
    provider: string;
    appId: number;
  }>,
): {
  total: number;
  byProvider: Record<string, number>;
  byApp: Record<number, number>;
  saved: number;
} {
  let total = 0;
  const byProvider: Record<string, number> = {};
  const byApp: Record<number, number> = {};

  for (const record of records) {
    total += record.totalCost;

    // By provider
    if (!byProvider[record.provider]) {
      byProvider[record.provider] = 0;
    }
    byProvider[record.provider] += record.totalCost;

    // By app
    if (!byApp[record.appId]) {
      byApp[record.appId] = 0;
    }
    byApp[record.appId] += record.totalCost;
  }

  // Round to 6 decimal places
  total = Number(total.toFixed(6));
  for (const provider in byProvider) {
    byProvider[provider] = Number(byProvider[provider].toFixed(6));
  }
  for (const appId in byApp) {
    byApp[appId] = Number(byApp[appId].toFixed(6));
  }

  return {
    total,
    byProvider,
    byApp,
    saved: 0, // Would need pruning history to calculate
  };
}

/**
 * Identify high consumption conversations from records
 */
function identifyHighConsumptionFromRecords(
  records: Array<{
    chatId: number;
    appId: number;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  }>,
  threshold: number = 100000, // Default threshold
): HighConsumptionItem[] {
  // Group by chat
  const chatMap = new Map<
    number,
    { appId: number; totalTokens: number; totalCost: number }
  >();

  for (const record of records) {
    const existing = chatMap.get(record.chatId);
    const tokens = record.inputTokens + record.outputTokens;

    if (existing) {
      existing.totalTokens += tokens;
      existing.totalCost += record.totalCost;
    } else {
      chatMap.set(record.chatId, {
        appId: record.appId,
        totalTokens: tokens,
        totalCost: record.totalCost,
      });
    }
  }

  // Filter by threshold and convert to array
  const highConsumption: HighConsumptionItem[] = [];
  for (const [chatId, data] of chatMap.entries()) {
    if (data.totalTokens >= threshold) {
      highConsumption.push({
        chatId,
        appId: data.appId,
        totalTokens: data.totalTokens,
        totalCost: Number(data.totalCost.toFixed(6)),
      });
    }
  }

  // Sort by total tokens descending
  highConsumption.sort((a, b) => b.totalTokens - a.totalTokens);

  return highConsumption;
}

/**
 * Aggregate records by time period
 */
function aggregateByTimePeriod(
  records: Array<{
    timestamp: Date;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  }>,
  period: Period,
): TrendDataPoint[] {
  // Determine bucket size in milliseconds
  let bucketSize: number;
  switch (period) {
    case "daily":
      bucketSize = 60 * 60 * 1000; // 1 hour buckets
      break;
    case "weekly":
      bucketSize = 24 * 60 * 60 * 1000; // 1 day buckets
      break;
    case "monthly":
      bucketSize = 24 * 60 * 60 * 1000; // 1 day buckets
      break;
  }

  // Group records into buckets
  const buckets = new Map<
    number,
    { tokens: number; cost: number; timestamp: Date }
  >();

  for (const record of records) {
    const bucketKey =
      Math.floor(record.timestamp.getTime() / bucketSize) * bucketSize;

    const existing = buckets.get(bucketKey);
    const tokens = record.inputTokens + record.outputTokens;

    if (existing) {
      existing.tokens += tokens;
      existing.cost += record.totalCost;
    } else {
      buckets.set(bucketKey, {
        tokens,
        cost: record.totalCost,
        timestamp: new Date(bucketKey),
      });
    }
  }

  // Convert to array and sort by timestamp
  const dataPoints: TrendDataPoint[] = Array.from(buckets.values())
    .map((bucket) => ({
      timestamp: bucket.timestamp,
      tokens: bucket.tokens,
      cost: Number(bucket.cost.toFixed(6)),
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return dataPoints;
}

/**
 * Generate CSV content from metrics
 */
function generateCSVFromMetrics(metrics: OptimizationMetrics): string {
  const lines: string[] = [];

  // Header
  lines.push("# Token Optimization Analytics Report");
  lines.push(
    `# Period: ${metrics.period.start.toISOString()} to ${metrics.period.end.toISOString()}`,
  );
  lines.push("");

  // Token Usage Summary
  lines.push("## Token Usage");
  lines.push("Category,Value");
  lines.push(`Total Tokens,${metrics.tokenUsage.total}`);
  lines.push(`Tokens Saved,${metrics.tokenUsage.saved}`);
  lines.push("");

  // Token Usage by Provider
  lines.push("## Token Usage by Provider");
  lines.push("Provider,Tokens");
  for (const [provider, tokens] of Object.entries(
    metrics.tokenUsage.byProvider,
  )) {
    lines.push(`${provider},${tokens}`);
  }
  lines.push("");

  // Cost Summary
  lines.push("## Cost Summary");
  lines.push("Category,Value (USD)");
  lines.push(`Total Cost,${metrics.costs.total}`);
  lines.push(`Cost Saved,${metrics.costs.saved}`);
  lines.push("");

  // Cost by Provider
  lines.push("## Cost by Provider");
  lines.push("Provider,Cost (USD)");
  for (const [provider, cost] of Object.entries(metrics.costs.byProvider)) {
    lines.push(`${provider},${cost}`);
  }
  lines.push("");

  // Pruning Effectiveness
  lines.push("## Pruning Effectiveness");
  lines.push(
    `Average Reduction,${metrics.pruningEffectiveness.averageReduction}%`,
  );
  lines.push("");
  lines.push("Strategy,Average Reduction (%)");
  for (const [strategy, reduction] of Object.entries(
    metrics.pruningEffectiveness.strategyBreakdown,
  )) {
    lines.push(`${strategy},${reduction}`);
  }
  lines.push("");

  // High Consumption Conversations
  lines.push("## High Consumption Conversations");
  lines.push("Chat ID,App ID,Total Tokens,Total Cost (USD)");
  for (const item of metrics.highConsumptionConversations) {
    lines.push(
      `${item.chatId},${item.appId},${item.totalTokens},${item.totalCost}`,
    );
  }

  return lines.join("\n");
}
