// Cost Tracker
// Feature: token-optimization
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8

import { db } from "@/db";
import { costRecords, apps, chats } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getProviderConfig } from "./provider_registry";
import type { CostRecord } from "./types";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * Cost Calculation Result
 */
export interface CostCalculation {
  inputCost: number; // USD
  outputCost: number; // USD
  totalCost: number; // USD
}

/**
 * Cost Query Parameters
 */
export interface CostQueryParams {
  startDate?: Date;
  endDate?: Date;
  appId?: number;
  chatId?: number;
  provider?: string;
}

/**
 * Cost Summary Period
 */
export type Period = "daily" | "weekly" | "monthly";

/**
 * Cost Summary
 */
export interface CostSummary {
  total: number;
  byProvider: Record<string, number>;
  budget?: {
    amount: number;
    remaining: number;
  };
}

/**
 * Cost Budget
 */
export interface CostBudget {
  amount: number; // USD
  period: Period;
  warningThreshold: number; // Percentage (default: 80)
}

/**
 * Budget Status
 */
export interface BudgetStatus {
  currentSpend: number;
  budget: number;
  percentage: number;
  isWarning: boolean; // true if at 80% or 95%
  isExceeded: boolean; // true if >= 100%
  warningLevel?: 80 | 95; // which warning threshold was hit
}

/**
 * Export Parameters
 */
export interface ExportParams {
  format: "csv" | "json";
  startDate?: Date;
  endDate?: Date;
  appId?: number;
  chatId?: number;
  provider?: string;
}

/**
 * Calculate cost for token usage
 * Validates: Requirements 4.2, 4.4
 *
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param provider - Provider identifier (e.g., "openai/gpt-4")
 * @returns Cost calculation with input, output, and total costs in USD
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  provider: string,
): CostCalculation {
  // Validate inputs
  if (inputTokens < 0 || outputTokens < 0) {
    throw new DyadError(
      "Token counts must be non-negative",
      DyadErrorKind.Validation,
    );
  }

  if (!Number.isInteger(inputTokens) || !Number.isInteger(outputTokens)) {
    throw new DyadError(
      "Token counts must be integers",
      DyadErrorKind.Validation,
    );
  }

  // Get provider configuration
  const providerConfig = getProviderConfig(provider);

  // Calculate costs with 6 decimal precision
  // Formula: (tokens × pricePerMillion) / 1,000,000
  const inputCost =
    (inputTokens * providerConfig.pricing.inputTokensPerMillion) / 1_000_000;
  const outputCost =
    (outputTokens * providerConfig.pricing.outputTokensPerMillion) / 1_000_000;
  const totalCost = inputCost + outputCost;

  // Round to 6 decimal places to ensure precision
  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
  };
}

/**
 * Record cost to database
 * Validates: Requirements 4.1, 4.2
 *
 * @param costRecord - Cost record to persist (without id)
 */
export async function recordCost(
  costRecord: Omit<CostRecord, "id">,
): Promise<void> {
  // Validate required fields
  if (!costRecord.provider) {
    throw new DyadError("Provider is required", DyadErrorKind.Validation);
  }

  if (!costRecord.appId) {
    throw new DyadError("App ID is required", DyadErrorKind.Validation);
  }

  if (!costRecord.chatId) {
    throw new DyadError("Chat ID is required", DyadErrorKind.Validation);
  }

  if (!costRecord.model) {
    throw new DyadError("Model is required", DyadErrorKind.Validation);
  }

  // Validate token counts
  if (
    costRecord.inputTokens < 0 ||
    costRecord.outputTokens < 0 ||
    costRecord.toolTokens < 0 ||
    !Number.isInteger(costRecord.inputTokens) ||
    !Number.isInteger(costRecord.outputTokens) ||
    !Number.isInteger(costRecord.toolTokens)
  ) {
    throw new DyadError(
      "Token counts must be non-negative integers",
      DyadErrorKind.Validation,
    );
  }

  // Validate costs
  if (
    costRecord.inputCost < 0 ||
    costRecord.outputCost < 0 ||
    costRecord.totalCost < 0
  ) {
    throw new DyadError("Costs must be non-negative", DyadErrorKind.Validation);
  }

  // Verify app exists
  const app = db.select().from(apps).where(eq(apps.id, costRecord.appId)).get();
  if (!app) {
    throw new DyadError(
      `App not found: ${costRecord.appId}`,
      DyadErrorKind.NotFound,
    );
  }

  // Verify chat exists
  const chat = db
    .select()
    .from(chats)
    .where(eq(chats.id, costRecord.chatId))
    .get();
  if (!chat) {
    throw new DyadError(
      `Chat not found: ${costRecord.chatId}`,
      DyadErrorKind.NotFound,
    );
  }

  try {
    // Insert cost record
    db.insert(costRecords)
      .values({
        timestamp: costRecord.timestamp,
        provider: costRecord.provider,
        appId: costRecord.appId,
        chatId: costRecord.chatId,
        messageId: costRecord.messageId,
        inputTokens: costRecord.inputTokens,
        outputTokens: costRecord.outputTokens,
        toolTokens: costRecord.toolTokens,
        inputCost: costRecord.inputCost,
        outputCost: costRecord.outputCost,
        totalCost: costRecord.totalCost,
        model: costRecord.model,
      })
      .run();
  } catch (error) {
    throw new DyadError(
      `Failed to store cost record: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.Internal,
    );
  }
}

/**
 * Get costs with filtering
 * Validates: Requirements 4.3, 4.6
 *
 * @param params - Query parameters for filtering
 * @returns Array of cost records matching the filters
 */
export async function getCosts(params: CostQueryParams): Promise<CostRecord[]> {
  const conditions = [];

  // Build filter conditions
  if (params.startDate) {
    conditions.push(gte(costRecords.timestamp, params.startDate));
  }

  if (params.endDate) {
    conditions.push(lte(costRecords.timestamp, params.endDate));
  }

  if (params.appId !== undefined) {
    conditions.push(eq(costRecords.appId, params.appId));
  }

  if (params.chatId !== undefined) {
    conditions.push(eq(costRecords.chatId, params.chatId));
  }

  if (params.provider) {
    conditions.push(eq(costRecords.provider, params.provider));
  }

  try {
    // Query with filters
    const records =
      conditions.length > 0
        ? db
            .select()
            .from(costRecords)
            .where(and(...conditions))
            .orderBy(desc(costRecords.timestamp))
            .all()
        : db
            .select()
            .from(costRecords)
            .orderBy(desc(costRecords.timestamp))
            .all();

    return records;
  } catch (error) {
    throw new DyadError(
      `Failed to query cost records: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.Internal,
    );
  }
}

