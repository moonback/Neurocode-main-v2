// Property-Based Tests for Token Budget Allocation
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { allocateTokens } from "../token_allocator";
import type { AllocationRatios } from "../token_allocator";

describe("Property 8: Token Budget Allocation", () => {
  /**
   * **Validates: Requirements 3.2, 3.3**
   *
   * Property: For any provider configuration and user-specified allocation ratios,
   * the calculated token budget SHALL have total tokens equal to the provider's
   * context window, and the sum of allocated tokens (input context + system
   * instructions + output generation) SHALL equal the total tokens (within
   * rounding tolerance due to Math.floor operations).
   */

  it("sum of allocated tokens equals total tokens within rounding tolerance", () => {
    // Generate valid allocation ratios that sum to 1.0
    const allocationRatiosArb = fc
      .tuple(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
      )
      .map(([a, b, c]) => {
        // Normalize to ensure they sum to 1.0
        const sum = a + b + c;
        if (sum === 0) {
          // Edge case: if all are zero, use equal distribution
          return {
            inputContextRatio: 1 / 3,
            systemInstructionsRatio: 1 / 3,
            outputGenerationRatio: 1 / 3,
          };
        }
        return {
          inputContextRatio: a / sum,
          systemInstructionsRatio: b / sum,
          outputGenerationRatio: c / sum,
        };
      });

    // Generate positive total token counts
    const totalTokensArb = fc.integer({ min: 1, max: 1_000_000 });

    fc.assert(
      fc.property(
        totalTokensArb,
        allocationRatiosArb,
        (totalTokens, allocation) => {
          // Allocate tokens
          const allocated = allocateTokens(totalTokens, allocation);

          // Calculate sum of allocated tokens
          const allocatedSum =
            allocated.inputContext +
            allocated.systemInstructions +
            allocated.outputGeneration;

          // Due to Math.floor operations, the sum may be less than or equal to total
          // The difference should be at most 2 tokens (one per ratio due to rounding)
          const difference = totalTokens - allocatedSum;

          // Verify that allocated sum is within rounding tolerance
          expect(allocatedSum).toBeLessThanOrEqual(totalTokens);
          expect(difference).toBeGreaterThanOrEqual(0);
          expect(difference).toBeLessThanOrEqual(2);

          // Verify each allocation is non-negative
          expect(allocated.inputContext).toBeGreaterThanOrEqual(0);
          expect(allocated.systemInstructions).toBeGreaterThanOrEqual(0);
          expect(allocated.outputGeneration).toBeGreaterThanOrEqual(0);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("allocated tokens respect the allocation ratios proportionally", () => {
    // Generate valid allocation ratios that sum to 1.0
    const allocationRatiosArb = fc
      .tuple(
        fc.double({ min: 0.1, max: 0.8, noNaN: true }),
        fc.double({ min: 0.1, max: 0.8, noNaN: true }),
        fc.double({ min: 0.1, max: 0.8, noNaN: true }),
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

    // Use larger token counts to minimize rounding effects
    const totalTokensArb = fc.integer({ min: 1000, max: 1_000_000 });

    fc.assert(
      fc.property(
        totalTokensArb,
        allocationRatiosArb,
        (totalTokens, allocation) => {
          // Allocate tokens
          const allocated = allocateTokens(totalTokens, allocation);

          // Calculate expected allocations (with floor)
          const expectedInputContext = Math.floor(
            totalTokens * allocation.inputContextRatio,
          );
          const expectedSystemInstructions = Math.floor(
            totalTokens * allocation.systemInstructionsRatio,
          );
          const expectedOutputGeneration = Math.floor(
            totalTokens * allocation.outputGenerationRatio,
          );

          // Verify allocations match expected values
          expect(allocated.inputContext).toBe(expectedInputContext);
          expect(allocated.systemInstructions).toBe(expectedSystemInstructions);
          expect(allocated.outputGeneration).toBe(expectedOutputGeneration);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("handles edge case of equal allocation ratios (1/3 each)", () => {
    const equalAllocation: AllocationRatios = {
      inputContextRatio: 1 / 3,
      systemInstructionsRatio: 1 / 3,
      outputGenerationRatio: 1 / 3,
    };

    // Test with various total token counts
    const totalTokensArb = fc.integer({ min: 3, max: 1_000_000 });

    fc.assert(
      fc.property(totalTokensArb, (totalTokens) => {
        const allocated = allocateTokens(totalTokens, equalAllocation);

        // Sum should be within rounding tolerance
        const allocatedSum =
          allocated.inputContext +
          allocated.systemInstructions +
          allocated.outputGeneration;

        expect(allocatedSum).toBeLessThanOrEqual(totalTokens);
        expect(totalTokens - allocatedSum).toBeLessThanOrEqual(2);

        // Each allocation should be approximately equal (within 1 token due to rounding)
        const maxAllocation = Math.max(
          allocated.inputContext,
          allocated.systemInstructions,
          allocated.outputGeneration,
        );
        const minAllocation = Math.min(
          allocated.inputContext,
          allocated.systemInstructions,
          allocated.outputGeneration,
        );

        expect(maxAllocation - minAllocation).toBeLessThanOrEqual(1);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("handles edge case of single category getting all tokens", () => {
    const allocationScenarios: AllocationRatios[] = [
      {
        inputContextRatio: 1.0,
        systemInstructionsRatio: 0.0,
        outputGenerationRatio: 0.0,
      },
      {
        inputContextRatio: 0.0,
        systemInstructionsRatio: 1.0,
        outputGenerationRatio: 0.0,
      },
      {
        inputContextRatio: 0.0,
        systemInstructionsRatio: 0.0,
        outputGenerationRatio: 1.0,
      },
    ];

    const totalTokensArb = fc.integer({ min: 1, max: 1_000_000 });

    allocationScenarios.forEach((allocation) => {
      fc.assert(
        fc.property(totalTokensArb, (totalTokens) => {
          const allocated = allocateTokens(totalTokens, allocation);

          // Sum should equal total tokens (no rounding loss with single allocation)
          const allocatedSum =
            allocated.inputContext +
            allocated.systemInstructions +
            allocated.outputGeneration;

          expect(allocatedSum).toBe(totalTokens);

          // Verify only one category has tokens
          const nonZeroCount = [
            allocated.inputContext,
            allocated.systemInstructions,
            allocated.outputGeneration,
          ].filter((x) => x > 0).length;

          expect(nonZeroCount).toBe(1);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  it("handles minimum total tokens (1 token)", () => {
    // With only 1 token, allocation ratios will result in floor operations
    const allocationRatiosArb = fc
      .tuple(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
      )
      .map(([a, b, c]) => {
        const sum = a + b + c;
        if (sum === 0) {
          return {
            inputContextRatio: 1 / 3,
            systemInstructionsRatio: 1 / 3,
            outputGenerationRatio: 1 / 3,
          };
        }
        return {
          inputContextRatio: a / sum,
          systemInstructionsRatio: b / sum,
          outputGenerationRatio: c / sum,
        };
      });

    fc.assert(
      fc.property(allocationRatiosArb, (allocation) => {
        const allocated = allocateTokens(1, allocation);

        // Sum should be 0 or 1 (due to floor operations)
        const allocatedSum =
          allocated.inputContext +
          allocated.systemInstructions +
          allocated.outputGeneration;

        expect(allocatedSum).toBeLessThanOrEqual(1);
        expect(allocatedSum).toBeGreaterThanOrEqual(0);

        // Each allocation should be 0 or 1
        expect(allocated.inputContext).toBeLessThanOrEqual(1);
        expect(allocated.systemInstructions).toBeLessThanOrEqual(1);
        expect(allocated.outputGeneration).toBeLessThanOrEqual(1);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("handles very large token counts", () => {
    const allocationRatiosArb = fc
      .tuple(
        fc.double({ min: 0.1, max: 0.8, noNaN: true }),
        fc.double({ min: 0.1, max: 0.8, noNaN: true }),
        fc.double({ min: 0.1, max: 0.8, noNaN: true }),
      )
      .map(([a, b, c]) => {
        const sum = a + b + c;
        return {
          inputContextRatio: a / sum,
          systemInstructionsRatio: b / sum,
          outputGenerationRatio: c / sum,
        };
      });

    // Test with very large token counts (up to 10 million)
    const largeTokensArb = fc.integer({ min: 1_000_000, max: 10_000_000 });

    fc.assert(
      fc.property(
        largeTokensArb,
        allocationRatiosArb,
        (totalTokens, allocation) => {
          const allocated = allocateTokens(totalTokens, allocation);

          // Sum should be within rounding tolerance
          const allocatedSum =
            allocated.inputContext +
            allocated.systemInstructions +
            allocated.outputGeneration;

          expect(allocatedSum).toBeLessThanOrEqual(totalTokens);
          expect(totalTokens - allocatedSum).toBeLessThanOrEqual(2);

          // Verify each allocation is a valid integer
          expect(Number.isInteger(allocated.inputContext)).toBe(true);
          expect(Number.isInteger(allocated.systemInstructions)).toBe(true);
          expect(Number.isInteger(allocated.outputGeneration)).toBe(true);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("allocation is deterministic for same inputs", () => {
    const allocation: AllocationRatios = {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    };

    const totalTokens = 100000;

    // Call allocateTokens multiple times with same inputs
    const result1 = allocateTokens(totalTokens, allocation);
    const result2 = allocateTokens(totalTokens, allocation);
    const result3 = allocateTokens(totalTokens, allocation);

    // All results should be identical
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  it("validates that ratios sum to approximately 1.0 is enforced by caller", () => {
    // This test documents that allocateTokens assumes ratios sum to 1.0
    // The validation is done by calculateTokenBudget, not allocateTokens itself

    const validAllocation: AllocationRatios = {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    };

    const totalTokens = 100000;
    const allocated = allocateTokens(totalTokens, validAllocation);

    // Should work fine with valid ratios
    expect(allocated.inputContext).toBe(70000);
    expect(allocated.systemInstructions).toBe(10000);
    expect(allocated.outputGeneration).toBe(20000);
  });
});
