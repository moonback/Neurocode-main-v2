// Token Allocator Subsystem
// Feature: token-optimization
// Requirements: 3.2, 3.3, 3.5, 3.7

import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { getProviderConfig } from "./provider_registry";
import type { TokenOptimizationConfig, TokenBudget } from "./types";

/**
 * Allocation Ratios
 * Defines how tokens should be distributed across different purposes
 */
export interface AllocationRatios {
  inputContextRatio: number; // 0-1
  systemInstructionsRatio: number; // 0-1
  outputGenerationRatio: number; // 0-1
}

/**
 * Allocated Tokens
 * The actual token counts allocated to each purpose
 */
export interface AllocatedTokens {
  inputContext: number;
  systemInstructions: number;
  outputGeneration: number;
}

/**
 * Used Tokens
 * The actual token counts used for each purpose
 */
export interface UsedTokens {
  inputContext: number;
  systemInstructions: number;
  outputGeneration: number;
}

/**
 * Minimum token allocation for output generation to prevent truncated responses
 * Validates: Requirements 3.5
 */
const MINIMUM_OUTPUT_TOKENS = 1024;

/**
 * Calculate Token Budget
 * Validates: Requirements 3.2, 3.3
 *
 * Calculates the token budget for a conversation based on the provider's
 * context window and user-configured allocation ratios.
 *
 * @param provider - The provider identifier (e.g., "openai/gpt-4")
 * @param userConfig - User's token optimization configuration
 * @returns Token budget with allocated and used tokens
 * @throws DyadError with Validation kind if provider is unknown
 */
export function calculateTokenBudget(
  provider: string,
  userConfig: TokenOptimizationConfig,
): TokenBudget {
  // Get provider configuration (throws DyadError if provider not found)
  const providerConfig = getProviderConfig(provider);

  const totalTokens = providerConfig.contextWindow;

  // Use user-configured ratios if available, otherwise use provider optimal
  const allocation =
    userConfig.tokenAllocation || providerConfig.optimalAllocation;

  // Validate that ratios sum to approximately 1.0 (allow small floating point errors)
  const ratioSum =
    allocation.inputContextRatio +
    allocation.systemInstructionsRatio +
    allocation.outputGenerationRatio;

  if (Math.abs(ratioSum - 1.0) > 0.01) {
    throw new DyadError(
      `Token allocation ratios must sum to 1.0, got ${ratioSum.toFixed(3)}`,
      DyadErrorKind.Validation,
    );
  }

  // Allocate tokens based on ratios
  const allocated = allocateTokens(totalTokens, allocation);

  // Validate minimum output allocation (Requirement 3.5)
  if (allocated.outputGeneration < MINIMUM_OUTPUT_TOKENS) {
    throw new DyadError(
      `Output generation allocation (${allocated.outputGeneration}) is below minimum threshold (${MINIMUM_OUTPUT_TOKENS})`,
      DyadErrorKind.Validation,
    );
  }

  return {
    total: totalTokens,
    allocated,
    used: {
      inputContext: 0,
      systemInstructions: 0,
      outputGeneration: 0,
    },
    remaining: totalTokens,
    provider,
  };
}

/**
 * Allocate Tokens
 * Validates: Requirements 3.2, 3.3
 *
 * Distributes total tokens across input context, system instructions, and
 * output generation based on allocation ratios.
 *
 * @param totalTokens - Total tokens available
 * @param allocation - Allocation ratios for each purpose
 * @returns Allocated token counts
 * @throws DyadError with Validation kind if inputs are invalid
 */
export function allocateTokens(
  totalTokens: number,
  allocation: AllocationRatios,
): AllocatedTokens {
  // Validate inputs
  if (totalTokens <= 0) {
    throw new DyadError(
      `Total tokens must be positive, got ${totalTokens}`,
      DyadErrorKind.Validation,
    );
  }

  if (
    allocation.inputContextRatio < 0 ||
    allocation.inputContextRatio > 1 ||
    allocation.systemInstructionsRatio < 0 ||
    allocation.systemInstructionsRatio > 1 ||
    allocation.outputGenerationRatio < 0 ||
    allocation.outputGenerationRatio > 1
  ) {
    throw new DyadError(
      "Allocation ratios must be between 0 and 1",
      DyadErrorKind.Validation,
    );
  }

  // Calculate allocated tokens using floor to ensure we don't exceed total
  const inputContext = Math.floor(totalTokens * allocation.inputContextRatio);
  const systemInstructions = Math.floor(
    totalTokens * allocation.systemInstructionsRatio,
  );
  const outputGeneration = Math.floor(
    totalTokens * allocation.outputGenerationRatio,
  );

  return {
    inputContext,
    systemInstructions,
    outputGeneration,
  };
}

/**
 * Update Token Usage
 * Validates: Requirements 3.2, 3.3
 *
 * Updates the token budget with actual usage and recalculates remaining tokens.
 *
 * @param budget - Current token budget
 * @param used - Tokens used for each purpose
 * @returns Updated token budget
 * @throws DyadError with Validation kind if usage exceeds allocation
 */
export function updateTokenUsage(
  budget: TokenBudget,
  used: UsedTokens,
): TokenBudget {
  // Validate that used tokens don't exceed allocated tokens
  if (used.inputContext > budget.allocated.inputContext) {
    throw new DyadError(
      `Input context usage (${used.inputContext}) exceeds allocation (${budget.allocated.inputContext})`,
      DyadErrorKind.Validation,
    );
  }

  if (used.systemInstructions > budget.allocated.systemInstructions) {
    throw new DyadError(
      `System instructions usage (${used.systemInstructions}) exceeds allocation (${budget.allocated.systemInstructions})`,
      DyadErrorKind.Validation,
    );
  }

  if (used.outputGeneration > budget.allocated.outputGeneration) {
    throw new DyadError(
      `Output generation usage (${used.outputGeneration}) exceeds allocation (${budget.allocated.outputGeneration})`,
      DyadErrorKind.Validation,
    );
  }

  // Calculate total used tokens
  const totalUsed =
    used.inputContext + used.systemInstructions + used.outputGeneration;

  // Calculate remaining tokens
  const remaining = budget.total - totalUsed;

  return {
    ...budget,
    used,
    remaining,
  };
}

/**
 * Get Usage Percentage
 * Validates: Requirements 3.7
 *
 * Calculates the percentage of tokens used relative to the total budget.
 *
 * @param budget - Current token budget
 * @returns Usage percentage (0-100) with 2 decimal precision
 */
export function getUsagePercentage(budget: TokenBudget): number {
  if (budget.total === 0) {
    return 0;
  }

  const totalUsed =
    budget.used.inputContext +
    budget.used.systemInstructions +
    budget.used.outputGeneration;

  const percentage = (totalUsed / budget.total) * 100;

  // Round to 2 decimal places for precision (Requirement 3.7)
  return Math.round(percentage * 100) / 100;
}
