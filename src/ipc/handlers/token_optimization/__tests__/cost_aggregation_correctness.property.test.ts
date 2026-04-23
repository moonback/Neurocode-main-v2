// Property-Based Tests for Cost Aggregation Correctness
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { getCosts, recordCost, getCostSummary } from "../cost_tracker";
import { initializeDatabase, db } from "@/db";
import { costRecords, apps, chats } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PROVIDER_CONFIGS } from "../provider_registry";

// Mock dependencies
vi.mock("@/paths/paths", () => ({
  getUserDataPath: vi.fn(() => require("os").tmpdir()),
}));

describe("Property 12: Cost Aggregation Correctness", () => {
  // Initialize database before all tests
  beforeAll(() => {
    initializeDatabase();
  });
  /**
   * **Validates: Requirements 4.3**
   *
   * Property: For any set of cost records, aggregating by any dimension (provider,
   * application, conversation, time period) SHALL produce a sum that equals the sum
   * of all individual cost records in that dimension.
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

  it("aggregating by provider produces sum equal to individual records", async () => {
    // Generate arbitrary cost records with different providers
    const providerIds = Object.keys(PROVIDER_CONFIGS).slice(0, 5); // Use first 5 providers
    const costRecordArb = fc.record({
      provider: fc.constantFrom(...providerIds),
      inputTokens: fc.integer({ min: 0, max: 100_000 }),
      outputTokens: fc.integer({ min: 0, max: 100_000 }),
      totalCost: fc.double({ min: 0, max: 100, noNaN: true }),
    });

    const costRecordsArb = fc.array(costRecordArb, {
      minLength: 1,
      maxLength: 20,
    });

    await fc.assert(
      fc.asyncProperty(costRecordsArb, async (records) => {
        // Clean up any existing cost records before this run
        db.delete(costRecords).where(eq(costRecords.appId, testAppId)).run();

        // Insert cost records
        for (const record of records) {
          await recordCost({
            timestamp: new Date(),
            provider: record.provider,
            appId: testAppId,
            chatId: testChatId,
            messageId: null,
            inputTokens: record.inputTokens,
            outputTokens: record.outputTokens,
            toolTokens: 0,
            inputCost: record.totalCost * 0.4, // Arbitrary split
            outputCost: record.totalCost * 0.6,
            totalCost: record.totalCost,
            model: `${record.provider}-model`,
          });
        }

        // Get all costs
        const allCosts = await getCosts({ appId: testAppId });

        // Calculate total cost manually
        const manualTotal = records.reduce(
          (sum, record) => sum + record.totalCost,
          0,
        );

        // Calculate total from retrieved records
        const retrievedTotal = allCosts.reduce(
          (sum, cost) => sum + cost.totalCost,
          0,
        );

        // Verify totals match (within floating point tolerance)
        expect(Math.abs(retrievedTotal - manualTotal)).toBeLessThan(0.000001);

        // Aggregate by provider
        const byProvider: Record<string, number> = {};
        for (const cost of allCosts) {
          if (!byProvider[cost.provider]) {
            byProvider[cost.provider] = 0;
          }
          byProvider[cost.provider] += cost.totalCost;
        }

        // Verify sum of provider aggregates equals total
        const providerAggregateSum = Object.values(byProvider).reduce(
          (sum, cost) => sum + cost,
          0,
        );
        expect(Math.abs(providerAggregateSum - retrievedTotal)).toBeLessThan(
          0.000001,
        );

        return true;
      }),
      { numRuns: 10 }, // Reduced runs due to database operations
    );
  });

  it("aggregating by application produces sum equal to individual records", async () => {
    // Create additional test app
    const app2Result = db
      .insert(apps)
      .values({
        name: "Test App 2",
        path: "/test/path2",
      })
      .returning()
      .get();
    const testAppId2 = app2Result.id;

    const chat2Result = db
      .insert(chats)
      .values({
        appId: testAppId2,
        title: "Test Chat 2",
      })
      .returning()
      .get();
    const testChatId2 = chat2Result.id;

    try {
      // Generate cost records for both apps
      const providerIds = Object.keys(PROVIDER_CONFIGS).slice(0, 3);
      const costRecordArb = fc.record({
        appId: fc.constantFrom(testAppId, testAppId2),
        provider: fc.constantFrom(...providerIds),
        totalCost: fc.double({ min: 0, max: 100, noNaN: true }),
      });

      const costRecordsArb = fc.array(costRecordArb, {
        minLength: 2,
        maxLength: 10,
      });

      await fc.assert(
        fc.asyncProperty(costRecordsArb, async (records) => {
          // Clean up any existing cost records before this run
          db.delete(costRecords).where(eq(costRecords.appId, testAppId)).run();
          db.delete(costRecords).where(eq(costRecords.appId, testAppId2)).run();

          // Insert cost records
          for (const record of records) {
            const chatId =
              record.appId === testAppId ? testChatId : testChatId2;
            await recordCost({
              timestamp: new Date(),
              provider: record.provider,
              appId: record.appId,
              chatId: chatId,
              messageId: null,
              inputTokens: 1000,
              outputTokens: 500,
              inputCost: record.totalCost * 0.4,
              outputCost: record.totalCost * 0.6,
              totalCost: record.totalCost,
              model: `${record.provider}-model`,
            });
          }

          // Get costs for both test apps only
          const costs1 = await getCosts({ appId: testAppId });
          const costs2 = await getCosts({ appId: testAppId2 });
          const allCosts = [...costs1, ...costs2];

          // Calculate total manually
          const manualTotal = records.reduce(
            (sum, record) => sum + record.totalCost,
            0,
          );

          // Aggregate by app
          const byApp: Record<number, number> = {};
          for (const cost of allCosts) {
            if (!byApp[cost.appId]) {
              byApp[cost.appId] = 0;
            }
            byApp[cost.appId] += cost.totalCost;
          }

          // Verify sum of app aggregates equals total
          const appAggregateSum = Object.values(byApp).reduce(
            (sum, cost) => sum + cost,
            0,
          );
          expect(Math.abs(appAggregateSum - manualTotal)).toBeLessThan(
            0.000001,
          );

          return true;
        }),
        { numRuns: 5 },
      );
    } finally {
      // Clean up
      db.delete(costRecords).where(eq(costRecords.appId, testAppId2)).run();
      db.delete(chats).where(eq(chats.id, testChatId2)).run();
      db.delete(apps).where(eq(apps.id, testAppId2)).run();
    }
  });

  it("aggregating by time period produces sum equal to individual records", async () => {
    // Generate cost records with different timestamps
    const now = new Date();
    const costRecordArb = fc.record({
      daysAgo: fc.integer({ min: 0, max: 30 }),
      totalCost: fc.double({ min: 0, max: 100, noNaN: true }),
    });

    const costRecordsArb = fc.array(costRecordArb, {
      minLength: 1,
      maxLength: 15,
    });

    await fc.assert(
      fc.asyncProperty(costRecordsArb, async (records) => {
        const provider = Object.keys(PROVIDER_CONFIGS)[0];

        // Clean up any existing cost records before this run
        db.delete(costRecords).where(eq(costRecords.appId, testAppId)).run();

        // Insert cost records with different timestamps
        for (const record of records) {
          const timestamp = new Date(now);
          timestamp.setDate(timestamp.getDate() - record.daysAgo);

          await recordCost({
            timestamp,
            provider,
            appId: testAppId,
            chatId: testChatId,
            messageId: null,
            inputTokens: 1000,
            outputTokens: 500,
            inputCost: record.totalCost * 0.4,
            outputCost: record.totalCost * 0.6,
            totalCost: record.totalCost,
            model: `${provider}-model`,
          });
        }

        // Get all costs
        const allCosts = await getCosts({ appId: testAppId });

        // Calculate total manually
        const manualTotal = records.reduce(
          (sum, record) => sum + record.totalCost,
          0,
        );

        // Calculate total from retrieved records
        const retrievedTotal = allCosts.reduce(
          (sum, cost) => sum + cost.totalCost,
          0,
        );

        // Verify totals match
        expect(Math.abs(retrievedTotal - manualTotal)).toBeLessThan(0.000001);

        // Filter by date range (last 7 days)
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentCosts = await getCosts({
          appId: testAppId,
          startDate: sevenDaysAgo,
        });

        // Calculate expected total for recent costs
        const expectedRecentTotal = records
          .filter((record) => record.daysAgo <= 7)
          .reduce((sum, record) => sum + record.totalCost, 0);

        const actualRecentTotal = recentCosts.reduce(
          (sum, cost) => sum + cost.totalCost,
          0,
        );

        // Verify filtered total matches expected
        expect(Math.abs(actualRecentTotal - expectedRecentTotal)).toBeLessThan(
          0.000001,
        );

        return true;
      }),
      { numRuns: 5 },
    );
  });

  it("getCostSummary aggregation matches manual calculation", async () => {
    // Generate cost records
    const providerIds = Object.keys(PROVIDER_CONFIGS).slice(0, 3);
    const costRecordArb = fc.record({
      provider: fc.constantFrom(...providerIds),
      totalCost: fc.double({ min: 0, max: 50, noNaN: true }),
    });

    const costRecordsArb = fc.array(costRecordArb, {
      minLength: 1,
      maxLength: 10,
    });

    await fc.assert(
      fc.asyncProperty(costRecordsArb, async (records) => {
        // Clean up any existing cost records before this run
        db.delete(costRecords).where(eq(costRecords.appId, testAppId)).run();

        // Insert cost records (all within today)
        for (const record of records) {
          await recordCost({
            timestamp: new Date(),
            provider: record.provider,
            appId: testAppId,
            chatId: testChatId,
            messageId: null,
            inputTokens: 1000,
            outputTokens: 500,
            inputCost: record.totalCost * 0.4,
            outputCost: record.totalCost * 0.6,
            totalCost: record.totalCost,
            model: `${record.provider}-model`,
          });
        }

        // Get cost summary for daily period
        const summary = await getCostSummary("daily", testAppId);

        // Calculate expected total
        const expectedTotal = records.reduce(
          (sum, record) => sum + record.totalCost,
          0,
        );

        // Verify summary total matches expected
        expect(Math.abs(summary.total - expectedTotal)).toBeLessThan(0.000001);

        // Verify sum of provider breakdown equals total
        const providerSum = Object.values(summary.byProvider).reduce(
          (sum, cost) => sum + cost,
          0,
        );
        expect(Math.abs(providerSum - summary.total)).toBeLessThan(0.000001);

        // Verify each provider's cost matches manual calculation
        const manualByProvider: Record<string, number> = {};
        for (const record of records) {
          if (!manualByProvider[record.provider]) {
            manualByProvider[record.provider] = 0;
          }
          manualByProvider[record.provider] += record.totalCost;
        }

        for (const provider in manualByProvider) {
          const expected = manualByProvider[provider];
          const actual = summary.byProvider[provider] || 0;
          expect(Math.abs(actual - expected)).toBeLessThan(0.000001);
        }

        return true;
      }),
      { numRuns: 5 },
    );
  });

  it("empty result set produces zero aggregate", async () => {
    // Query with filters that match no records
    const costs = await getCosts({
      appId: testAppId,
      provider: "nonexistent-provider",
    });

    expect(costs).toHaveLength(0);

    const total = costs.reduce((sum, cost) => sum + cost.totalCost, 0);
    expect(total).toBe(0);
  });

  it("single record aggregation equals record value", async () => {
    const provider = Object.keys(PROVIDER_CONFIGS)[0];
    const totalCost = 12.345678;

    await recordCost({
      timestamp: new Date(),
      provider,
      appId: testAppId,
      chatId: testChatId,
      messageId: null,
      inputTokens: 1000,
      outputTokens: 500,
      inputCost: totalCost * 0.4,
      outputCost: totalCost * 0.6,
      totalCost,
      model: `${provider}-model`,
    });

    const costs = await getCosts({ appId: testAppId });
    expect(costs).toHaveLength(1);

    const aggregateTotal = costs.reduce((sum, cost) => sum + cost.totalCost, 0);
    expect(Math.abs(aggregateTotal - totalCost)).toBeLessThan(0.000001);
  });
});
