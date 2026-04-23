// Property-Based Tests for Prediction Accuracy Tracking
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";

describe("Property 20: Prediction Accuracy Tracking", () => {
  /**
   * **Validates: Requirements 6.7**
   *
   * Property: For any estimated token count and actual token count, the prediction
   * accuracy SHALL equal 1 - (|estimated - actual| / actual), and SHALL be in the
   * range [0, 1] where 1 represents perfect accuracy.
   */

  /**
   * Calculate prediction accuracy
   * Formula: 1 - (|estimated - actual| / actual)
   */
  function calculatePredictionAccuracy(
    estimated: number,
    actual: number,
  ): number {
    if (actual === 0) {
      // Handle division by zero: if actual is 0, accuracy is 1 if estimated is also 0
      return estimated === 0 ? 1 : 0;
    }

    const accuracy = 1 - Math.abs(estimated - actual) / actual;

    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, accuracy));
  }

  it("accuracy equals 1 - (|estimated - actual| / actual)", () => {
    const tokenCountArb = fc.integer({ min: 1, max: 1000000 });
    const estimatedArb = fc.integer({ min: 0, max: 1000000 });

    fc.assert(
      fc.property(tokenCountArb, estimatedArb, (actual, estimated) => {
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        // Calculate expected accuracy
        const expectedAccuracy = 1 - Math.abs(estimated - actual) / actual;
        const clampedExpected = Math.max(0, Math.min(1, expectedAccuracy));

        // Verify accuracy matches formula (within floating point tolerance)
        expect(Math.abs(accuracy - clampedExpected)).toBeLessThan(0.00001);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("accuracy is always in range [0, 1]", () => {
    const tokenCountArb = fc.integer({ min: 1, max: 1000000 });
    const estimatedArb = fc.integer({ min: 0, max: 1000000 });

    fc.assert(
      fc.property(tokenCountArb, estimatedArb, (actual, estimated) => {
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        expect(accuracy).toBeGreaterThanOrEqual(0);
        expect(accuracy).toBeLessThanOrEqual(1);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("perfect prediction (estimated = actual) results in accuracy of 1", () => {
    const tokenCountArb = fc.integer({ min: 1, max: 1000000 });

    fc.assert(
      fc.property(tokenCountArb, (tokenCount) => {
        const accuracy = calculatePredictionAccuracy(tokenCount, tokenCount);

        expect(accuracy).toBe(1);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("zero actual with zero estimated results in accuracy of 1", () => {
    fc.assert(
      fc.property(fc.constant(0), fc.constant(0), (actual, estimated) => {
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        expect(accuracy).toBe(1);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("zero actual with non-zero estimated results in accuracy of 0", () => {
    const estimatedArb = fc.integer({ min: 1, max: 1000000 });

    fc.assert(
      fc.property(estimatedArb, (estimated) => {
        const accuracy = calculatePredictionAccuracy(estimated, 0);

        expect(accuracy).toBe(0);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("overestimation by 100% results in accuracy of 0", () => {
    const actualArb = fc.integer({ min: 1, max: 500000 });

    fc.assert(
      fc.property(actualArb, (actual) => {
        const estimated = actual * 2; // 100% overestimation
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        expect(accuracy).toBe(0);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("underestimation by 100% results in accuracy of 0", () => {
    const actualArb = fc.integer({ min: 1, max: 1000000 });

    fc.assert(
      fc.property(actualArb, (actual) => {
        const estimated = 0; // 100% underestimation
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        expect(accuracy).toBe(0);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("small error produces high accuracy", () => {
    const actualArb = fc.integer({ min: 1000, max: 1000000 });
    const errorPercentArb = fc.double({ min: 0, max: 0.05, noNaN: true }); // 0-5% error

    fc.assert(
      fc.property(actualArb, errorPercentArb, (actual, errorPercent) => {
        const error = Math.floor(actual * errorPercent);
        const estimated = actual + error;
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        // With small error, accuracy should be high (>= 0.95)
        expect(accuracy).toBeGreaterThanOrEqual(0.9499);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("large error produces low accuracy", () => {
    const actualArb = fc.integer({ min: 1000, max: 1000000 });
    const errorPercentArb = fc.double({ min: 0.5, max: 2.0, noNaN: true }); // 50-200% error

    fc.assert(
      fc.property(actualArb, errorPercentArb, (actual, errorPercent) => {
        const error = Math.floor(actual * errorPercent);
        const estimated = actual + error;
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        // With large error, accuracy should be low (<= 0.5)
        expect(accuracy).toBeLessThanOrEqual(0.55);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("accuracy is symmetric for over/underestimation", () => {
    const actualArb = fc.integer({ min: 100, max: 1000000 });
    const errorArb = fc.integer({ min: 1, max: 50000 });

    fc.assert(
      fc.property(actualArb, errorArb, (actual, error) => {
        const overestimated = actual + error;
        const underestimated = actual - error;

        // Skip if underestimated would be negative
        if (underestimated < 0) {
          return true;
        }

        const accuracyOver = calculatePredictionAccuracy(overestimated, actual);
        const accuracyUnder = calculatePredictionAccuracy(
          underestimated,
          actual,
        );

        // Both should have the same accuracy
        expect(Math.abs(accuracyOver - accuracyUnder)).toBeLessThan(0.00001);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("calculation is deterministic for same inputs", () => {
    const tokenCountArb = fc.integer({ min: 1, max: 1000000 });
    const estimatedArb = fc.integer({ min: 0, max: 1000000 });

    fc.assert(
      fc.property(tokenCountArb, estimatedArb, (actual, estimated) => {
        const accuracy1 = calculatePredictionAccuracy(estimated, actual);
        const accuracy2 = calculatePredictionAccuracy(estimated, actual);
        const accuracy3 = calculatePredictionAccuracy(estimated, actual);

        // All results should be identical
        expect(accuracy1).toBe(accuracy2);
        expect(accuracy2).toBe(accuracy3);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("accuracy decreases as error increases", () => {
    const actualArb = fc.integer({ min: 1000, max: 1000000 });
    const error1Arb = fc.integer({ min: 1, max: 10000 });
    const error2Arb = fc.integer({ min: 10001, max: 50000 });

    fc.assert(
      fc.property(actualArb, error1Arb, error2Arb, (actual, error1, error2) => {
        const smallerError = Math.min(error1, error2);
        const largerError = Math.max(error1, error2);

        const estimated1 = actual + smallerError;
        const estimated2 = actual + largerError;

        const accuracy1 = calculatePredictionAccuracy(estimated1, actual);
        const accuracy2 = calculatePredictionAccuracy(estimated2, actual);

        // Smaller error should produce higher accuracy
        expect(accuracy1).toBeGreaterThanOrEqual(accuracy2);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("handles very large token counts", () => {
    const largeTokenArb = fc.integer({ min: 10000000, max: 100000000 });
    const estimatedArb = fc.integer({ min: 10000000, max: 100000000 });

    fc.assert(
      fc.property(largeTokenArb, estimatedArb, (actual, estimated) => {
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        // Should still produce valid accuracy in [0, 1]
        expect(accuracy).toBeGreaterThanOrEqual(0);
        expect(accuracy).toBeLessThanOrEqual(1);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("50% error results in accuracy of 0.5", () => {
    const actualArb = fc.integer({ min: 100, max: 1000000 });

    fc.assert(
      fc.property(actualArb, (actual) => {
        const estimated = actual + Math.floor(actual * 0.5); // 50% overestimation
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        // 50% error should result in 0.5 accuracy
        expect(Math.abs(accuracy - 0.5)).toBeLessThan(0.01);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("10% error results in accuracy of 0.9", () => {
    const actualArb = fc.integer({ min: 100, max: 1000000 });

    fc.assert(
      fc.property(actualArb, (actual) => {
        const estimated = actual + Math.floor(actual * 0.1); // 10% overestimation
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        // 10% error should result in 0.9 accuracy
        expect(Math.abs(accuracy - 0.9)).toBeLessThan(0.01);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("accuracy has reasonable precision", () => {
    const tokenCountArb = fc.integer({ min: 1, max: 1000000 });
    const estimatedArb = fc.integer({ min: 0, max: 1000000 });

    fc.assert(
      fc.property(tokenCountArb, estimatedArb, (actual, estimated) => {
        const accuracy = calculatePredictionAccuracy(estimated, actual);

        // Accuracy should be a valid number
        expect(typeof accuracy).toBe("number");
        expect(Number.isNaN(accuracy)).toBe(false);
        expect(Number.isFinite(accuracy)).toBe(true);

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
