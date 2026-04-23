// Property-Based Tests for Minimum Output Allocation
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { calculateTokenBudget } from "../token_allocator";
import type { TokenOptimizationConfig } from "../types";

describe("Property 9: Minimum Output Allocation", () => {
  /**
   * **Validates: Requirements 3.5**
   *
   * Property: For any token budget calculation, the allocated tokens for output
   * generation SHALL be greater than or equal to a minimum threshold (1024 tokens)
   * to prevent truncated responses.
   */

  it("output generation allocation is always >= 1024 tokens for valid configurations", () => {
    // Generate valid allocation ratios that sum to 1.0
    // We need to ensure output ratio is high enough to meet minimum threshold
    // For smallest context window (32k), we need at least 1024/32768 ≈ 0.03125 ratio
    const allocationRatiosArb = fc
      .tuple(
        fc.double({ min: 0, max: 0.85, noNaN: true }),
        fc.double({ min: 0, max: 0.3, noNaN: true }),
        fc.double({ min: 0.05, max: 0.5, noNaN: true }), // Ensure output ratio is reasonable
      )
      .map(([a, b, c]) => {
        // Normalize to ensure they sum to 1.0
        const sum = a + b + c;
        return {
          inputContextRatio: a / sum,
          systemInstructionsRatio: b / sum,
          outputGenerationRatio: c / sum,
        };
      });

    // Generate provider IDs from the supported providers
    // We'll use a subset of common providers for testing
    const providerArb = fc.constantFrom(
      "openai/gpt-4",
      "openai/gpt-4o",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-1.5-pro",
      "azure/gpt-4o",
    );

    fc.assert(
      fc.property(providerArb, allocationRatiosArb, (provider, allocation) => {
        // Create a user config with the generated allocation ratios
        const userConfig: TokenOptimizationConfig = {
          pruningStrategy: "balanced",
          enableAutoPruning: true,
          pruningThreshold: 80,
          tokenAllocation: allocation,
          enableCostTracking: true,
          enableMessagePinning: true,
          coordinateWithCompaction: true,
          coordinateWithSmartContext: true,
        };

        // Calculate token budget
        const budget = calculateTokenBudget(provider, userConfig);

        // Verify that output generation allocation is >= 1024
        expect(budget.allocated.outputGeneration).toBeGreaterThanOrEqual(1024);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("throws error when output allocation would be below minimum threshold", () => {
    // Create allocation ratios that would result in output < 1024 tokens
    // For a provider with 128,000 tokens, we need outputGenerationRatio < 1024/128000 ≈ 0.008
    const lowOutputAllocation = {
      inputContextRatio: 0.99,
      systemInstructionsRatio: 0.005,
      outputGenerationRatio: 0.005, // This will result in ~640 tokens for 128k context
    };

    const userConfig: TokenOptimizationConfig = {
      pruningStrategy: "balanced",
      enableAutoPruning: true,
      pruningThreshold: 80,
      tokenAllocation: lowOutputAllocation,
      enableCostTracking: true,
      enableMessagePinning: true,
      coordinateWithCompaction: true,
      coordinateWithSmartContext: true,
    };

    // Should throw DyadError with Validation kind
    expect(() => {
      calculateTokenBudget("openai/gpt-4", userConfig);
    }).toThrow(/Output generation allocation.*below minimum threshold/);
  });

  it("minimum threshold is enforced across all supported providers", () => {
    // Test with a variety of providers with different context windows
    const providers = [
      "openai/gpt-4", // 128k context
      "openai/o1", // 200k context
      "anthropic/claude-3.5-sonnet", // 200k context
      "google/gemini-1.5-pro", // 2M context
      "ollama/qwen2.5-coder", // 32k context
      "lmstudio/local", // 32k context
    ];

    // Generate allocation ratios that should pass the minimum threshold
    const allocationRatiosArb = fc
      .tuple(
        fc.double({ min: 0, max: 0.8, noNaN: true }),
        fc.double({ min: 0, max: 0.3, noNaN: true }),
        fc.double({ min: 0.1, max: 0.5, noNaN: true }), // Ensure output ratio is reasonable
      )
      .map(([a, b, c]) => {
        const sum = a + b + c;
        return {
          inputContextRatio: a / sum,
          systemInstructionsRatio: b / sum,
          outputGenerationRatio: c / sum,
        };
      });

    providers.forEach((provider) => {
      fc.assert(
        fc.property(allocationRatiosArb, (allocation) => {
          const userConfig: TokenOptimizationConfig = {
            pruningStrategy: "balanced",
            enableAutoPruning: true,
            pruningThreshold: 80,
            tokenAllocation: allocation,
            enableCostTracking: true,
            enableMessagePinning: true,
            coordinateWithCompaction: true,
            coordinateWithSmartContext: true,
          };

          const budget = calculateTokenBudget(provider, userConfig);

          // Verify minimum threshold is enforced
          expect(budget.allocated.outputGeneration).toBeGreaterThanOrEqual(
            1024,
          );

          return true;
        }),
        { numRuns: 50 }, // 50 runs per provider
      );
    });
  });

  it("uses provider optimal allocation when user config has no custom allocation", () => {
    // Test that when tokenAllocation is not provided, the provider's optimal allocation is used
    // and it still respects the minimum output threshold
    const providerArb = fc.constantFrom(
      "openai/gpt-4",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-1.5-flash",
    );

    fc.assert(
      fc.property(providerArb, (provider) => {
        // Create config without tokenAllocation (will use provider optimal)
        const userConfig: TokenOptimizationConfig = {
          pruningStrategy: "balanced",
          enableAutoPruning: true,
          pruningThreshold: 80,
          tokenAllocation: undefined as any, // Will use provider optimal
          enableCostTracking: true,
          enableMessagePinning: true,
          coordinateWithCompaction: true,
          coordinateWithSmartContext: true,
        };

        const budget = calculateTokenBudget(provider, userConfig);

        // Verify minimum threshold is still enforced with provider optimal allocation
        expect(budget.allocated.outputGeneration).toBeGreaterThanOrEqual(1024);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("minimum threshold validation happens after allocation calculation", () => {
    // This test verifies that the validation occurs after allocateTokens is called
    // by testing edge cases where floor operations might affect the result

    // Create allocation that results in exactly 1024 tokens for output
    // For 128,000 tokens: 1024/128000 = 0.008
    const exactMinimumAllocation = {
      inputContextRatio: 0.792,
      systemInstructionsRatio: 0.2,
      outputGenerationRatio: 0.008,
    };

    const userConfig: TokenOptimizationConfig = {
      pruningStrategy: "balanced",
      enableAutoPruning: true,
      pruningThreshold: 80,
      tokenAllocation: exactMinimumAllocation,
      enableCostTracking: true,
      enableMessagePinning: true,
      coordinateWithCompaction: true,
      coordinateWithSmartContext: true,
    };

    const budget = calculateTokenBudget("openai/gpt-4", userConfig);

    // Should be exactly 1024 (or very close due to floor operations)
    expect(budget.allocated.outputGeneration).toBeGreaterThanOrEqual(1024);
  });

  it("handles edge case of very small context windows", () => {
    // Test with the smallest context window provider (32k tokens)
    // Even with small context, minimum output should be enforced

    const allocationRatiosArb = fc
      .tuple(
        fc.double({ min: 0, max: 0.7, noNaN: true }),
        fc.double({ min: 0, max: 0.2, noNaN: true }),
        fc.double({ min: 0.1, max: 0.5, noNaN: true }),
      )
      .map(([a, b, c]) => {
        const sum = a + b + c;
        return {
          inputContextRatio: a / sum,
          systemInstructionsRatio: b / sum,
          outputGenerationRatio: c / sum,
        };
      });

    fc.assert(
      fc.property(allocationRatiosArb, (allocation) => {
        const userConfig: TokenOptimizationConfig = {
          pruningStrategy: "balanced",
          enableAutoPruning: true,
          pruningThreshold: 80,
          tokenAllocation: allocation,
          enableCostTracking: true,
          enableMessagePinning: true,
          coordinateWithCompaction: true,
          coordinateWithSmartContext: true,
        };

        const budget = calculateTokenBudget("ollama/qwen2.5-coder", userConfig);

        // Even with 32k context window, minimum 1024 tokens for output
        expect(budget.allocated.outputGeneration).toBeGreaterThanOrEqual(1024);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("handles edge case of very large context windows", () => {
    // Test with the largest context window provider (2M tokens)
    // Minimum threshold should still be enforced

    const allocationRatiosArb = fc
      .tuple(
        fc.double({ min: 0, max: 0.85, noNaN: true }),
        fc.double({ min: 0, max: 0.3, noNaN: true }),
        fc.double({ min: 0.05, max: 0.5, noNaN: true }), // Ensure output ratio is reasonable
      )
      .map(([a, b, c]) => {
        const sum = a + b + c;
        return {
          inputContextRatio: a / sum,
          systemInstructionsRatio: b / sum,
          outputGenerationRatio: c / sum,
        };
      });

    fc.assert(
      fc.property(allocationRatiosArb, (allocation) => {
        const userConfig: TokenOptimizationConfig = {
          pruningStrategy: "balanced",
          enableAutoPruning: true,
          pruningThreshold: 80,
          tokenAllocation: allocation,
          enableCostTracking: true,
          enableMessagePinning: true,
          coordinateWithCompaction: true,
          coordinateWithSmartContext: true,
        };

        const budget = calculateTokenBudget(
          "google/gemini-1.5-pro",
          userConfig,
        );

        // Even with 2M context window, minimum 1024 tokens for output
        expect(budget.allocated.outputGeneration).toBeGreaterThanOrEqual(1024);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("minimum threshold constant is 1024 tokens", () => {
    // This test documents the specific minimum threshold value
    // If the constant changes, this test will fail and should be updated

    // Create a config that would result in exactly the minimum
    const provider = "openai/gpt-4"; // 128k context
    const contextWindow = 128_000;

    // Calculate the ratio needed for exactly 1024 tokens
    const minimumRatio = 1024 / contextWindow;

    const userConfig: TokenOptimizationConfig = {
      pruningStrategy: "balanced",
      enableAutoPruning: true,
      pruningThreshold: 80,
      tokenAllocation: {
        inputContextRatio: 0.8 - minimumRatio,
        systemInstructionsRatio: 0.2,
        outputGenerationRatio: minimumRatio,
      },
      enableCostTracking: true,
      enableMessagePinning: true,
      coordinateWithCompaction: true,
      coordinateWithSmartContext: true,
    };

    const budget = calculateTokenBudget(provider, userConfig);

    // Should be exactly 1024 (or very close due to floor operations)
    expect(budget.allocated.outputGeneration).toBeGreaterThanOrEqual(1024);
    expect(budget.allocated.outputGeneration).toBeLessThanOrEqual(1025); // Allow 1 token rounding
  });
});
