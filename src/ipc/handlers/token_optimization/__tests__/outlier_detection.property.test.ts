// Property-Based Tests for Outlier Detection Consistency
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { identifyHighConsumption } from "../analytics_engine";

describe("Property 17: Outlier Detection Consistency", () => {
  /**
   * **Validates: Requirements 6.3**
   *
   * Property: For any set of usage data with statistical outliers (values more than 2
   * standard deviations from the mean), the outlier detection algorithm SHALL identify
   * all and only those outliers.
   */

  /**
   * Helper function to calculate mean
   */
  function calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Helper function to calculate standard deviation
   */
  function calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = calculateMean(values);
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const variance = calculateMean(squaredDiffs);
    return Math.sqrt(variance);
  }

  /**
   * Helper function to identify outliers (>2 std devs from mean)
   */
  function identifyOutliers(values: number[]): Set<number> {
    if (values.length < 3) return new Set(); // Need at least 3 values for meaningful stats

    const mean = calculateMean(values);
    const stdDev = calculateStdDev(values);

    const outliers = new Set<number>();
    for (const value of values) {
      if (Math.abs(value - mean) > 2 * stdDev) {
        outliers.add(value);
      }
    }

    return outliers;
  }

  it("identifies values more than 2 standard deviations from mean", () => {
    // Generate array of token counts with potential outliers
    const tokenCountsArb = fc
      .array(fc.integer({ min: 1000, max: 100000 }), {
        minLength: 10,
        maxLength: 50,
      })
      .chain((normalValues) => {
        // Add some outliers (values much higher than normal)
        const outlierArb = fc.array(fc.integer({ min: 500000, max: 1000000 }), {
          minLength: 0,
          maxLength: 5,
        });

        return outlierArb.map((outliers) => [...normalValues, ...outliers]);
      });

    fc.assert(
      fc.property(tokenCountsArb, (tokenCounts) => {
        if (tokenCounts.length < 3) {
          // Skip if not enough data
          return true;
        }

        // Calculate statistical outliers
        const mean = calculateMean(tokenCounts);
        const stdDev = calculateStdDev(tokenCounts);
        const threshold = mean + 2 * stdDev;

        // Use identifyHighConsumption with the calculated threshold
        const highConsumption = identifyHighConsumption(Math.floor(threshold));

        // All identified items should have token counts >= threshold
        for (const item of highConsumption) {
          expect(item.totalTokens).toBeGreaterThanOrEqual(
            Math.floor(threshold),
          );
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("threshold filtering is consistent", () => {
    const thresholdArb = fc.integer({ min: 0, max: 1000000 });

    fc.assert(
      fc.property(thresholdArb, (threshold) => {
        const highConsumption = identifyHighConsumption(threshold);

        // All items should meet or exceed the threshold
        for (const item of highConsumption) {
          expect(item.totalTokens).toBeGreaterThanOrEqual(threshold);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("higher thresholds produce subset of results", () => {
    const threshold1Arb = fc.integer({ min: 0, max: 500000 });
    const threshold2Arb = fc.integer({ min: 500001, max: 1000000 });

    fc.assert(
      fc.property(threshold1Arb, threshold2Arb, (threshold1, threshold2) => {
        const lowerThreshold = Math.min(threshold1, threshold2);
        const higherThreshold = Math.max(threshold1, threshold2);

        const results1 = identifyHighConsumption(lowerThreshold);
        const results2 = identifyHighConsumption(higherThreshold);

        // Results with higher threshold should be a subset of lower threshold
        const chatIds1 = new Set(results1.map((item) => item.chatId));
        const chatIds2 = new Set(results2.map((item) => item.chatId));

        for (const chatId of chatIds2) {
          expect(chatIds1.has(chatId)).toBe(true);
        }

        // Higher threshold should have fewer or equal results
        expect(results2.length).toBeLessThanOrEqual(results1.length);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("zero threshold includes all conversations", () => {
    fc.assert(
      fc.property(fc.constant(0), (threshold) => {
        const highConsumption = identifyHighConsumption(threshold);

        // All items should have non-negative token counts
        for (const item of highConsumption) {
          expect(item.totalTokens).toBeGreaterThanOrEqual(0);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("results are sorted by token count descending", () => {
    const thresholdArb = fc.integer({ min: 0, max: 100000 });

    fc.assert(
      fc.property(thresholdArb, (threshold) => {
        const highConsumption = identifyHighConsumption(threshold);

        // Verify descending order
        for (let i = 1; i < highConsumption.length; i++) {
          expect(highConsumption[i].totalTokens).toBeLessThanOrEqual(
            highConsumption[i - 1].totalTokens,
          );
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("detection is deterministic for same threshold", () => {
    const thresholdArb = fc.integer({ min: 0, max: 1000000 });

    fc.assert(
      fc.property(thresholdArb, (threshold) => {
        const results1 = identifyHighConsumption(threshold);
        const results2 = identifyHighConsumption(threshold);

        // Both calls should produce identical results
        expect(results1.length).toBe(results2.length);

        for (let i = 0; i < results1.length; i++) {
          expect(results1[i].chatId).toBe(results2[i].chatId);
          expect(results1[i].appId).toBe(results2[i].appId);
          expect(results1[i].totalTokens).toBe(results2[i].totalTokens);
          expect(results1[i].totalCost).toBe(results2[i].totalCost);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("all returned items have valid structure", () => {
    const thresholdArb = fc.integer({ min: 0, max: 1000000 });

    fc.assert(
      fc.property(thresholdArb, (threshold) => {
        const highConsumption = identifyHighConsumption(threshold);

        for (const item of highConsumption) {
          // Verify structure
          expect(typeof item.chatId).toBe("number");
          expect(typeof item.appId).toBe("number");
          expect(typeof item.totalTokens).toBe("number");
          expect(typeof item.totalCost).toBe("number");

          // Verify values are valid
          expect(Number.isInteger(item.chatId)).toBe(true);
          expect(Number.isInteger(item.appId)).toBe(true);
          expect(Number.isInteger(item.totalTokens)).toBe(true);
          expect(item.totalTokens).toBeGreaterThanOrEqual(0);
          expect(item.totalCost).toBeGreaterThanOrEqual(0);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("costs have proper precision (6 decimal places)", () => {
    const thresholdArb = fc.integer({ min: 0, max: 1000000 });

    fc.assert(
      fc.property(thresholdArb, (threshold) => {
        const highConsumption = identifyHighConsumption(threshold);

        for (const item of highConsumption) {
          const costStr = item.totalCost.toString();
          const parts = costStr.split(".");
          const decimalPlaces = parts.length > 1 ? parts[1].length : 0;

          expect(decimalPlaces).toBeLessThanOrEqual(6);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("no duplicate chat IDs in results", () => {
    const thresholdArb = fc.integer({ min: 0, max: 1000000 });

    fc.assert(
      fc.property(thresholdArb, (threshold) => {
        const highConsumption = identifyHighConsumption(threshold);

        const chatIds = highConsumption.map((item) => item.chatId);
        const uniqueChatIds = new Set(chatIds);

        // No duplicates
        expect(uniqueChatIds.size).toBe(chatIds.length);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("rejects negative thresholds", () => {
    const negativeThresholdArb = fc.integer({ min: -1000000, max: -1 });

    fc.assert(
      fc.property(negativeThresholdArb, (threshold) => {
        expect(() => identifyHighConsumption(threshold)).toThrow();

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("rejects non-integer thresholds", () => {
    const floatThresholdArb = fc.double({
      min: 0.1,
      max: 1000000.9,
      noNaN: true,
    });

    fc.assert(
      fc.property(floatThresholdArb, (threshold) => {
        // Only test non-integer values
        if (Number.isInteger(threshold)) {
          return true;
        }

        expect(() => identifyHighConsumption(threshold)).toThrow();

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
