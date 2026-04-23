// Property-Based Tests for Positive Number Validation
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { CostBudgetSchema, TokenOptimizationConfigSchema } from "../types";
import { ZodError } from "zod";

describe("Property 24: Positive Number Validation", () => {
  /**
   * **Validates: Requirements 8.6**
   *
   * Property: For any configuration object, the parser SHALL accept Token_Budget
   * and Cost_Budget values that are positive numbers (> 0), and SHALL reject
   * zero, negative, or non-numeric values with a descriptive validation error.
   */

  describe("CostBudgetSchema.amount validation", () => {
    it("accepts positive numbers for cost budget amount", () => {
      // Generate positive numbers (> 0)
      const positiveNumberArb = fc.double({
        min: Number.MIN_VALUE,
        max: Number.MAX_SAFE_INTEGER,
        noNaN: true,
      });

      fc.assert(
        fc.property(positiveNumberArb, (amount) => {
          const costBudget = {
            amount,
            period: "monthly" as const,
            warningThreshold: 80,
          };

          // Should parse successfully without throwing
          const result = CostBudgetSchema.parse(costBudget);
          expect(result.amount).toBe(amount);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    it("rejects zero for cost budget amount", () => {
      const costBudget = {
        amount: 0,
        period: "monthly" as const,
        warningThreshold: 80,
      };

      expect(() => CostBudgetSchema.parse(costBudget)).toThrow(ZodError);

      try {
        CostBudgetSchema.parse(costBudget);
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues.length).toBeGreaterThan(0);
        expect(zodError.issues[0].message).toContain("positive");
      }
    });

    it("rejects negative numbers for cost budget amount", () => {
      // Generate negative numbers
      const negativeNumberArb = fc.double({
        min: -Number.MAX_SAFE_INTEGER,
        max: -Number.MIN_VALUE,
        noNaN: true,
      });

      fc.assert(
        fc.property(negativeNumberArb, (amount) => {
          const costBudget = {
            amount,
            period: "monthly" as const,
            warningThreshold: 80,
          };

          let didThrow = false;
          let isZodError = false;
          let hasPositiveMessage = false;

          try {
            CostBudgetSchema.parse(costBudget);
          } catch (error) {
            didThrow = true;
            isZodError = error instanceof ZodError;
            if (isZodError) {
              const zodError = error as ZodError;
              hasPositiveMessage = zodError.issues.some((issue) =>
                issue.message.toLowerCase().includes("positive"),
              );
            }
          }

          expect(didThrow).toBe(true);
          expect(isZodError).toBe(true);
          expect(hasPositiveMessage).toBe(true);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it("rejects non-numeric values for cost budget amount", () => {
      // Generate various non-numeric values
      const nonNumericArb = fc.oneof(
        fc.string(),
        fc.boolean(),
        fc.constant(null),
        fc.constant(undefined),
        fc.object(),
        fc.array(fc.integer()),
      );

      fc.assert(
        fc.property(nonNumericArb, (nonNumericValue) => {
          const costBudget = {
            amount: nonNumericValue,
            period: "monthly" as const,
            warningThreshold: 80,
          };

          expect(() => CostBudgetSchema.parse(costBudget)).toThrow(ZodError);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    it("rejects NaN for cost budget amount", () => {
      const costBudget = {
        amount: NaN,
        period: "monthly" as const,
        warningThreshold: 80,
      };

      expect(() => CostBudgetSchema.parse(costBudget)).toThrow(ZodError);
    });

    it("rejects Infinity for cost budget amount", () => {
      const costBudget = {
        amount: Infinity,
        period: "monthly" as const,
        warningThreshold: 80,
      };

      expect(() => CostBudgetSchema.parse(costBudget)).toThrow(ZodError);
    });

    it("rejects -Infinity for cost budget amount", () => {
      const costBudget = {
        amount: -Infinity,
        period: "monthly" as const,
        warningThreshold: 80,
      };

      expect(() => CostBudgetSchema.parse(costBudget)).toThrow(ZodError);
    });
  });

  describe("slidingWindowSize validation", () => {
    it("accepts positive integers for sliding window size", () => {
      // Generate positive integers (> 0)
      const positiveIntegerArb = fc.integer({ min: 1, max: 10000 });

      fc.assert(
        fc.property(positiveIntegerArb, (slidingWindowSize) => {
          const config = {
            pruningStrategy: "balanced" as const,
            enableAutoPruning: true,
            pruningThreshold: 80,
            tokenAllocation: {
              inputContextRatio: 0.7,
              systemInstructionsRatio: 0.1,
              outputGenerationRatio: 0.2,
            },
            enableCostTracking: true,
            enableMessagePinning: true,
            slidingWindowSize,
            coordinateWithCompaction: true,
            coordinateWithSmartContext: true,
          };

          // Should parse successfully without throwing
          const result = TokenOptimizationConfigSchema.parse(config);
          expect(result.slidingWindowSize).toBe(slidingWindowSize);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    it("rejects zero for sliding window size", () => {
      const config = {
        pruningStrategy: "balanced" as const,
        enableAutoPruning: true,
        pruningThreshold: 80,
        tokenAllocation: {
          inputContextRatio: 0.7,
          systemInstructionsRatio: 0.1,
          outputGenerationRatio: 0.2,
        },
        enableCostTracking: true,
        enableMessagePinning: true,
        slidingWindowSize: 0,
        coordinateWithCompaction: true,
        coordinateWithSmartContext: true,
      };

      expect(() => TokenOptimizationConfigSchema.parse(config)).toThrow(
        ZodError,
      );

      try {
        TokenOptimizationConfigSchema.parse(config);
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues.length).toBeGreaterThan(0);
        expect(zodError.issues[0].message).toContain("positive");
      }
    });

    it("rejects negative integers for sliding window size", () => {
      // Generate negative integers
      const negativeIntegerArb = fc.integer({ min: -10000, max: -1 });

      fc.assert(
        fc.property(negativeIntegerArb, (slidingWindowSize) => {
          const config = {
            pruningStrategy: "balanced" as const,
            enableAutoPruning: true,
            pruningThreshold: 80,
            tokenAllocation: {
              inputContextRatio: 0.7,
              systemInstructionsRatio: 0.1,
              outputGenerationRatio: 0.2,
            },
            enableCostTracking: true,
            enableMessagePinning: true,
            slidingWindowSize,
            coordinateWithCompaction: true,
            coordinateWithSmartContext: true,
          };

          let didThrow = false;
          let isZodError = false;
          let hasPositiveMessage = false;

          try {
            TokenOptimizationConfigSchema.parse(config);
          } catch (error) {
            didThrow = true;
            isZodError = error instanceof ZodError;
            if (isZodError) {
              const zodError = error as ZodError;
              hasPositiveMessage = zodError.issues.some((issue) =>
                issue.message.toLowerCase().includes("positive"),
              );
            }
          }

          expect(didThrow).toBe(true);
          expect(isZodError).toBe(true);
          expect(hasPositiveMessage).toBe(true);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it("rejects non-integer numbers for sliding window size", () => {
      // Generate non-integer numbers (floats with decimal parts)
      const nonIntegerArb = fc
        .double({ min: 0.1, max: 1000, noNaN: true })
        .filter((n) => !Number.isInteger(n));

      fc.assert(
        fc.property(nonIntegerArb, (slidingWindowSize) => {
          const config = {
            pruningStrategy: "balanced" as const,
            enableAutoPruning: true,
            pruningThreshold: 80,
            tokenAllocation: {
              inputContextRatio: 0.7,
              systemInstructionsRatio: 0.1,
              outputGenerationRatio: 0.2,
            },
            enableCostTracking: true,
            enableMessagePinning: true,
            slidingWindowSize,
            coordinateWithCompaction: true,
            coordinateWithSmartContext: true,
          };

          let didThrow = false;
          let isZodError = false;
          let hasIntegerMessage = false;

          try {
            TokenOptimizationConfigSchema.parse(config);
          } catch (error) {
            didThrow = true;
            isZodError = error instanceof ZodError;
            if (isZodError) {
              const zodError = error as ZodError;
              hasIntegerMessage = zodError.issues.some((issue) =>
                issue.message.toLowerCase().includes("integer"),
              );
            }
          }

          expect(didThrow).toBe(true);
          expect(isZodError).toBe(true);
          expect(hasIntegerMessage).toBe(true);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it("rejects non-numeric values for sliding window size", () => {
      // Generate various non-numeric values (excluding undefined since it's valid for optional fields)
      const nonNumericArb = fc.oneof(
        fc.string(),
        fc.boolean(),
        fc.constant(null),
        fc.object(),
        fc.array(fc.integer()),
      );

      fc.assert(
        fc.property(nonNumericArb, (nonNumericValue) => {
          const config = {
            pruningStrategy: "balanced" as const,
            enableAutoPruning: true,
            pruningThreshold: 80,
            tokenAllocation: {
              inputContextRatio: 0.7,
              systemInstructionsRatio: 0.1,
              outputGenerationRatio: 0.2,
            },
            enableCostTracking: true,
            enableMessagePinning: true,
            slidingWindowSize: nonNumericValue,
            coordinateWithCompaction: true,
            coordinateWithSmartContext: true,
          };

          expect(() => TokenOptimizationConfigSchema.parse(config)).toThrow(
            ZodError,
          );
          return true;
        }),
        { numRuns: 100 },
      );
    });

    it("accepts undefined for optional sliding window size", () => {
      const config = {
        pruningStrategy: "balanced" as const,
        enableAutoPruning: true,
        pruningThreshold: 80,
        tokenAllocation: {
          inputContextRatio: 0.7,
          systemInstructionsRatio: 0.1,
          outputGenerationRatio: 0.2,
        },
        enableCostTracking: true,
        enableMessagePinning: true,
        slidingWindowSize: undefined,
        coordinateWithCompaction: true,
        coordinateWithSmartContext: true,
      };

      // Should parse successfully since slidingWindowSize is optional
      const result = TokenOptimizationConfigSchema.parse(config);
      expect(result.slidingWindowSize).toBeUndefined();
    });

    it("accepts config without sliding window size field", () => {
      const config = {
        pruningStrategy: "balanced" as const,
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

      // Should parse successfully since slidingWindowSize is optional
      const result = TokenOptimizationConfigSchema.parse(config);
      expect(result.slidingWindowSize).toBeUndefined();
    });
  });

  describe("Edge cases for positive number validation", () => {
    it("accepts very small positive numbers for cost budget amount", () => {
      const costBudget = {
        amount: 0.01, // 1 cent
        period: "monthly" as const,
        warningThreshold: 80,
      };

      const result = CostBudgetSchema.parse(costBudget);
      expect(result.amount).toBe(0.01);
    });

    it("accepts very large positive numbers for cost budget amount", () => {
      const costBudget = {
        amount: 1_000_000, // 1 million dollars
        period: "monthly" as const,
        warningThreshold: 80,
      };

      const result = CostBudgetSchema.parse(costBudget);
      expect(result.amount).toBe(1_000_000);
    });

    it("accepts minimum positive integer (1) for sliding window size", () => {
      const config = {
        pruningStrategy: "balanced" as const,
        enableAutoPruning: true,
        pruningThreshold: 80,
        tokenAllocation: {
          inputContextRatio: 0.7,
          systemInstructionsRatio: 0.1,
          outputGenerationRatio: 0.2,
        },
        enableCostTracking: true,
        enableMessagePinning: true,
        slidingWindowSize: 1,
        coordinateWithCompaction: true,
        coordinateWithSmartContext: true,
      };

      const result = TokenOptimizationConfigSchema.parse(config);
      expect(result.slidingWindowSize).toBe(1);
    });

    it("accepts large positive integers for sliding window size", () => {
      const config = {
        pruningStrategy: "balanced" as const,
        enableAutoPruning: true,
        pruningThreshold: 80,
        tokenAllocation: {
          inputContextRatio: 0.7,
          systemInstructionsRatio: 0.1,
          outputGenerationRatio: 0.2,
        },
        enableCostTracking: true,
        enableMessagePinning: true,
        slidingWindowSize: 10000,
        coordinateWithCompaction: true,
        coordinateWithSmartContext: true,
      };

      const result = TokenOptimizationConfigSchema.parse(config);
      expect(result.slidingWindowSize).toBe(10000);
    });
  });
});
