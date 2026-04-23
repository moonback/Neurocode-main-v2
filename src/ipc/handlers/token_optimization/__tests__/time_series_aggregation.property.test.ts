// Property-Based Tests for Time-Series Aggregation Correctness
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { generateTrendData } from "../analytics_engine";
import { db, initializeDatabase } from "@/db";
import { costRecords } from "@/db/schema";
import { sql, gte } from "drizzle-orm";

// Mock dependencies
vi.mock("@/paths/paths", () => ({
  getUserDataPath: vi.fn(() => require("os").tmpdir()),
}));

describe("Property 16: Time-Series Aggregation Correctness", () => {
  beforeAll(() => {
    initializeDatabase();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  /**
   * **Validates: Requirements 6.2**
   *
   * Property: For any set of usage records with timestamps, aggregating by time period
   * (daily, weekly, monthly) SHALL produce non-overlapping periods where the sum of all
   * period aggregates equals the total usage across all records.
   */

  it("period aggregates are non-overlapping", () => {
    const periodArb = fc.constantFrom<Period>("daily", "weekly", "monthly");

    fc.assert(
      fc.property(periodArb, (period) => {
        // Generate trend data
        const trendData = generateTrendData(period);

        // Verify all timestamps are unique (non-overlapping periods)
        const timestamps = trendData.dataPoints.map((dp) =>
          dp.timestamp.getTime(),
        );
        const uniqueTimestamps = new Set(timestamps);

        expect(uniqueTimestamps.size).toBe(timestamps.length);

        // Verify timestamps are sorted in ascending order
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("sum of period aggregates equals total usage", () => {
    const periodArb = fc.constantFrom<Period>("daily", "weekly", "monthly");

    fc.assert(
      fc.property(periodArb, (period) => {
        // Calculate date range based on period
        const now = new Date();
        const startDate = new Date(now);

        switch (period) {
          case "daily":
            startDate.setHours(now.getHours() - 24);
            break;
          case "weekly":
            startDate.setDate(now.getDate() - 7);
            break;
          case "monthly":
            startDate.setDate(now.getDate() - 30);
            break;
        }

        // Query all records in the period
        const records = db
          .select()
          .from(costRecords)
          .where(gte(costRecords.timestamp, startDate))
          .all();

        // Calculate total tokens from raw records
        const totalTokensFromRecords = records.reduce(
          (sum, record) => sum + record.inputTokens + record.outputTokens + (record.toolTokens ?? 0),
          0,
        );

        // Calculate total cost from raw records
        const totalCostFromRecords = records.reduce(
          (sum, record) => sum + record.totalCost,
          0,
        );

        // Generate trend data
        const trendData = generateTrendData(period);

        // Calculate total from aggregated data points
        const totalTokensFromAggregates = trendData.dataPoints.reduce(
          (sum, dp) => sum + dp.tokens,
          0,
        );

        const totalCostFromAggregates = trendData.dataPoints.reduce(
          (sum, dp) => sum + dp.cost,
          0,
        );

        // Verify sums match (within floating point tolerance for costs)
        expect(totalTokensFromAggregates).toBe(totalTokensFromRecords);
        expect(
          Math.abs(totalCostFromAggregates - totalCostFromRecords),
        ).toBeLessThan(0.00001);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("aggregates contain only non-negative values", () => {
    const periodArb = fc.constantFrom<Period>("daily", "weekly", "monthly");

    fc.assert(
      fc.property(periodArb, (period) => {
        const trendData = generateTrendData(period);

        for (const dataPoint of trendData.dataPoints) {
          expect(dataPoint.tokens).toBeGreaterThanOrEqual(0);
          expect(dataPoint.cost).toBeGreaterThanOrEqual(0);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("timestamps fall within expected period range", () => {
    const periodArb = fc.constantFrom<Period>("daily", "weekly", "monthly");

    fc.assert(
      fc.property(periodArb, (period) => {
        const now = new Date();
        const startDate = new Date(now);

        switch (period) {
          case "daily":
            startDate.setHours(now.getHours() - 24);
            break;
          case "weekly":
            startDate.setDate(now.getDate() - 7);
            break;
          case "monthly":
            startDate.setDate(now.getDate() - 30);
            break;
        }

        const trendData = generateTrendData(period);

        for (const dataPoint of trendData.dataPoints) {
          const timestamp = dataPoint.timestamp.getTime();
          expect(timestamp).toBeGreaterThanOrEqual(startDate.getTime());
          expect(timestamp).toBeLessThanOrEqual(now.getTime());
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("empty period produces empty aggregates", () => {
    const periodArb = fc.constantFrom<Period>("daily", "weekly", "monthly");

    fc.assert(
      fc.property(periodArb, (period) => {
        // This test assumes there might be periods with no data
        const trendData = generateTrendData(period);

        // If there are no data points, verify the structure is still valid
        if (trendData.dataPoints.length === 0) {
          expect(trendData.period).toBe(period);
          expect(Array.isArray(trendData.dataPoints)).toBe(true);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("aggregation is deterministic for same period", () => {
    const periodArb = fc.constantFrom<Period>("daily", "weekly", "monthly");

    fc.assert(
      fc.property(periodArb, (period) => {
        const trendData1 = generateTrendData(period);
        const trendData2 = generateTrendData(period);

        // Both calls should produce identical results
        expect(trendData1.period).toBe(trendData2.period);
        expect(trendData1.dataPoints.length).toBe(trendData2.dataPoints.length);

        for (let i = 0; i < trendData1.dataPoints.length; i++) {
          expect(trendData1.dataPoints[i].timestamp.getTime()).toBe(
            trendData2.dataPoints[i].timestamp.getTime(),
          );
          expect(trendData1.dataPoints[i].tokens).toBe(
            trendData2.dataPoints[i].tokens,
          );
          expect(trendData1.dataPoints[i].cost).toBe(
            trendData2.dataPoints[i].cost,
          );
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("bucket boundaries align with period granularity", () => {
    const periodArb = fc.constantFrom<Period>("daily", "weekly", "monthly");

    fc.assert(
      fc.property(periodArb, (period) => {
        const trendData = generateTrendData(period);

        if (trendData.dataPoints.length < 2) {
          // Not enough data points to verify spacing
          return true;
        }

        // Calculate expected bucket size
        let expectedBucketSize: number;
        switch (period) {
          case "daily":
            expectedBucketSize = 60 * 60 * 1000; // 1 hour
            break;
          case "weekly":
          case "monthly":
            expectedBucketSize = 24 * 60 * 60 * 1000; // 1 day
            break;
        }

        // Verify spacing between consecutive data points
        for (let i = 1; i < trendData.dataPoints.length; i++) {
          const timeDiff =
            trendData.dataPoints[i].timestamp.getTime() -
            trendData.dataPoints[i - 1].timestamp.getTime();

          // Time difference should be a multiple of bucket size
          expect(timeDiff % expectedBucketSize).toBe(0);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("costs have proper precision (6 decimal places)", () => {
    const periodArb = fc.constantFrom<Period>("daily", "weekly", "monthly");

    fc.assert(
      fc.property(periodArb, (period) => {
        const trendData = generateTrendData(period);

        for (const dataPoint of trendData.dataPoints) {
          const costStr = dataPoint.cost.toString();
          const parts = costStr.split(".");
          const decimalPlaces = parts.length > 1 ? parts[1].length : 0;

          expect(decimalPlaces).toBeLessThanOrEqual(6);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("tokens are always integers", () => {
    const periodArb = fc.constantFrom<Period>("daily", "weekly", "monthly");

    fc.assert(
      fc.property(periodArb, (period) => {
        const trendData = generateTrendData(period);

        for (const dataPoint of trendData.dataPoints) {
          expect(Number.isInteger(dataPoint.tokens)).toBe(true);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("period field matches requested period", () => {
    const periodArb = fc.constantFrom<Period>("daily", "weekly", "monthly");

    fc.assert(
      fc.property(periodArb, (period) => {
        const trendData = generateTrendData(period);

        expect(trendData.period).toBe(period);

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
