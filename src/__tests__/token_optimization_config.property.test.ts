// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import * as schema from "../db/schema";
import type { TokenOptimizationConfig } from "../ipc/handlers/token_optimization/types";

// Arbitrary generators for TokenOptimizationConfig

const pruningStrategyArb = fc.constantFrom<
  "conservative" | "balanced" | "aggressive"
>("conservative", "balanced", "aggressive");

const periodArb = fc.constantFrom<"daily" | "weekly" | "monthly">(
  "daily",
  "weekly",
  "monthly",
);

const ratioArb = fc.double({ min: 0, max: 1, noNaN: true });

const tokenAllocationArb = fc
  .record({
    inputContextRatio: ratioArb,
    systemInstructionsRatio: ratioArb,
    outputGenerationRatio: ratioArb,
  })
  .map((allocation) => {
    // Normalize ratios to sum to 1.0
    const sum =
      allocation.inputContextRatio +
      allocation.systemInstructionsRatio +
      allocation.outputGenerationRatio;
    if (sum === 0) {
      // Avoid division by zero, use default ratios
      return {
        inputContextRatio: 0.7,
        systemInstructionsRatio: 0.1,
        outputGenerationRatio: 0.2,
      };
    }
    return {
      inputContextRatio: allocation.inputContextRatio / sum,
      systemInstructionsRatio: allocation.systemInstructionsRatio / sum,
      outputGenerationRatio: allocation.outputGenerationRatio / sum,
    };
  });

const costBudgetArb = fc.record({
  amount: fc.double({ min: 0.01, max: 10000, noNaN: true }),
  period: periodArb,
  warningThreshold: fc.integer({ min: 1, max: 99 }),
});

const tokenOptimizationConfigArb: fc.Arbitrary<TokenOptimizationConfig> = fc
  .record({
    pruningStrategy: pruningStrategyArb,
    enableAutoPruning: fc.boolean(),
    pruningThreshold: fc.integer({ min: 50, max: 95 }),
    tokenAllocation: tokenAllocationArb,
    enableCostTracking: fc.boolean(),
    costBudget: fc.option(costBudgetArb, { nil: undefined }),
    enableMessagePinning: fc.boolean(),
    slidingWindowSize: fc.option(fc.integer({ min: 1, max: 100 }), {
      nil: undefined,
    }),
    coordinateWithCompaction: fc.boolean(),
    coordinateWithSmartContext: fc.boolean(),
  })
  .map((config) => {
    // Ensure we have a proper object with Object.prototype
    return JSON.parse(JSON.stringify(config)) as TokenOptimizationConfig;
  });

