// Property-Based Tests for Cost Comparison Data Integrity
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { getCosts, recordCost } from "../cost_tracker";
import { initializeDatabase, db } from "@/db";
import { costRecords, apps, chats } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PROVIDER_CONFIGS } from "../provider_registry";

describe("Property 14: Cost Comparison Data Integrity", () => {
  // Initialize database before all tests
  beforeAll(() => {
    initializeDatabase();
  });
  /**
   * **Validates: Requirements 4.8**
   *
   * Property: For any set of cost records across multiple providers and time periods,
   * the comparison data structure SHALL contain entries for all unique provider-period
   * combinations, and the sum of all comparison values SHALL equal the total cost
   * across all records.
   */

  let testAppId: number;
  let testChatId: number;

  beforeEach(() => {
    // Create test app
    const appResult = db
      .insert(apps)
      .values({
        name: "Test App",
        path: "/test/path",
      })
      .returning()
      .get();
    testAppId = appResult.id;

    // Create test chat
    const chatResult = db
      .insert(chats)
      .values({
        appId: testAppId,
        title: "Test Chat",
      })
      .returning()
      .get();
    testChatId = chatResult.id;
  });

  afterEach(() => {
    // Clean up test data
    db.delete(costRecords).where(eq(costRecords.appId, testAppId)).run();
    db.delete(chats).where(eq(chats.id, testChatId)).run();
    db.delete(apps).where(eq(apps.id, testAppId)).run();
  });

  it("comparison data contains all unique provider-period combinations", async () => {
    // Generate cost records with different providers and time periods
    const providerIds = Object.keys(PROVIDER_CONFIGS).slice(0, 3);
    const now = new Date();

    const costRecordArb = fc.record({
      provider: fc.constantFrom(...providerIds),
      daysAgo: fc.integer({ min: 0, max: 60 }), // Span across multiple months
      totalCost: fc.double({ min: 0.01, max: 100, noNaN: true }),
    });

    const costRecordsArb = fc.array(costRecordArb, {
      minLength: 3,
      maxLength: 20,
    });

    await fc.assert(
      fc.asyncProperty(costRecordsArb, async (records) => {
        // Insert cost records
        for (const record of records) {
          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - record.daysAgo);

          await recordCost({
            timestamp,
            provider: record.provider,
            appId: testAppId,
            chatId: testChatId,
            messageId: null,
            inputTokens: 1000,
            outputTokens: 500,
            toolTokens: 0,
            inputCost: record.totalCost * 0.4,
            outputCost: record.totalCost * 0.6,
            totalCost: record.totalCost,
            model: `${record.provider}-model`,
          });
        }

        // Get all costs
        const allCosts = await getCosts({ appId: testAppId });

        // Build comparison data structure: provider -> period -> cost
        const comparisonData: Record<string, Record<string, number>> = {};

        for (const cost of allCosts) {
          const provider = cost.provider;
          const timestamp = cost.timestamp;

          // Determine period (month-year)
          const period = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}`;

          if (!comparisonData[provider]) {
            comparisonData[provider] = {};
          }

          if (!comparisonData[provider][period]) {
            comparisonData[provider][period] = 0;
          }

          comparisonData[provider][period] += cost.totalCost;
        }

        // Verify all unique provider-period combinations are present
        const uniqueCombinations = new Set<string>();
        for (const cost of allCosts) {
          const provider = cost.provider;
          const period = `${cost.timestamp.getFullYear()}-${String(cost.timestamp.getMonth() + 1).padStart(2, "0")}`;
          uniqueCombinations.add(`${provider}:${period}`);
        }

        // Count combinations in comparison data
        let comparisonCombinations = 0;
        for (const provider in comparisonData) {
          for (const period in comparisonData[provider]) {
            comparisonCombinations++;
            // Verify this combination exists in the unique set
            expect(uniqueCombinations.has(`${provider}:${period}`)).toBe(true);
          }
        }

        // Verify counts match
        expect(comparisonCombinations).toBe(uniqueCombinations.size);

        // Verify sum of all comparison values equals total cost
        let comparisonTotal = 0;
        for (const provider in comparisonData) {
          for (const period in comparisonData[provider]) {
            comparisonTotal += comparisonData[provider][period];
          }
        }

        const actualTotal = allCosts.reduce(
          (sum, cost) => sum + cost.totalCost,
          0,
        );

        expect(Math.abs(comparisonTotal - actualTotal)).toBeLessThan(0.000001);

        return true;
      }),
      { numRuns: 10 },
    );
  });

  it("sum of comparison values equals total cost across all records", async () => {
    // Generate cost records
    const providerIds = Object.keys(PROVIDER_CONFIGS).slice(0, 4);
    const costRecordArb = fc.record({
      provider: fc.constantFrom(...providerIds),
      totalCost: fc.double({ min: 0.01, max: 100, noNaN: true }),
    });

    const costRecordsArb = fc.array(costRecordArb, {
      minLength: 1,
      maxLength: 15,
    });

    await fc.assert(
      fc.asyncProperty(costRecordsArb, async (records) => {
        // Insert cost records (all in current period)
        for (const record of records) {
          await recordCost({
            timestamp: new Date(),
            provider: record.provider,
            appId: testAppId,
            chatId: testChatId,
            messageId: null,
            inputTokens: 1000,
            outputTokens: 500,
            toolTokens: 0,
            inputCost: record.totalCost * 0.4,
            outputCost: record.totalCost * 0.6,
            totalCost: record.totalCost,
            model: `${record.provider}-model`,
          });
        }

        // Get all costs
        const allCosts = await getCosts({ appId: testAppId });

        // Build comparison data by provider
        const byProvider: Record<string, number> = {};
        for (const cost of allCosts) {
          if (!byProvider[cost.provider]) {
            byProvider[cost.provider] = 0;
          }
          byProvider[cost.provider] += cost.totalCost;
        }

        // Calculate sum of comparison values
        const comparisonSum = Object.values(byProvider).reduce(
          (sum, cost) => sum + cost,
          0,
        );

        // Calculate actual total
        const actualTotal = allCosts.reduce(
          (sum, cost) => sum + cost.totalCost,
          0,
        );

        // Verify sums match
        expect(Math.abs(comparisonSum - actualTotal)).toBeLessThan(0.000001);

        return true;
      }),
      { numRuns: 10 },
    );
  });

  it("comparison data handles multiple time periods correctly", async () => {
    const provider = Object.keys(PROVIDER_CONFIGS)[0];
    const now = new Date();

    // Create records spanning 3 months
    const months = [0, 1, 2]; // Current month, last month, 2 months ago
    const costsPerMonth = [10.5, 20.75, 15.25];

    for (let i = 0; i < months.length; i++) {
      const timestamp = new Date(now);
      timestamp.setMonth(timestamp.getMonth() - months[i]);

      await recordCost({
        timestamp,
        provider,
        appId: testAppId,
        chatId: testChatId,
        messageId: null,
        inputTokens: 1000,
        outputTokens: 500,
        toolTokens: 0,
        inputCost: costsPerMonth[i] * 0.4,
        outputCost: costsPerMonth[i] * 0.6,
        totalCost: costsPerMonth[i],
        model: `${provider}-model`,
      });
    }

    // Get all costs
    const allCosts = await getCosts({ appId: testAppId });

    // Build comparison data by period
    const byPeriod: Record<string, number> = {};
    for (const cost of allCosts) {
      const period = `${cost.timestamp.getFullYear()}-${String(cost.timestamp.getMonth() + 1).padStart(2, "0")}`;
      if (!byPeriod[period]) {
        byPeriod[period] = 0;
      }
      byPeriod[period] += cost.totalCost;
    }

    // Verify we have 3 periods
    expect(Object.keys(byPeriod).length).toBe(3);

    // Verify sum equals total
    const periodSum = Object.values(byPeriod).reduce(
      (sum, cost) => sum + cost,
      0,
    );
    const expectedTotal = costsPerMonth.reduce((sum, cost) => sum + cost, 0);

    expect(Math.abs(periodSum - expectedTotal)).toBeLessThan(0.000001);
  });

  it("comparison data handles single provider-period combination", async () => {
    const provider = Object.keys(PROVIDER_CONFIGS)[0];
    const totalCost = 25.5;

    await recordCost({
      timestamp: new Date(),
      provider,
      appId: testAppId,
      chatId: testChatId,
      messageId: null,
      inputTokens: 1000,
      outputTokens: 500,
      toolTokens: 0,
      inputCost: totalCost * 0.4,
      outputCost: totalCost * 0.6,
      totalCost,
      model: `${provider}-model`,
    });

    const allCosts = await getCosts({ appId: testAppId });

    // Build comparison data
    const comparisonData: Record<string, Record<string, number>> = {};
    for (const cost of allCosts) {
      const period = `${cost.timestamp.getFullYear()}-${String(cost.timestamp.getMonth() + 1).padStart(2, "0")}`;

      if (!comparisonData[cost.provider]) {
        comparisonData[cost.provider] = {};
      }
      if (!comparisonData[cost.provider][period]) {
        comparisonData[cost.provider][period] = 0;
      }
      comparisonData[cost.provider][period] += cost.totalCost;
    }

    // Verify single combination exists
    expect(Object.keys(comparisonData).length).toBe(1);
    expect(Object.keys(comparisonData[provider]).length).toBe(1);

    // Verify cost matches
    const comparisonTotal = Object.values(comparisonData[provider])[0];
    expect(Math.abs(comparisonTotal - totalCost)).toBeLessThan(0.000001);
  });

  it("comparison data handles empty result set", async () => {
    // Query with no matching records
    const allCosts = await getCosts({
      appId: testAppId,
      provider: "nonexistent-provider",
    });

    expect(allCosts).toHaveLength(0);

    // Build comparison data
    const comparisonData: Record<string, Record<string, number>> = {};
    for (const cost of allCosts) {
      const period = `${cost.timestamp.getFullYear()}-${String(cost.timestamp.getMonth() + 1).padStart(2, "0")}`;

      if (!comparisonData[cost.provider]) {
        comparisonData[cost.provider] = {};
      }
      if (!comparisonData[cost.provider][period]) {
        comparisonData[cost.provider][period] = 0;
      }
      comparisonData[cost.provider][period] += cost.totalCost;
    }

    // Verify empty comparison data
    expect(Object.keys(comparisonData).length).toBe(0);

    // Verify sum is zero
    let comparisonTotal = 0;
    for (const provider in comparisonData) {
      for (const period in comparisonData[provider]) {
        comparisonTotal += comparisonData[provider][period];
      }
    }

    expect(comparisonTotal).toBe(0);
  });

  it("comparison data preserves provider distinctions", async () => {
    // Create records for multiple providers with same cost
    const providerIds = Object.keys(PROVIDER_CONFIGS).slice(0, 3);
    const costPerProvider = 15.5;

    for (const provider of providerIds) {
      await recordCost({
        timestamp: new Date(),
        provider,
        appId: testAppId,
        chatId: testChatId,
        messageId: null,
        inputTokens: 1000,
        outputTokens: 500,
        toolTokens: 0,
        inputCost: costPerProvider * 0.4,
        outputCost: costPerProvider * 0.6,
        totalCost: costPerProvider,
        model: `${provider}-model`,
      });
    }

    const allCosts = await getCosts({ appId: testAppId });

    // Build comparison data by provider
    const byProvider: Record<string, number> = {};
    for (const cost of allCosts) {
      if (!byProvider[cost.provider]) {
        byProvider[cost.provider] = 0;
      }
      byProvider[cost.provider] += cost.totalCost;
    }

    // Verify all providers are present
    expect(Object.keys(byProvider).length).toBe(providerIds.length);

    // Verify each provider has correct cost
    for (const provider of providerIds) {
      expect(byProvider[provider]).toBeCloseTo(costPerProvider, 6);
    }

    // Verify sum equals total
    const providerSum = Object.values(byProvider).reduce(
      (sum, cost) => sum + cost,
      0,
    );
    const expectedTotal = costPerProvider * providerIds.length;

    expect(Math.abs(providerSum - expectedTotal)).toBeLessThan(0.000001);
  });

  it("comparison data aggregation is deterministic", async () => {
    const provider = Object.keys(PROVIDER_CONFIGS)[0];
    const totalCost = 30.75;

    await recordCost({
      timestamp: new Date(),
      provider,
      appId: testAppId,
      chatId: testChatId,
      messageId: null,
      inputTokens: 1000,
      outputTokens: 500,
      toolTokens: 0,
      inputCost: totalCost * 0.4,
      outputCost: totalCost * 0.6,
      totalCost,
      model: `${provider}-model`,
    });

    // Build comparison data multiple times
    const buildComparisonData = async () => {
      const costs = await getCosts({ appId: testAppId });
      const data: Record<string, number> = {};
      for (const cost of costs) {
        if (!data[cost.provider]) {
          data[cost.provider] = 0;
        }
        data[cost.provider] += cost.totalCost;
      }
      return data;
    };

    const data1 = await buildComparisonData();
    const data2 = await buildComparisonData();
    const data3 = await buildComparisonData();

    // All results should be identical
    expect(data1).toEqual(data2);
    expect(data2).toEqual(data3);
  });
});
