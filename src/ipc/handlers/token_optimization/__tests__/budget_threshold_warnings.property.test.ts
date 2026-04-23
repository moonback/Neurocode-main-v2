// Property-Based Tests for Budget Threshold Warnings
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { checkBudget } from "../cost_tracker";
import type { CostBudget } from "../cost_tracker";

describe("Property 13: Budget Threshold Warnings", () => {
  /**
   * **Validates: Requirements 4.5**
   *
   * Property: For any cost budget and current spending, warning events SHALL be
   * emitted when spending reaches exactly 80% and 95% of the budget, and SHALL
   * NOT be emitted at any other percentage.
   */

  it("warnings are emitted at exactly 80% and 95%, not at other percentages", () => {
    // Generate arbitrary budget amounts
    const budgetArb = fc.double({ min: 1, max: 10000, noNaN: true });

    fc.assert(
      fc.property(budgetArb, (budgetAmount) => {
        const budget: CostBudget = {
          amount: budgetAmount,
          period: "monthly",
          warningThreshold: 80,
        };

        // Test at exactly 80%
        const spend80 = budgetAmount * 0.8;
        const status80 = checkBudget(spend80, budget);
        expect(status80.isWarning).toBe(true);
        expect(status80.warningLevel).toBe(80);
        expect(status80.percentage).toBeCloseTo(80, 2);

        // Test at exactly 95%
        const spend95 = budgetAmount * 0.95;
        const status95 = checkBudget(spend95, budget);
        expect(status95.isWarning).toBe(true);
        expect(status95.warningLevel).toBe(95);
        expect(status95.percentage).toBeCloseTo(95, 2);

        // Test at 79% (just below 80%)
        const spend79 = budgetAmount * 0.79;
        const status79 = checkBudget(spend79, budget);
        expect(status79.isWarning).toBe(false);
        expect(status79.warningLevel).toBeUndefined();

        // Test at 81% (just above 80%, but not at 95%)
        const spend81 = budgetAmount * 0.81;
        const status81 = checkBudget(spend81, budget);
        expect(status81.isWarning).toBe(false);
        expect(status81.warningLevel).toBeUndefined();

        // Test at 94% (just below 95%)
        const spend94 = budgetAmount * 0.94;
        const status94 = checkBudget(spend94, budget);
        expect(status94.isWarning).toBe(false);
        expect(status94.warningLevel).toBeUndefined();

        // Test at 96% (just above 95%)
        const spend96 = budgetAmount * 0.96;
        const status96 = checkBudget(spend96, budget);
        expect(status96.isWarning).toBe(false);
        expect(status96.warningLevel).toBeUndefined();

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("no warnings emitted for spending below 80%", () => {
    const budgetArb = fc.double({ min: 1, max: 10000, noNaN: true });
    // Generate spending percentages below 80%
    const percentageArb = fc.double({ min: 0, max: 0.79, noNaN: true });

    fc.assert(
      fc.property(budgetArb, percentageArb, (budgetAmount, percentage) => {
        const budget: CostBudget = {
          amount: budgetAmount,
          period: "monthly",
          warningThreshold: 80,
        };

        const currentSpend = budgetAmount * percentage;
        const status = checkBudget(currentSpend, budget);

        expect(status.isWarning).toBe(false);
        expect(status.warningLevel).toBeUndefined();
        expect(status.percentage).toBeLessThan(80);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("no warnings emitted for spending between 80% and 95% (exclusive)", () => {
    const budgetArb = fc.double({ min: 1, max: 10000, noNaN: true });
    // Generate spending percentages between 80% and 95% (exclusive)
    const percentageArb = fc.double({ min: 0.81, max: 0.94, noNaN: true });

    fc.assert(
      fc.property(budgetArb, percentageArb, (budgetAmount, percentage) => {
        const budget: CostBudget = {
          amount: budgetAmount,
          period: "monthly",
          warningThreshold: 80,
        };

        const currentSpend = budgetAmount * percentage;
        const status = checkBudget(currentSpend, budget);

        // Should not trigger warning unless exactly at 80% or 95%
        // Due to floating point precision, we check if we're NOT close to 80 or 95
        const isNear80 = Math.abs(status.percentage - 80) < 0.01;
        const isNear95 = Math.abs(status.percentage - 95) < 0.01;

        if (!isNear80 && !isNear95) {
          expect(status.isWarning).toBe(false);
          expect(status.warningLevel).toBeUndefined();
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("no warnings emitted for spending above 95% but below 100%", () => {
    const budgetArb = fc.double({ min: 1, max: 10000, noNaN: true });
    // Generate spending percentages between 95% and 100% (exclusive of 95%)
    const percentageArb = fc.double({ min: 0.96, max: 0.99, noNaN: true });

    fc.assert(
      fc.property(budgetArb, percentageArb, (budgetAmount, percentage) => {
        const budget: CostBudget = {
          amount: budgetAmount,
          period: "monthly",
          warningThreshold: 80,
        };

        const currentSpend = budgetAmount * percentage;
        const status = checkBudget(currentSpend, budget);

        // Should not trigger warning unless exactly at 95%
        const isNear95 = Math.abs(status.percentage - 95) < 0.01;

        if (!isNear95) {
          expect(status.isWarning).toBe(false);
          expect(status.warningLevel).toBeUndefined();
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("budget exceeded flag is set when spending >= 100%", () => {
    const budgetArb = fc.double({ min: 1, max: 10000, noNaN: true });
    // Generate spending percentages >= 100%
    const percentageArb = fc.double({ min: 1.0, max: 2.0, noNaN: true });

    fc.assert(
      fc.property(budgetArb, percentageArb, (budgetAmount, percentage) => {
        const budget: CostBudget = {
          amount: budgetAmount,
          period: "monthly",
          warningThreshold: 80,
        };

        const currentSpend = budgetAmount * percentage;
        const status = checkBudget(currentSpend, budget);

        expect(status.isExceeded).toBe(true);
        expect(status.percentage).toBeGreaterThanOrEqual(100);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("budget not exceeded when spending < 100%", () => {
    const budgetArb = fc.double({ min: 1, max: 10000, noNaN: true });
    // Generate spending percentages < 100%
    const percentageArb = fc.double({ min: 0, max: 0.99, noNaN: true });

    fc.assert(
      fc.property(budgetArb, percentageArb, (budgetAmount, percentage) => {
        const budget: CostBudget = {
          amount: budgetAmount,
          period: "monthly",
          warningThreshold: 80,
        };

        const currentSpend = budgetAmount * percentage;
        const status = checkBudget(currentSpend, budget);

        expect(status.isExceeded).toBe(false);
        expect(status.percentage).toBeLessThan(100);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("percentage calculation is accurate", () => {
    const budgetArb = fc.double({ min: 1, max: 10000, noNaN: true });
    const spendArb = fc.double({ min: 0, max: 20000, noNaN: true });

    fc.assert(
      fc.property(budgetArb, spendArb, (budgetAmount, currentSpend) => {
        const budget: CostBudget = {
          amount: budgetAmount,
          period: "monthly",
          warningThreshold: 80,
        };

        const status = checkBudget(currentSpend, budget);

        // Calculate expected percentage
        const expectedPercentage = (currentSpend / budgetAmount) * 100;

        // Verify percentage is accurate (within 0.01 due to rounding to 2 decimals)
        expect(Math.abs(status.percentage - expectedPercentage)).toBeLessThan(
          0.01,
        );

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("zero spending results in 0% with no warnings", () => {
    const budgetArb = fc.double({ min: 1, max: 10000, noNaN: true });

    fc.assert(
      fc.property(budgetArb, (budgetAmount) => {
        const budget: CostBudget = {
          amount: budgetAmount,
          period: "monthly",
          warningThreshold: 80,
        };

        const status = checkBudget(0, budget);

        expect(status.currentSpend).toBe(0);
        expect(status.percentage).toBe(0);
        expect(status.isWarning).toBe(false);
        expect(status.isExceeded).toBe(false);
        expect(status.warningLevel).toBeUndefined();

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("warning detection is consistent across different budget amounts", () => {
    // Test that 80% and 95% thresholds work consistently regardless of budget size
    const budgetAmounts = [1, 10, 100, 1000, 10000];

    for (const budgetAmount of budgetAmounts) {
      const budget: CostBudget = {
        amount: budgetAmount,
        period: "monthly",
        warningThreshold: 80,
      };

      // Test 80% threshold
      const spend80 = budgetAmount * 0.8;
      const status80 = checkBudget(spend80, budget);
      expect(status80.isWarning).toBe(true);
      expect(status80.warningLevel).toBe(80);

      // Test 95% threshold
      const spend95 = budgetAmount * 0.95;
      const status95 = checkBudget(spend95, budget);
      expect(status95.isWarning).toBe(true);
      expect(status95.warningLevel).toBe(95);

      // Test non-threshold value
      const spend50 = budgetAmount * 0.5;
      const status50 = checkBudget(spend50, budget);
      expect(status50.isWarning).toBe(false);
      expect(status50.warningLevel).toBeUndefined();
    }
  });

  it("budget status is deterministic for same inputs", () => {
    const budget: CostBudget = {
      amount: 100,
      period: "monthly",
      warningThreshold: 80,
    };

    const currentSpend = 80;

    const status1 = checkBudget(currentSpend, budget);
    const status2 = checkBudget(currentSpend, budget);
    const status3 = checkBudget(currentSpend, budget);

    // All results should be identical
    expect(status1).toEqual(status2);
    expect(status2).toEqual(status3);
  });
});
