// Property-Based Tests for Token Distribution Completeness
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { calculateTokenUsage } from "../analytics_engine";

describe("Property 19: Token Distribution Completeness", () => {
  /**
   * **Validates: Requirements 6.5**
   *
   * Property: For any message array, the sum of token distributions across all categories
   * (system instructions, user messages, assistant responses, context) SHALL equal the
   * total token count for the entire message array.
   */

  it("sum of token distributions equals total tokens", () => {
    // Generate arbitrary date ranges
    const dateRangeArb = fc
      .tuple(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
      )
      .filter(([start, end]) => start <= end);

    fc.assert(
      fc.property(dateRangeArb, ([startDate, endDate]) => {
        const tokenUsage = calculateTokenUsage(startDate, endDate);

        // Calculate sum of tokens by provider
        const sumByProvider = Object.values(tokenUsage.byProvider).reduce(
          (sum, tokens) => sum + tokens,
          0,
        );

        // Sum by provider should equal total
        expect(sumByProvider).toBe(tokenUsage.total);

        // Calculate sum of tokens by app
        const sumByApp = Object.values(tokenUsage.byApp).reduce(
          (sum, tokens) => sum + tokens,
          0,
        );

        // Sum by app should equal total
        expect(sumByApp).toBe(tokenUsage.total);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("total tokens is non-negative", () => {
    const dateRangeArb = fc
      .tuple(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
      )
      .filter(([start, end]) => start <= end);

    fc.assert(
      fc.property(dateRangeArb, ([startDate, endDate]) => {
        const tokenUsage = calculateTokenUsage(startDate, endDate);

        expect(tokenUsage.total).toBeGreaterThanOrEqual(0);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("all category tokens are non-negative", () => {
    const dateRangeArb = fc
      .tuple(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
      )
      .filter(([start, end]) => start <= end);

    fc.assert(
      fc.property(dateRangeArb, ([startDate, endDate]) => {
        const tokenUsage = calculateTokenUsage(startDate, endDate);

        // All provider tokens should be non-negative
        for (const tokens of Object.values(tokenUsage.byProvider)) {
          expect(tokens).toBeGreaterThanOrEqual(0);
        }

        // All app tokens should be non-negative
        for (const tokens of Object.values(tokenUsage.byApp)) {
          expect(tokens).toBeGreaterThanOrEqual(0);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("all token counts are integers", () => {
    const dateRangeArb = fc
      .tuple(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
      )
      .filter(([start, end]) => start <= end);

    fc.assert(
      fc.property(dateRangeArb, ([startDate, endDate]) => {
        const tokenUsage = calculateTokenUsage(startDate, endDate);

        // Total should be an integer
        expect(Number.isInteger(tokenUsage.total)).toBe(true);

        // All provider tokens should be integers
        for (const tokens of Object.values(tokenUsage.byProvider)) {
          expect(Number.isInteger(tokens)).toBe(true);
        }

        // All app tokens should be integers
        for (const tokens of Object.values(tokenUsage.byApp)) {
          expect(Number.isInteger(tokens)).toBe(true);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("empty date range produces zero tokens", () => {
    // Use a date range in the far future where no data exists
    const futureDate = new Date("2099-01-01");

    fc.assert(
      fc.property(
        fc.constant([futureDate, futureDate]),
        ([startDate, endDate]) => {
          const tokenUsage = calculateTokenUsage(startDate, endDate);

          expect(tokenUsage.total).toBe(0);
          expect(Object.keys(tokenUsage.byProvider).length).toBe(0);
          expect(Object.keys(tokenUsage.byApp).length).toBe(0);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("calculation is deterministic for same date range", () => {
    const dateRangeArb = fc
      .tuple(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
      )
      .filter(([start, end]) => start <= end);

    fc.assert(
      fc.property(dateRangeArb, ([startDate, endDate]) => {
        const tokenUsage1 = calculateTokenUsage(startDate, endDate);
        const tokenUsage2 = calculateTokenUsage(startDate, endDate);

        // Both calls should produce identical results
        expect(tokenUsage1.total).toBe(tokenUsage2.total);
        expect(tokenUsage1.saved).toBe(tokenUsage2.saved);

        // Provider breakdowns should match
        expect(Object.keys(tokenUsage1.byProvider).length).toBe(
          Object.keys(tokenUsage2.byProvider).length,
        );
        for (const provider of Object.keys(tokenUsage1.byProvider)) {
          expect(tokenUsage1.byProvider[provider]).toBe(
            tokenUsage2.byProvider[provider],
          );
        }

        // App breakdowns should match
        expect(Object.keys(tokenUsage1.byApp).length).toBe(
          Object.keys(tokenUsage2.byApp).length,
        );
        for (const appId of Object.keys(tokenUsage1.byApp)) {
          expect(tokenUsage1.byApp[appId]).toBe(tokenUsage2.byApp[appId]);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("rejects invalid date ranges (start > end)", () => {
    const invalidDateRangeArb = fc
      .tuple(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
      )
      .filter(([start, end]) => start > end);

    fc.assert(
      fc.property(invalidDateRangeArb, ([startDate, endDate]) => {
        expect(() => calculateTokenUsage(startDate, endDate)).toThrow();

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("single day range produces valid results", () => {
    const singleDayArb = fc
      .date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") })
      .map((date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        return [startOfDay, endOfDay] as [Date, Date];
      });

    fc.assert(
      fc.property(singleDayArb, ([startDate, endDate]) => {
        const tokenUsage = calculateTokenUsage(startDate, endDate);

        // Should produce valid structure
        expect(typeof tokenUsage.total).toBe("number");
        expect(typeof tokenUsage.byProvider).toBe("object");
        expect(typeof tokenUsage.byApp).toBe("object");
        expect(typeof tokenUsage.saved).toBe("number");

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("no category has more tokens than total", () => {
    const dateRangeArb = fc
      .tuple(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
      )
      .filter(([start, end]) => start <= end);

    fc.assert(
      fc.property(dateRangeArb, ([startDate, endDate]) => {
        const tokenUsage = calculateTokenUsage(startDate, endDate);

        // Each provider should not exceed total
        for (const tokens of Object.values(tokenUsage.byProvider)) {
          expect(tokens).toBeLessThanOrEqual(tokenUsage.total);
        }

        // Each app should not exceed total
        for (const tokens of Object.values(tokenUsage.byApp)) {
          expect(tokens).toBeLessThanOrEqual(tokenUsage.total);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("saved tokens is non-negative", () => {
    const dateRangeArb = fc
      .tuple(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
      )
      .filter(([start, end]) => start <= end);

    fc.assert(
      fc.property(dateRangeArb, ([startDate, endDate]) => {
        const tokenUsage = calculateTokenUsage(startDate, endDate);

        expect(tokenUsage.saved).toBeGreaterThanOrEqual(0);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("provider keys are non-empty strings", () => {
    const dateRangeArb = fc
      .tuple(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
      )
      .filter(([start, end]) => start <= end);

    fc.assert(
      fc.property(dateRangeArb, ([startDate, endDate]) => {
        const tokenUsage = calculateTokenUsage(startDate, endDate);

        for (const provider of Object.keys(tokenUsage.byProvider)) {
          expect(typeof provider).toBe("string");
          expect(provider.length).toBeGreaterThan(0);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("app IDs are valid integers", () => {
    const dateRangeArb = fc
      .tuple(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
        fc.date({ min: new Date("2020-01-01"), max: new Date("2025-12-31") }),
      )
      .filter(([start, end]) => start <= end);

    fc.assert(
      fc.property(dateRangeArb, ([startDate, endDate]) => {
        const tokenUsage = calculateTokenUsage(startDate, endDate);

        for (const appIdStr of Object.keys(tokenUsage.byApp)) {
          const appId = Number(appIdStr);
          expect(Number.isInteger(appId)).toBe(true);
          expect(appId).toBeGreaterThan(0);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