// **Validates: Requirements 8.1, 8.3, 8.4**
describe("Property 22: Configuration Round-Trip Preservation", () => {
  let testDb: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary database for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "token-opt-test-"));
    testDbPath = path.join(tempDir, "test.db");

    sqlite = new Database(testDbPath);
    sqlite.pragma("foreign_keys = ON");

    testDb = drizzle(sqlite, { schema });

    // Run migrations
    const migrationsFolder = path.join(__dirname, "..", "..", "drizzle");
    if (fs.existsSync(migrationsFolder)) {
      migrate(testDb, { migrationsFolder });
    }
  });

  afterEach(() => {
    // Clean up test database
    sqlite.close();
    const tempDir = path.dirname(testDbPath);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("serializing config to JSON, storing in database, retrieving, and deserializing produces equivalent object", () => {
    fc.assert(
      fc.property(tokenOptimizationConfigArb, (config) => {
        // Step 1: Store in database (JSON serialization happens automatically)
        const inserted = testDb
          .insert(schema.tokenOptimizationConfig)
          .values({
            appId: null, // Global config
            config: config as any, // Drizzle handles JSON serialization
          })
          .returning()
          .get();

        // Step 2: Retrieve from database
        const retrieved = testDb
          .select()
          .from(schema.tokenOptimizationConfig)
          .where(eq(schema.tokenOptimizationConfig.id, inserted.id))
          .get();

        expect(retrieved).toBeDefined();
        expect(retrieved!.config).toBeDefined();

        // Step 3: Deserialize and compare
        const deserializedConfig = retrieved!.config!;

        // Verify all fields are equivalent
        expect(deserializedConfig.pruningStrategy).toBe(config.pruningStrategy);
        expect(deserializedConfig.enableAutoPruning).toBe(
          config.enableAutoPruning,
        );
        expect(deserializedConfig.pruningThreshold).toBe(
          config.pruningThreshold,
        );

        // Token allocation
        expect(
          deserializedConfig.tokenAllocation.inputContextRatio,
        ).toBeCloseTo(config.tokenAllocation.inputContextRatio, 10);
        expect(
          deserializedConfig.tokenAllocation.systemInstructionsRatio,
        ).toBeCloseTo(config.tokenAllocation.systemInstructionsRatio, 10);
        expect(
          deserializedConfig.tokenAllocation.outputGenerationRatio,
        ).toBeCloseTo(config.tokenAllocation.outputGenerationRatio, 10);

        // Cost tracking
        expect(deserializedConfig.enableCostTracking).toBe(
          config.enableCostTracking,
        );

        if (config.costBudget) {
          expect(deserializedConfig.costBudget).toBeDefined();
          expect(deserializedConfig.costBudget!.amount).toBeCloseTo(
            config.costBudget.amount,
            10,
          );
          expect(deserializedConfig.costBudget!.period).toBe(
            config.costBudget.period,
          );
          expect(deserializedConfig.costBudget!.warningThreshold).toBe(
            config.costBudget.warningThreshold,
          );
        } else {
          expect(deserializedConfig.costBudget).toBeUndefined();
        }

        // Message pinning
        expect(deserializedConfig.enableMessagePinning).toBe(
          config.enableMessagePinning,
        );

        if (config.slidingWindowSize !== undefined) {
          expect(deserializedConfig.slidingWindowSize).toBe(
            config.slidingWindowSize,
          );
        } else {
          expect(deserializedConfig.slidingWindowSize).toBeUndefined();
        }

        // Integration settings
        expect(deserializedConfig.coordinateWithCompaction).toBe(
          config.coordinateWithCompaction,
        );
        expect(deserializedConfig.coordinateWithSmartContext).toBe(
          config.coordinateWithSmartContext,
        );

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("round-trip through JSON.parse and JSON.stringify preserves config structure", () => {
    fc.assert(
      fc.property(tokenOptimizationConfigArb, (config) => {
        // Serialize and deserialize using JSON
        const serialized = JSON.stringify(config);
        const deserialized = JSON.parse(serialized) as TokenOptimizationConfig;

        // Verify structure is preserved
        expect(deserialized.pruningStrategy).toBe(config.pruningStrategy);
        expect(deserialized.enableAutoPruning).toBe(config.enableAutoPruning);
        expect(deserialized.pruningThreshold).toBe(config.pruningThreshold);

        // Token allocation
        expect(deserialized.tokenAllocation.inputContextRatio).toBeCloseTo(
          config.tokenAllocation.inputContextRatio,
          10,
        );
        expect(
          deserialized.tokenAllocation.systemInstructionsRatio,
        ).toBeCloseTo(config.tokenAllocation.systemInstructionsRatio, 10);
        expect(deserialized.tokenAllocation.outputGenerationRatio).toBeCloseTo(
          config.tokenAllocation.outputGenerationRatio,
          10,
        );

        // Cost tracking
        expect(deserialized.enableCostTracking).toBe(config.enableCostTracking);

        if (config.costBudget) {
          expect(deserialized.costBudget).toBeDefined();
          expect(deserialized.costBudget!.amount).toBeCloseTo(
            config.costBudget.amount,
            10,
          );
          expect(deserialized.costBudget!.period).toBe(
            config.costBudget.period,
          );
          expect(deserialized.costBudget!.warningThreshold).toBe(
            config.costBudget.warningThreshold,
          );
        } else {
          expect(deserialized.costBudget).toBeUndefined();
        }

        // Message pinning
        expect(deserialized.enableMessagePinning).toBe(
          config.enableMessagePinning,
        );

        if (config.slidingWindowSize !== undefined) {
          expect(deserialized.slidingWindowSize).toBe(config.slidingWindowSize);
        } else {
          expect(deserialized.slidingWindowSize).toBeUndefined();
        }

        // Integration settings
        expect(deserialized.coordinateWithCompaction).toBe(
          config.coordinateWithCompaction,
        );
        expect(deserialized.coordinateWithSmartContext).toBe(
          config.coordinateWithSmartContext,
        );

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
