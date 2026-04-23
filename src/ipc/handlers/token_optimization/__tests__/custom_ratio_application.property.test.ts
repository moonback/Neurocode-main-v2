// Property-Based Tests for Custom Ratio Application
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { allocateTokens } from "../token_allocator";
import type { AllocationRatios } from "../token_allocator";

describe("Property 15: Custom Ratio Application", () => {
  /**
   * **Validates: Requirements 5.5**
   *
   * Property: For any valid custom allocation ratios (where each ratio is in [0, 1]
   * and the sum equals 1.0), applying these ratios to a token budget SHALL produce
   * allocated amounts that match the specified ratios within a tolerance of 1 token
   * (due to integer rounding).
   */

  it("custom ratios produce correct allocated amounts within 1 token tolerance", () => {
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
          // Allocate tokens using custom ratios
          const allocated = allocateTokens(totalTokens, allocation);

          // Calculate expected allocations (ideal, without floor)
          const expectedInputContext = totalTokens * allocation.inputContextRatio;
          const expectedSystemInstructions =
            totalTokens * allocation.systemInstructionsRatio;
          const expectedOutputGeneration =
            totalTokens * allocation.outputGenerationRatio;

          // Verify each allocation is within 1 token of the expected value
          // Due to Math.floor, the actual value should be floor(expected)
          const inputContextDiff = Math.abs(
            allocated.inputContext - expectedInputContext,
          );
          const systemInstructionsDiff = Math.abs(
            allocated.systemInstructions - expectedSystemInstructions,
          );
          const outputGenerationDiff = Math.abs(
            allocated.outputGeneration - expectedOutputGeneration,
          );

          // Each allocation should be within 1 token of the ideal value
          expect(inputContextDiff).toBeLessThanOrEqual(1);
          expect(systemInstructionsDiff).toBeLessThanOrEqual(1);
          expect(outputGenerationDiff).toBeLessThanOrEqual(1);

          // Verify allocations are non-negative integers
          expect(allocated.inputContext).toBeGreaterThanOrEqual(0);
          expect(allocated.systemInstructions).toBeGreaterThanOrEqual(0);
          expect(allocated.outputGeneration).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(allocated.inputContext)).toBe(true);
          expect(Number.isInteger(allocated.systemInstructions)).toBe(true);
          expect(Number.isInteger(allocated.outputGeneration)).toBe(true);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("custom ratios with extreme distributions are applied correctly", () => {
    // Test extreme ratio distributions
    const extremeRatios: AllocationRatios[] = [
      // One category gets 99%, others split 1%
      {
        inputContextRatio: 0.99,
        systemInstructionsRatio: 0.005,
        outputGenerationRatio: 0.005,
      },
      // Two categories get 49.5% each, one gets 1%
      {
        inputContextRatio: 0.495,
        systemInstructionsRatio: 0.495,
        outputGenerationRatio: 0.01,
      },
      // Uneven distribution
      {
        inputContextRatio: 0.8,
        systemInstructionsRatio: 0.15,
        outputGenerationRatio: 0.05,
      },
    ];

    const totalTokensArb = fc.integer({ min: 1000, max: 1_000_000 });

    extremeRatios.forEach((allocation) => {
      fc.assert(
        fc.property(totalTokensArb, (totalTokens) => {
          const allocated = allocateTokens(totalTokens, allocation);

          // Calculate expected allocations
          const expectedInputContext = totalTokens * allocation.inputContextRatio;
          const expectedSystemInstructions =
            totalTokens * allocation.systemInstructionsRatio;
          const expectedOutputGeneration =
            totalTokens * allocation.outputGenerationRatio;

          // Verify within 1 token tolerance
          expect(
            Math.abs(allocated.inputContext - expectedInputContext),
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(allocated.systemInstructions - expectedSystemInstructions),
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(allocated.outputGeneration - expectedOutputGeneration),
          ).toBeLessThanOrEqual(1);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  it("custom ratios maintain proportionality across different token counts", () => {
    // Use a fixed custom ratio and test across different token counts
    const customRatio: AllocationRatios = {
      inputContextRatio: 0.6,
      systemInstructionsRatio: 0.25,
      outputGenerationRatio: 0.15,
    };

    const tokenCounts = [1000, 10000, 100000, 500000, 1000000];

    tokenCounts.forEach((totalTokens) => {
      const allocated = allocateTokens(totalTokens, customRatio);

      // Calculate expected allocations
      const expectedInputContext = totalTokens * customRatio.inputContextRatio;
      const expectedSystemInstructions =
        totalTokens * customRatio.systemInstructionsRatio;
      const expectedOutputGeneration =
        totalTokens * customRatio.outputGenerationRatio;

      // Verify within 1 token tolerance
      expect(
        Math.abs(allocated.inputContext - expectedInputContext),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(allocated.systemInstructions - expectedSystemInstructions),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(allocated.outputGeneration - expectedOutputGeneration),
      ).toBeLessThanOrEqual(1);

      // Verify the ratio is approximately maintained
      const actualInputRatio = allocated.inputContext / totalTokens;
      const actualSystemRatio = allocated.systemInstructions / totalTokens;
      const actualOutputRatio = allocated.outputGeneration / totalTokens;

      // Allow small deviation due to rounding (1 token / totalTokens)
      const tolerance = 1 / totalTokens;
      expect(
        Math.abs(actualInputRatio - customRatio.inputContextRatio),
      ).toBeLessThanOrEqual(tolerance);
      expect(
        Math.abs(actualSystemRatio - customRatio.systemInstructionsRatio),
      ).toBeLessThanOrEqual(tolerance);
      expect(
        Math.abs(actualOutputRatio - customRatio.outputGenerationRatio),
      ).toBeLessThanOrEqual(tolerance);
    });
  });

  it("custom ratios with small token counts handle rounding gracefully", () => {
    // Test with small token counts where rounding has significant impact
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

    // Small token counts (1-100)
    const smallTokensArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(
        smallTokensArb,
        allocationRatiosArb,
        (totalTokens, allocation) => {
          const allocated = allocateTokens(totalTokens, allocation);

          // Calculate expected allocations
          const expectedInputContext = totalTokens * allocation.inputContextRatio;
          const expectedSystemInstructions =
            totalTokens * allocation.systemInstructionsRatio;
          const expectedOutputGeneration =
            totalTokens * allocation.outputGenerationRatio;

          // Verify within 1 token tolerance
          expect(
            Math.abs(allocated.inputContext - expectedInputContext),
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(allocated.systemInstructions - expectedSystemInstructions),
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(allocated.outputGeneration - expectedOutputGeneration),
          ).toBeLessThanOrEqual(1);

          // Verify sum doesn't exceed total
          const sum =
            allocated.inputContext +
            allocated.systemInstructions +
            allocated.outputGeneration;
          expect(sum).toBeLessThanOrEqual(totalTokens);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("custom ratios produce deterministic results for same inputs", () => {
    const customRatio: AllocationRatios = {
      inputContextRatio: 0.55,
      systemInstructionsRatio: 0.3,
      outputGenerationRatio: 0.15,
    };

    const totalTokens = 123456;

    // Call allocateTokens multiple times with same inputs
    const result1 = allocateTokens(totalTokens, customRatio);
    const result2 = allocateTokens(totalTokens, customRatio);
    const result3 = allocateTokens(totalTokens, customRatio);

    // All results should be identical
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);

    // Verify the results match expected values within tolerance
    const expectedInputContext = totalTokens * customRatio.inputContextRatio;
    const expectedSystemInstructions =
      totalTokens * customRatio.systemInstructionsRatio;
    const expectedOutputGeneration =
      totalTokens * customRatio.outputGenerationRatio;

    expect(
      Math.abs(result1.inputContext - expectedInputContext),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(result1.systemInstructions - expectedSystemInstructions),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(result1.outputGeneration - expectedOutputGeneration),
    ).toBeLessThanOrEqual(1);
  });

  it("custom ratios with precision edge cases are handled correctly", () => {
    // Test ratios that result in repeating decimals
    const precisionRatios: AllocationRatios[] = [
      // 1/3 each (repeating decimal 0.333...)
      {
        inputContextRatio: 1 / 3,
        systemInstructionsRatio: 1 / 3,
        outputGenerationRatio: 1 / 3,
      },
      // 1/7 distribution (repeating decimal 0.142857...)
      {
        inputContextRatio: 3 / 7,
        systemInstructionsRatio: 2 / 7,
        outputGenerationRatio: 2 / 7,
      },
      // 1/6 distribution
      {
        inputContextRatio: 3 / 6,
        systemInstructionsRatio: 2 / 6,
        outputGenerationRatio: 1 / 6,
      },
    ];

    const totalTokensArb = fc.integer({ min: 100, max: 1_000_000 });

    precisionRatios.forEach((allocation) => {
      fc.assert(
        fc.property(totalTokensArb, (totalTokens) => {
          const allocated = allocateTokens(totalTokens, allocation);

          // Calculate expected allocations
          const expectedInputContext = totalTokens * allocation.inputContextRatio;
          const expectedSystemInstructions =
            totalTokens * allocation.systemInstructionsRatio;
          const expectedOutputGeneration =
            totalTokens * allocation.outputGenerationRatio;

          // Verify within 1 token tolerance
          expect(
            Math.abs(allocated.inputContext - expectedInputContext),
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(allocated.systemInstructions - expectedSystemInstructions),
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(allocated.outputGeneration - expectedOutputGeneration),
          ).toBeLessThanOrEqual(1);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  it("custom ratios respect floor operation semantics", () => {
    // Verify that allocateTokens uses Math.floor as documented
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

    const totalTokensArb = fc.integer({ min: 1, max: 1_000_000 });

    fc.assert(
      fc.property(
        totalTokensArb,
        allocationRatiosArb,
        (totalTokens, allocation) => {
          const allocated = allocateTokens(totalTokens, allocation);

          // Calculate expected allocations using Math.floor
          const expectedInputContext = Math.floor(
            totalTokens * allocation.inputContextRatio,
          );
          const expectedSystemInstructions = Math.floor(
            totalTokens * allocation.systemInstructionsRatio,
          );
          const expectedOutputGeneration = Math.floor(
            totalTokens * allocation.outputGenerationRatio,
          );

          // Verify exact match with floor operation
          expect(allocated.inputContext).toBe(expectedInputContext);
          expect(allocated.systemInstructions).toBe(expectedSystemInstructions);
          expect(allocated.outputGeneration).toBe(expectedOutputGeneration);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
