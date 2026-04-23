// Property-Based Tests for Token Optimization Configuration Validation
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { PruningStrategySchema } from "../types";
import { ZodError } from "zod";

describe("Property 23: Strategy Enum Validation", () => {
  /**
   * **Validates: Requirements 8.5**
   *
   * Property: For any configuration object, the parser SHALL accept pruning
   * strategy values of "conservative", "balanced", or "aggressive", and SHALL
   * reject any other string value with a descriptive validation error.
   */

  it("accepts only valid pruning strategy values: conservative, balanced, aggressive", () => {
    // Test that all three valid values are accepted
    const validStrategies = ["conservative", "balanced", "aggressive"] as const;

    fc.assert(
      fc.property(fc.constantFrom(...validStrategies), (strategy) => {
        // Should parse successfully without throwing
        const result = PruningStrategySchema.parse(strategy);
        expect(result).toBe(strategy);
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("rejects any string value that is not conservative, balanced, or aggressive", () => {
    // Generate random strings that are NOT the valid strategies
    const invalidStringArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter(
        (s) => s !== "conservative" && s !== "balanced" && s !== "aggressive",
      );

    fc.assert(
      fc.property(invalidStringArb, (invalidStrategy) => {
        // Should throw a ZodError with descriptive message
        let didThrow = false;
        let isZodError = false;
        let hasIssues = false;

        try {
          PruningStrategySchema.parse(invalidStrategy);
        } catch (error) {
          didThrow = true;
          isZodError = error instanceof ZodError;
          if (isZodError) {
            const zodError = error as ZodError;
            hasIssues = zodError.issues && zodError.issues.length > 0;
          }
        }

        // Verify that parsing threw a ZodError with at least one issue
        expect(didThrow).toBe(true);
        expect(isZodError).toBe(true);
        expect(hasIssues).toBe(true);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("rejects non-string values (numbers, booleans, objects, null, undefined)", () => {
    // Generate various non-string values
    const nonStringArb = fc.oneof(
      fc.integer(),
      fc.double(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.object(),
      fc.array(fc.string()),
    );

    fc.assert(
      fc.property(nonStringArb, (nonStringValue) => {
        // Should throw a ZodError
        expect(() => PruningStrategySchema.parse(nonStringValue)).toThrow(
          ZodError,
        );
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("rejects empty strings", () => {
    expect(() => PruningStrategySchema.parse("")).toThrow(ZodError);
  });

  it("rejects strings with different casing (case-sensitive validation)", () => {
    const casedVariants = [
      "Conservative",
      "CONSERVATIVE",
      "Balanced",
      "BALANCED",
      "Aggressive",
      "AGGRESSIVE",
      "CoNsErVaTiVe",
    ];

    casedVariants.forEach((variant) => {
      expect(() => PruningStrategySchema.parse(variant)).toThrow(ZodError);
    });
  });

  it("rejects strings with whitespace variations", () => {
    const whitespaceVariants = [
      " conservative",
      "conservative ",
      " conservative ",
      "con servative",
      "\tconservative",
      "conservative\n",
      " balanced ",
      " aggressive ",
    ];

    whitespaceVariants.forEach((variant) => {
      expect(() => PruningStrategySchema.parse(variant)).toThrow(ZodError);
    });
  });

  it("rejects similar but invalid strategy names", () => {
    const similarInvalidNames = [
      "conservativ", // missing 'e'
      "conservativee", // extra 'e'
      "balancd", // missing 'e'
      "balancedd", // extra 'd'
      "agressive", // single 'g'
      "aggressivee", // extra 'e'
      "moderate", // plausible but invalid
      "minimal", // plausible but invalid
      "maximum", // plausible but invalid
    ];

    similarInvalidNames.forEach((name) => {
      expect(() => PruningStrategySchema.parse(name)).toThrow(ZodError);
    });
  });
});
