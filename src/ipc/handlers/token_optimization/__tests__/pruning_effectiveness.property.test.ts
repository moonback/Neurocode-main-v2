// Property-Based Tests for Pruning Effectiveness Calculation
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { calculatePruningEffectiveness } from "../analytics_engine";
import type { PruningResult } from "../types";

describe("Property 18: Pruning Effectiveness Calculation", () => {
  /**
   * **Validates: Requirements 6.4**
   *
   * Property: For any pruning operation, the effectiveness percentage SHALL equal
   * (tokensRemoved / originalTokens) × 100, and SHALL be in the range [0, 100].
   */

  /**
   * Arbitrary for generating pruning results
   */
  const pruningResultArb = fc.record({
    originalMessageCount: fc.integer({ min: 1, max: 1000 }),
    prunedMessageCount: fc.integer({ min: 0, max: 1000 }),
    tokensRemoved: fc.integer({ min: 0, max: 1000000 }),
    strategy: fc.constantFrom("conservative", "balanced", "aggressive"),
    preservedMessages: fc.array(fc.integer({ min: 1, max: 10000 })),
    removedMessages: fc.array(fc.integer({ min: 1, max: 10000 })),
    compressionSummaries: fc.array(
      fc.record({
        messageRange: fc.tuple(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
        ) as fc.Arbitrary<[number, number]>,
        summary: fc.string(),
      }),
    ),
  }) as fc.Arbitrary<PruningResult>;

  it("effectiveness equals (tokensRemoved / originalTokens) × 100", () => {
    fc.assert(
      fc.property(
        fc.array(pruningResultArb, { minLength: 1, maxLength: 20 }),
        (pruningResults) => {
          const metrics = calculatePruningEffectiveness(pruningResults);

          // Calculate expected average effectiveness
          let totalEffectiveness = 0;
          for (const result of pruningResults) {
            const originalTokens =
              result.tokensRemoved + (result.prunedMessageCount > 0 ? 1 : 0);
            const effectiveness =
              originalTokens > 0
                ? (result.tokensRemoved / originalTokens) * 100
                : 0;
            totalEffectiveness += Math.max(0, Math.min(100, effectiveness));
          }
          const expectedAverage = totalEffectiveness / pruningResults.length;

          // Verify average reduction matches expected (within rounding tolerance)
          expect(
            Math.abs(metrics.averageReduction - expectedAverage),
          ).toBeLessThan(0.01);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("effectiveness is always in range [0, 100]", () => {
    fc.assert(
      fc.property(
        fc.array(pruningResultArb, { minLength: 1, maxLength: 20 }),
        (pruningResults) => {
          const metrics = calculatePruningEffectiveness(pruningResults);

          // Average reduction should be in [0, 100]
          expect(metrics.averageReduction).toBeGreaterThanOrEqual(0);
          expect(metrics.averageReduction).toBeLessThanOrEqual(100);

          // All strategy breakdowns should be in [0, 100]
          for (const reduction of Object.values(metrics.strategyBreakdown)) {
            expect(reduction).toBeGreaterThanOrEqual(0);
            expect(reduction).toBeLessThanOrEqual(100);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("zero tokens removed results in zero effectiveness", () => {
    const zeroTokensResultArb = fc.record({
      originalMessageCount: fc.integer({ min: 1, max: 1000 }),
      prunedMessageCount: fc.integer({ min: 0, max: 1000 }),
      tokensRemoved: fc.constant(0),
      strategy: fc.constantFrom("conservative", "balanced", "aggressive"),
      preservedMessages: fc.array(fc.integer({ min: 1, max: 10000 })),
      removedMessages: fc.array(fc.integer({ min: 1, max: 10000 })),
      compressionSummaries: fc.array(
        fc.record({
          messageRange: fc.tuple(
            fc.integer({ min: 0, max: 100 }),
            fc.integer({ min: 0, max: 100 }),
          ) as fc.Arbitrary<[number, number]>,
          summary: fc.string(),
        }),
      ),
    }) as fc.Arbitrary<PruningResult>;

    fc.assert(
      fc.property(
        fc.array(zeroTokensResultArb, { minLength: 1, maxLength: 20 }),
        (pruningResults) => {
          const metrics = calculatePruningEffectiveness(pruningResults);

          // With zero tokens removed, effectiveness should be 0
          expect(metrics.averageReduction).toBe(0);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("empty pruning results array returns zero effectiveness", () => {
    fc.assert(
      fc.property(fc.constant([]), (pruningResults) => {
        const metrics = calculatePruningEffectiveness(pruningResults);

        expect(metrics.averageReduction).toBe(0);
        expect(Object.keys(metrics.strategyBreakdown).length).toBe(0);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("strategy breakdown contains only used strategies", () => {
    fc.assert(
      fc.property(
        fc.array(pruningResultArb, { minLength: 1, maxLength: 20 }),
        (pruningResults) => {
          const metrics = calculatePruningEffectiveness(pruningResults);

          // Get unique strategies from input
          const usedStrategies = new Set(
            pruningResults.map((result) => result.strategy),
          );

          // Strategy breakdown should only contain used strategies
          const breakdownStrategies = new Set(
            Object.keys(metrics.strategyBreakdown),
          );

          for (const strategy of breakdownStrategies) {
            expect(usedStrategies.has(strategy as any)).toBe(true);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("strategy breakdown averages are correct", () => {
    fc.assert(
      fc.property(
        fc.array(pruningResultArb, { minLength: 1, maxLength: 20 }),
        (pruningResults) => {
          const metrics = calculatePruningEffectiveness(pruningResults);

          // Calculate expected strategy averages
          const strategyGroups: Record<string, number[]> = {};

          for (const result of pruningResults) {
            const originalTokens =
              result.tokensRemoved + (result.prunedMessageCount > 0 ? 1 : 0);
            const effectiveness =
              originalTokens > 0
                ? (result.tokensRemoved / originalTokens) * 100
                : 0;
            const clampedEffectiveness = Math.max(
              0,
              Math.min(100, effectiveness),
            );

            if (!strategyGroups[result.strategy]) {
              strategyGroups[result.strategy] = [];
            }
            strategyGroups[result.strategy].push(clampedEffectiveness);
          }

          // Verify each strategy average
          for (const [strategy, values] of Object.entries(strategyGroups)) {
            const expectedAverage =
              values.reduce((sum, val) => sum + val, 0) / values.length;
            const actualAverage = metrics.strategyBreakdown[strategy];

            expect(Math.abs(actualAverage - expectedAverage)).toBeLessThan(
              0.01,
            );
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("effectiveness has proper precision (2 decimal places)", () => {
    fc.assert(
      fc.property(
        fc.array(pruningResultArb, { minLength: 1, maxLength: 20 }),
        (pruningResults) => {
          const metrics = calculatePruningEffectiveness(pruningResults);

          // Check average reduction precision
          const avgStr = metrics.averageReduction.toString();
          const avgParts = avgStr.split(".");
          const avgDecimalPlaces = avgParts.length > 1 ? avgParts[1].length : 0;
          expect(avgDecimalPlaces).toBeLessThanOrEqual(2);

          // Check strategy breakdown precision
          for (const reduction of Object.values(metrics.strategyBreakdown)) {
            const str = reduction.toString();
            const parts = str.split(".");
            const decimalPlaces = parts.length > 1 ? parts[1].length : 0;
            expect(decimalPlaces).toBeLessThanOrEqual(2);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("calculation is deterministic for same input", () => {
    fc.assert(
      fc.property(
        fc.array(pruningResultArb, { minLength: 1, maxLength: 20 }),
        (pruningResults) => {
          const metrics1 = calculatePruningEffectiveness(pruningResults);
          const metrics2 = calculatePruningEffectiveness(pruningResults);

          // Both calls should produce identical results
          expect(metrics1.averageReduction).toBe(metrics2.averageReduction);
          expect(Object.keys(metrics1.strategyBreakdown).length).toBe(
            Object.keys(metrics2.strategyBreakdown).length,
          );

          for (const strategy of Object.keys(metrics1.strategyBreakdown)) {
            expect(metrics1.strategyBreakdown[strategy]).toBe(
              metrics2.strategyBreakdown[strategy],
            );
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("single strategy results in single breakdown entry", () => {
    const singleStrategyArb = fc
      .constantFrom("conservative", "balanced", "aggressive")
      .chain((strategy) =>
        fc.array(
          pruningResultArb.map((result) => ({ ...result, strategy })),
          { minLength: 1, maxLength: 20 },
        ),
      );

    fc.assert(
      fc.property(singleStrategyArb, (pruningResults) => {
        const metrics = calculatePruningEffectiveness(pruningResults);

        // Should have exactly one strategy in breakdown
        expect(Object.keys(metrics.strategyBreakdown).length).toBe(1);

        // The strategy should match the input
        const strategy = pruningResults[0].strategy;
        expect(metrics.strategyBreakdown[strategy]).toBeDefined();

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("multiple strategies produce separate breakdown entries", () => {
    // Generate results with all three strategies
    const multiStrategyArb = fc
      .tuple(
        fc.array(
          pruningResultArb.map((result) => ({
            ...result,
            strategy: "conservative" as const,
          })),
          { minLength: 1, maxLength: 5 },
        ),
        fc.array(
          pruningResultArb.map((result) => ({
            ...result,
            strategy: "balanced" as const,
          })),
          { minLength: 1, maxLength: 5 },
        ),
        fc.array(
          pruningResultArb.map((result) => ({
            ...result,
            strategy: "aggressive" as const,
          })),
          { minLength: 1, maxLength: 5 },
        ),
      )
      .map(([conservative, balanced, aggressive]) => [
        ...conservative,
        ...balanced,
        ...aggressive,
      ]);

    fc.assert(
      fc.property(multiStrategyArb, (pruningResults) => {
        const metrics = calculatePruningEffectiveness(pruningResults);

        // Should have three strategies in breakdown
        expect(Object.keys(metrics.strategyBreakdown).length).toBe(3);
        expect(metrics.strategyBreakdown["conservative"]).toBeDefined();
        expect(metrics.strategyBreakdown["balanced"]).toBeDefined();
        expect(metrics.strategyBreakdown["aggressive"]).toBeDefined();

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("handles edge case of very large token counts", () => {
    const largeTokensResultArb = fc.record({
      originalMessageCount: fc.integer({ min: 1, max: 1000 }),
      prunedMessageCount: fc.integer({ min: 0, max: 1000 }),
      tokensRemoved: fc.integer({ min: 1000000, max: 100000000 }),
      strategy: fc.constantFrom("conservative", "balanced", "aggressive"),
      preservedMessages: fc.array(fc.integer({ min: 1, max: 10000 })),
      removedMessages: fc.array(fc.integer({ min: 1, max: 10000 })),
      compressionSummaries: fc.array(
        fc.record({
          messageRange: fc.tuple(
            fc.integer({ min: 0, max: 100 }),
            fc.integer({ min: 0, max: 100 }),
          ) as fc.Arbitrary<[number, number]>,
          summary: fc.string(),
        }),
      ),
    }) as fc.Arbitrary<PruningResult>;

    fc.assert(
      fc.property(
        fc.array(largeTokensResultArb, { minLength: 1, maxLength: 20 }),
        (pruningResults) => {
          const metrics = calculatePruningEffectiveness(pruningResults);

          // Should still produce valid results
          expect(metrics.averageReduction).toBeGreaterThanOrEqual(0);
          expect(metrics.averageReduction).toBeLessThanOrEqual(100);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
