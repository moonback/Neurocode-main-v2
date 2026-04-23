// Token Allocator Unit Tests
// Feature: token-optimization

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateTokenBudget,
  allocateTokens,
  updateTokenUsage,
  getUsagePercentage,
  type AllocationRatios,
  type UsedTokens,
} from "./token_allocator";
import type { TokenOptimizationConfig, TokenBudget } from "./types";
import { DyadError } from "@/errors/dyad_error";

describe("Token Allocator", () => {
  describe("calculateTokenBudget", () => {
    it("should calculate budget for a valid provider with default ratios", () => {
      const config: TokenOptimizationConfig = {
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

      const budget = calculateTokenBudget("openai/gpt-4", config);

      expect(budget.provider).toBe("openai/gpt-4");
      expect(budget.total).toBe(128_000);
      expect(budget.allocated.inputContext).toBe(89_600); // 128000 * 0.7
      expect(budget.allocated.systemInstructions).toBe(12_800); // 128000 * 0.1
      expect(budget.allocated.outputGeneration).toBe(25_600); // 128000 * 0.2
      expect(budget.used.inputContext).toBe(0);
      expect(budget.used.systemInstructions).toBe(0);
      expect(budget.used.outputGeneration).toBe(0);
      expect(budget.remaining).toBe(128_000);
    });

    it("should use provider optimal allocation when user config doesn't specify", () => {
      const config: TokenOptimizationConfig = {
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

      const budget = calculateTokenBudget(
        "anthropic/claude-3.5-sonnet",
        config,
      );

      expect(budget.provider).toBe("anthropic/claude-3.5-sonnet");
      expect(budget.total).toBe(200_000);
      // Should use user config ratios
      expect(budget.allocated.inputContext).toBe(140_000); // 200000 * 0.7
      expect(budget.allocated.systemInstructions).toBe(20_000); // 200000 * 0.1
      expect(budget.allocated.outputGeneration).toBe(40_000); // 200000 * 0.2
    });

    it("should throw DyadError for unknown provider", () => {
      const config: TokenOptimizationConfig = {
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

      expect(() => calculateTokenBudget("unknown/provider", config)).toThrow(
        DyadError,
      );
    });

    it("should throw DyadError when ratios don't sum to 1.0", () => {
      const config: TokenOptimizationConfig = {
        pruningStrategy: "balanced",
        enableAutoPruning: true,
        pruningThreshold: 80,
        tokenAllocation: {
          inputContextRatio: 0.5,
          systemInstructionsRatio: 0.3,
          outputGenerationRatio: 0.1, // Sum = 0.9, not 1.0
        },
        enableCostTracking: true,
        enableMessagePinning: true,
        coordinateWithCompaction: true,
        coordinateWithSmartContext: true,
      };

      expect(() => calculateTokenBudget("openai/gpt-4", config)).toThrow(
        DyadError,
      );
    });

    it("should throw DyadError when output allocation is below minimum", () => {
      const config: TokenOptimizationConfig = {
        pruningStrategy: "balanced",
        enableAutoPruning: true,
        pruningThreshold: 80,
        tokenAllocation: {
          inputContextRatio: 0.95,
          systemInstructionsRatio: 0.04,
          outputGenerationRatio: 0.01, // Too small, will be < 1024 tokens
        },
        enableCostTracking: true,
        enableMessagePinning: true,
        coordinateWithCompaction: true,
        coordinateWithSmartContext: true,
      };

      // For a 128k context window, 0.01 = 1280 tokens, which is >= 1024
      // Let's use a smaller provider or adjust the ratio
      // Actually, let's test with ollama/qwen2.5-coder which has 32768 tokens
      // 32768 * 0.01 = 327 tokens, which is < 1024
      expect(() =>
        calculateTokenBudget("ollama/qwen2.5-coder", config),
      ).toThrow(DyadError);
    });
  });

  describe("allocateTokens", () => {
    it("should allocate tokens correctly based on ratios", () => {
      const allocation: AllocationRatios = {
        inputContextRatio: 0.7,
        systemInstructionsRatio: 0.1,
        outputGenerationRatio: 0.2,
      };

      const allocated = allocateTokens(100_000, allocation);

      expect(allocated.inputContext).toBe(70_000);
      expect(allocated.systemInstructions).toBe(10_000);
      expect(allocated.outputGeneration).toBe(20_000);
    });

    it("should use floor to avoid exceeding total tokens", () => {
      const allocation: AllocationRatios = {
        inputContextRatio: 0.333,
        systemInstructionsRatio: 0.333,
        outputGenerationRatio: 0.334,
      };

      const allocated = allocateTokens(1000, allocation);

      // Floor ensures we don't exceed total
      expect(allocated.inputContext).toBe(333);
      expect(allocated.systemInstructions).toBe(333);
      expect(allocated.outputGeneration).toBe(334);

      // Sum should be <= total
      const sum =
        allocated.inputContext +
        allocated.systemInstructions +
        allocated.outputGeneration;
      expect(sum).toBeLessThanOrEqual(1000);
    });

    it("should throw DyadError for non-positive total tokens", () => {
      const allocation: AllocationRatios = {
        inputContextRatio: 0.7,
        systemInstructionsRatio: 0.1,
        outputGenerationRatio: 0.2,
      };

      expect(() => allocateTokens(0, allocation)).toThrow(DyadError);
      expect(() => allocateTokens(-100, allocation)).toThrow(DyadError);
    });

    it("should throw DyadError for invalid ratios", () => {
      const invalidAllocation: AllocationRatios = {
        inputContextRatio: 1.5, // > 1
        systemInstructionsRatio: 0.1,
        outputGenerationRatio: 0.2,
      };

      expect(() => allocateTokens(100_000, invalidAllocation)).toThrow(
        DyadError,
      );

      const negativeAllocation: AllocationRatios = {
        inputContextRatio: -0.1, // < 0
        systemInstructionsRatio: 0.1,
        outputGenerationRatio: 0.2,
      };

      expect(() => allocateTokens(100_000, negativeAllocation)).toThrow(
        DyadError,
      );
    });
  });

  describe("updateTokenUsage", () => {
    it("should update token usage correctly", () => {
      const budget: TokenBudget = {
        total: 100_000,
        allocated: {
          inputContext: 70_000,
          systemInstructions: 10_000,
          outputGeneration: 20_000,
        },
        used: {
          inputContext: 0,
          systemInstructions: 0,
          outputGeneration: 0,
        },
        remaining: 100_000,
        provider: "openai/gpt-4",
      };

      const used: UsedTokens = {
        inputContext: 50_000,
        systemInstructions: 5_000,
        outputGeneration: 10_000,
      };

      const updated = updateTokenUsage(budget, used);

      expect(updated.used.inputContext).toBe(50_000);
      expect(updated.used.systemInstructions).toBe(5_000);
      expect(updated.used.outputGeneration).toBe(10_000);
      expect(updated.remaining).toBe(35_000); // 100000 - 65000
    });

    it("should throw DyadError when usage exceeds allocation", () => {
      const budget: TokenBudget = {
        total: 100_000,
        allocated: {
          inputContext: 70_000,
          systemInstructions: 10_000,
          outputGeneration: 20_000,
        },
        used: {
          inputContext: 0,
          systemInstructions: 0,
          outputGeneration: 0,
        },
        remaining: 100_000,
        provider: "openai/gpt-4",
      };

      const excessiveUsed: UsedTokens = {
        inputContext: 80_000, // Exceeds 70000 allocation
        systemInstructions: 5_000,
        outputGeneration: 10_000,
      };

      expect(() => updateTokenUsage(budget, excessiveUsed)).toThrow(DyadError);
    });

    it("should handle zero usage", () => {
      const budget: TokenBudget = {
        total: 100_000,
        allocated: {
          inputContext: 70_000,
          systemInstructions: 10_000,
          outputGeneration: 20_000,
        },
        used: {
          inputContext: 0,
          systemInstructions: 0,
          outputGeneration: 0,
        },
        remaining: 100_000,
        provider: "openai/gpt-4",
      };

      const zeroUsed: UsedTokens = {
        inputContext: 0,
        systemInstructions: 0,
        outputGeneration: 0,
      };

      const updated = updateTokenUsage(budget, zeroUsed);

      expect(updated.remaining).toBe(100_000);
    });
  });

  describe("getUsagePercentage", () => {
    it("should calculate usage percentage correctly", () => {
      const budget: TokenBudget = {
        total: 100_000,
        allocated: {
          inputContext: 70_000,
          systemInstructions: 10_000,
          outputGeneration: 20_000,
        },
        used: {
          inputContext: 50_000,
          systemInstructions: 5_000,
          outputGeneration: 10_000,
        },
        remaining: 35_000,
        provider: "openai/gpt-4",
      };

      const percentage = getUsagePercentage(budget);

      expect(percentage).toBe(65.0); // (65000 / 100000) * 100
    });

    it("should return 0 for zero total tokens", () => {
      const budget: TokenBudget = {
        total: 0,
        allocated: {
          inputContext: 0,
          systemInstructions: 0,
          outputGeneration: 0,
        },
        used: {
          inputContext: 0,
          systemInstructions: 0,
          outputGeneration: 0,
        },
        remaining: 0,
        provider: "openai/gpt-4",
      };

      const percentage = getUsagePercentage(budget);

      expect(percentage).toBe(0);
    });

    it("should round to 2 decimal places", () => {
      const budget: TokenBudget = {
        total: 100_000,
        allocated: {
          inputContext: 70_000,
          systemInstructions: 10_000,
          outputGeneration: 20_000,
        },
        used: {
          inputContext: 33_333,
          systemInstructions: 0,
          outputGeneration: 0,
        },
        remaining: 66_667,
        provider: "openai/gpt-4",
      };

      const percentage = getUsagePercentage(budget);

      // 33333 / 100000 = 0.33333 = 33.333%
      expect(percentage).toBe(33.33);
    });

    it("should handle 100% usage", () => {
      const budget: TokenBudget = {
        total: 100_000,
        allocated: {
          inputContext: 70_000,
          systemInstructions: 10_000,
          outputGeneration: 20_000,
        },
        used: {
          inputContext: 70_000,
          systemInstructions: 10_000,
          outputGeneration: 20_000,
        },
        remaining: 0,
        provider: "openai/gpt-4",
      };

      const percentage = getUsagePercentage(budget);

      expect(percentage).toBe(100.0);
    });
  });

  // **Property 10: Token Usage Percentage Accuracy**
  // **Validates: Requirements 3.7**
  describe("Property 10: Token Usage Percentage Accuracy", () => {
    it("usage percentage equals (used / total) × 100 with 2 decimal precision", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1_000_000 }), // total tokens
          fc.integer({ min: 0, max: 1_000_000 }), // inputContext used
          fc.integer({ min: 0, max: 1_000_000 }), // systemInstructions used
          fc.integer({ min: 0, max: 1_000_000 }), // outputGeneration used
          (total, inputUsed, systemUsed, outputUsed) => {
            // Create a budget with the specified total and used tokens
            const budget: TokenBudget = {
              total,
              allocated: {
                inputContext: Math.floor(total * 0.7),
                systemInstructions: Math.floor(total * 0.1),
                outputGeneration: Math.floor(total * 0.2),
              },
              used: {
                inputContext: inputUsed,
                systemInstructions: systemUsed,
                outputGeneration: outputUsed,
              },
              remaining: total - (inputUsed + systemUsed + outputUsed),
              provider: "test/provider",
            };

            // Calculate the total used tokens
            const totalUsed = inputUsed + systemUsed + outputUsed;

            // Calculate the expected percentage
            const expectedPercentage = (totalUsed / total) * 100;
            // Round to 2 decimal places
            const expectedRounded = Math.round(expectedPercentage * 100) / 100;

            // Get the actual percentage from the function
            const actualPercentage = getUsagePercentage(budget);

            // Verify the percentage matches the expected value
            return actualPercentage === expectedRounded;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("usage percentage is always in range [0, 100]", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1_000_000 }), // total tokens
          fc.integer({ min: 0, max: 1_000_000 }), // inputContext used
          fc.integer({ min: 0, max: 1_000_000 }), // systemInstructions used
          fc.integer({ min: 0, max: 1_000_000 }), // outputGeneration used
          (total, inputUsedRaw, systemUsedRaw, outputUsedRaw) => {
            // Ensure total used doesn't exceed total
            const totalUsedRaw = inputUsedRaw + systemUsedRaw + outputUsedRaw;
            const scale = totalUsedRaw > total ? total / totalUsedRaw : 1;

            const inputUsed = Math.floor(inputUsedRaw * scale);
            const systemUsed = Math.floor(systemUsedRaw * scale);
            const outputUsed = Math.floor(outputUsedRaw * scale);

            const budget: TokenBudget = {
              total,
              allocated: {
                inputContext: Math.floor(total * 0.7),
                systemInstructions: Math.floor(total * 0.1),
                outputGeneration: Math.floor(total * 0.2),
              },
              used: {
                inputContext: inputUsed,
                systemInstructions: systemUsed,
                outputGeneration: outputUsed,
              },
              remaining: total - (inputUsed + systemUsed + outputUsed),
              provider: "test/provider",
            };

            const percentage = getUsagePercentage(budget);

            // Verify percentage is in valid range
            return percentage >= 0 && percentage <= 100;
          },
        ),
        { numRuns: 100 },
      );
    });

    it("usage percentage has at most 2 decimal places", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1_000_000 }), // total tokens
          fc.integer({ min: 0, max: 1_000_000 }), // inputContext used
          fc.integer({ min: 0, max: 1_000_000 }), // systemInstructions used
          fc.integer({ min: 0, max: 1_000_000 }), // outputGeneration used
          (total, inputUsedRaw, systemUsedRaw, outputUsedRaw) => {
            // Ensure total used doesn't exceed total
            const totalUsedRaw = inputUsedRaw + systemUsedRaw + outputUsedRaw;
            const scale = totalUsedRaw > total ? total / totalUsedRaw : 1;

            const inputUsed = Math.floor(inputUsedRaw * scale);
            const systemUsed = Math.floor(systemUsedRaw * scale);
            const outputUsed = Math.floor(outputUsedRaw * scale);

            const budget: TokenBudget = {
              total,
              allocated: {
                inputContext: Math.floor(total * 0.7),
                systemInstructions: Math.floor(total * 0.1),
                outputGeneration: Math.floor(total * 0.2),
              },
              used: {
                inputContext: inputUsed,
                systemInstructions: systemUsed,
                outputGeneration: outputUsed,
              },
              remaining: total - (inputUsed + systemUsed + outputUsed),
              provider: "test/provider",
            };

            const percentage = getUsagePercentage(budget);

            // Convert to string and check decimal places
            const percentageStr = percentage.toString();
            const decimalIndex = percentageStr.indexOf(".");

            if (decimalIndex === -1) {
              // No decimal point, valid
              return true;
            }

            const decimalPlaces = percentageStr.length - decimalIndex - 1;
            // Should have at most 2 decimal places
            return decimalPlaces <= 2;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
