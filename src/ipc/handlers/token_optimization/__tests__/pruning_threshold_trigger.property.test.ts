// Property-Based Tests for Pruning Threshold Trigger
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import {
  shouldPrune,
  ConservativeStrategy,
  BalancedStrategy,
  AggressiveStrategy,
} from "../context_pruner";

describe("Property 1: Pruning Threshold Trigger", () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * Property: For any context window size and token count, pruning SHALL trigger
   * if and only if the token count is greater than or equal to 80% of the
   * context window size.
   */

  it("pruning triggers if and only if currentTokens >= threshold% of contextWindow", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // contextWindow
        fc.integer({ min: 0, max: 1_000_000 }), // currentTokens
        fc.integer({ min: 1, max: 100 }), // threshold percentage
        (contextWindow, currentTokens, threshold) => {
          const result = shouldPrune(currentTokens, contextWindow, threshold);
          const thresholdTokens = (contextWindow * threshold) / 100;

          // Pruning should trigger if and only if currentTokens >= thresholdTokens
          if (currentTokens >= thresholdTokens) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("pruning triggers at exactly 80% threshold for balanced strategy", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // contextWindow
        (contextWindow) => {
          const strategy = new BalancedStrategy();
          const threshold = 80; // Balanced strategy uses 80%
          const exactThreshold = (contextWindow * threshold) / 100;

          // At exactly the threshold, pruning should trigger
          expect(strategy.shouldPrune(exactThreshold, contextWindow)).toBe(
            true,
          );

          // Just below the threshold, pruning should not trigger
          if (exactThreshold > 0) {
            expect(
              strategy.shouldPrune(exactThreshold - 1, contextWindow),
            ).toBe(false);
          }

          // Above the threshold, pruning should trigger
          expect(strategy.shouldPrune(exactThreshold + 1, contextWindow)).toBe(
            true,
          );

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("conservative strategy triggers at 85% threshold", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // contextWindow
        (contextWindow) => {
          const strategy = new ConservativeStrategy();
          const threshold = 85; // Conservative strategy uses 85%
          const exactThreshold = (contextWindow * threshold) / 100;

          // At exactly the threshold, pruning should trigger
          expect(strategy.shouldPrune(exactThreshold, contextWindow)).toBe(
            true,
          );

          // Just below the threshold, pruning should not trigger
          if (exactThreshold > 0) {
            expect(
              strategy.shouldPrune(exactThreshold - 1, contextWindow),
            ).toBe(false);
          }

          // Above the threshold, pruning should trigger
          expect(strategy.shouldPrune(exactThreshold + 1, contextWindow)).toBe(
            true,
          );

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("aggressive strategy triggers at 70% threshold", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // contextWindow
        (contextWindow) => {
          const strategy = new AggressiveStrategy();
          const threshold = 70; // Aggressive strategy uses 70%
          const exactThreshold = (contextWindow * threshold) / 100;

          // At exactly the threshold, pruning should trigger
          expect(strategy.shouldPrune(exactThreshold, contextWindow)).toBe(
            true,
          );

          // Just below the threshold, pruning should not trigger
          if (exactThreshold > 0) {
            expect(
              strategy.shouldPrune(exactThreshold - 1, contextWindow),
            ).toBe(false);
          }

          // Above the threshold, pruning should trigger
          expect(strategy.shouldPrune(exactThreshold + 1, contextWindow)).toBe(
            true,
          );

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("pruning does not trigger when contextWindow is 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }), // currentTokens
        fc.integer({ min: 1, max: 100 }), // threshold
        (currentTokens, threshold) => {
          const result = shouldPrune(currentTokens, 0, threshold);
          expect(result).toBe(false);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("pruning threshold is monotonic: higher tokens more likely to trigger", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // contextWindow
        fc.integer({ min: 0, max: 1_000_000 }), // tokens1
        fc.integer({ min: 0, max: 1_000_000 }), // tokens2
        fc.integer({ min: 1, max: 100 }), // threshold
        (contextWindow, tokens1, tokens2, threshold) => {
          const result1 = shouldPrune(tokens1, contextWindow, threshold);
          const result2 = shouldPrune(tokens2, contextWindow, threshold);

          // Monotonicity property: if tokens1 < tokens2, then:
          // - If result1 is true, then result2 must also be true
          // - If result2 is false, then result1 must also be false
          if (tokens1 < tokens2) {
            if (result1) {
              expect(result2).toBe(true);
            }
            if (!result2) {
              expect(result1).toBe(false);
            }
          }

          // If tokens are equal, results should be equal
          if (tokens1 === tokens2) {
            expect(result1).toBe(result2);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("threshold percentage of 100 means pruning triggers only when tokens >= contextWindow", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // contextWindow
        fc.integer({ min: 0, max: 1_000_000 }), // currentTokens
        (contextWindow, currentTokens) => {
          const result = shouldPrune(currentTokens, contextWindow, 100);

          if (currentTokens >= contextWindow) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("threshold percentage of 1 means pruning triggers when tokens >= 1% of contextWindow", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1_000_000 }), // contextWindow (at least 100 to avoid rounding issues)
        fc.integer({ min: 0, max: 1_000_000 }), // currentTokens
        (contextWindow, currentTokens) => {
          const result = shouldPrune(currentTokens, contextWindow, 1);
          const onePercent = contextWindow / 100;

          if (currentTokens >= onePercent) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("strategy threshold override works correctly", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // contextWindow
        fc.integer({ min: 0, max: 1_000_000 }), // currentTokens
        fc.integer({ min: 1, max: 100 }), // custom threshold
        (contextWindow, currentTokens, customThreshold) => {
          const strategy = new BalancedStrategy();

          // Use custom threshold instead of strategy's default
          const result = strategy.shouldPrune(
            currentTokens,
            contextWindow,
            customThreshold,
          );

          const thresholdTokens = (contextWindow * customThreshold) / 100;

          if (currentTokens >= thresholdTokens) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