/**
 * Get cost summary for a period
 * Validates: Requirements 4.3, 4.7
 *
 * @param period - Time period (daily, weekly, monthly)
 * @param appId - Optional app ID to filter by
 * @returns Cost summary with total and breakdown by provider
 */
export async function getCostSummary(
  period: Period,
  appId?: number,
): Promise<CostSummary> {
  // Calculate date range based on period
  const now = new Date();
  const startDate = new Date(now);

  switch (period) {
    case "daily":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      // Start of week (Sunday)
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      // Start of month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
  }

  // Get costs for the period
  const costs = await getCosts({
    startDate,
    appId,
  });

  // Calculate total and breakdown by provider
  let total = 0;
  const byProvider: Record<string, number> = {};

  for (const cost of costs) {
    total += cost.totalCost;

    if (!byProvider[cost.provider]) {
      byProvider[cost.provider] = 0;
    }
    byProvider[cost.provider] += cost.totalCost;
  }

  // Round to 6 decimal places
  total = Number(total.toFixed(6));
  for (const provider in byProvider) {
    byProvider[provider] = Number(byProvider[provider].toFixed(6));
  }

  return {
    total,
    byProvider,
  };
}

/**
 * Check budget status and determine if warnings should be emitted
 * Validates: Requirements 4.5
 *
 * @param currentSpend - Current spending amount in USD
 * @param budget - Cost budget configuration
 * @returns Budget status with warning and exceeded flags
 */
export function checkBudget(
  currentSpend: number,
  budget: CostBudget,
): BudgetStatus {
  // Validate inputs
  if (currentSpend < 0) {
    throw new DyadError(
      "Current spend must be non-negative",
      DyadErrorKind.Validation,
    );
  }

  if (budget.amount <= 0) {
    throw new DyadError(
      "Budget amount must be positive",
      DyadErrorKind.Validation,
    );
  }

  // Calculate percentage with high precision
  const percentage = (currentSpend / budget.amount) * 100;

  // Check for warning thresholds (exactly 80% or 95%)
  const isAt80 = Math.abs(percentage - 80) < 0.01;
  const isAt95 = Math.abs(percentage - 95) < 0.01;
  const isWarning = isAt80 || isAt95;
  const warningLevel = isAt95 ? 95 : isAt80 ? 80 : undefined;

  // Check if budget is exceeded
  const isExceeded = percentage >= 100;

  return {
    currentSpend: Number(currentSpend.toFixed(6)),
    budget: budget.amount,
    percentage: Number(percentage.toFixed(2)),
    isWarning,
    isExceeded,
    warningLevel,
  };
}

/**
 * Export costs to CSV or JSON format
 * Validates: Requirements 4.7
 *
 * @param params - Export parameters including format and filters
 * @returns File path to the exported file
 */
export async function exportCosts(params: ExportParams): Promise<string> {
  // Get costs with filters
  const costs = await getCosts({
    startDate: params.startDate,
    endDate: params.endDate,
    appId: params.appId,
    chatId: params.chatId,
    provider: params.provider,
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `cost-export-${timestamp}.${params.format}`;
  const filepath = path.join(os.tmpdir(), filename);

  try {
    if (params.format === "csv") {
      // Generate CSV content
      const headers = [
        "ID",
        "Timestamp",
        "Provider",
        "App ID",
        "Chat ID",
        "Message ID",
        "Input Tokens",
        "Output Tokens",
        "Tool Tokens",
        "Input Cost",
        "Output Cost",
        "Total Cost",
        "Model",
      ];

      const rows = costs.map((cost) => [
        cost.id,
        cost.timestamp.toISOString(),
        cost.provider,
        cost.appId,
        cost.chatId,
        cost.messageId || "",
        cost.inputTokens,
        cost.outputTokens,
        cost.toolTokens,
        cost.inputCost.toFixed(6),
        cost.outputCost.toFixed(6),
        cost.totalCost.toFixed(6),
        cost.model,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      await fs.writeFile(filepath, csvContent, "utf-8");
    } else if (params.format === "json") {
      // Generate JSON content
      const jsonContent = JSON.stringify(costs, null, 2);
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
      `Failed to export costs: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.Internal,
    );
  }
}

/**
 * Get the current pricing for a model.
 */
export async function getModelPricing(model: string, provider: string) {
  // Normalize provider
  const providerId = provider.toLowerCase();

  const pricing = await db.query.providerPricing.findFirst({
    where: eq(providerPricing.providerId, providerId),
  });

  if (!pricing) {
    // Default pricing if not found
    return {
      inputTokensPerMillion: 10,
      outputTokensPerMillion: 30,
    };
  }

  return pricing;
}
