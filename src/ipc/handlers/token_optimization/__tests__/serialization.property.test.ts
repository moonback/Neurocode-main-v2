import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { TokenOptimizationConfigSchema } from "../types";

/**
 * Property-based tests for Token Optimization Serialization
 * Validates: Requirements 8.7 - Serialization Format Consistency
 */
describe("Token Optimization Serialization Property Tests", () => {
  // Arbitrary generator for TokenOptimizationConfig
  const tokenOptimizationConfigArb = fc.record({
    pruningStrategy: fc.constantFrom("conservative" as const, "balanced" as const, "aggressive" as const),
    enableAutoPruning: fc.boolean(),
    pruningThreshold: fc.integer({ min: 0, max: 100 }),
    tokenAllocation: fc.record({
      inputContextRatio: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      systemInstructionsRatio: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      outputGenerationRatio: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
    }),
    enableCostTracking: fc.boolean(),
    costBudget: fc.option(
      fc.record({
        amount: fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }),
        period: fc.constantFrom("daily" as const, "weekly" as const, "monthly" as const),
        warningThreshold: fc.integer({ min: 0, max: 100 }),
      }),
      { nil: undefined }
    ),
    enableMessagePinning: fc.boolean(),
    slidingWindowSize: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
    coordinateWithCompaction: fc.boolean(),
    coordinateWithSmartContext: fc.boolean(),
  });

  /**
   * Property: Serialization Identity
   * parse(serialize(x)) === x
   */
  it("should maintain identity through serialization/deserialization cycle", () => {
    fc.assert(
      fc.property(tokenOptimizationConfigArb, (config) => {
        // Serialize to JSON string
        const serialized = JSON.stringify(config);
        
        // Parse back to object
        const parsed = JSON.parse(serialized);
        
        // Validate with Zod to handle any Date conversions or minor float precision if needed
        // (Though these types are simple primitives)
        const validated = TokenOptimizationConfigSchema.parse(parsed);
        
        // Deep equality check
        // Note: float precision can be tricky, so we check for approximate equality if needed,
        // but JSON.stringify/parse for simple floats usually works fine in JS for identity.
        expect(validated).toEqual(config);
      })
    );
  });

  /**
   * Property 25: Serialization Format Consistency
   * Validates: Requirements 8.7
   * serialize(x) === serialize(serialize(x))
   */
  it("should produce consistent formatting across multiple serializations", () => {
    fc.assert(
      fc.property(tokenOptimizationConfigArb, (config) => {
        const firstSerialization = JSON.stringify(config);
        const secondSerialization = JSON.stringify(JSON.parse(firstSerialization));
        
        expect(firstSerialization).toBe(secondSerialization);
      })
    );
  });

  /**
   * Property: Schema Validation Robustness
   * Any generated valid config should pass Zod validation
   */
  it("should always pass Zod validation for generated valid configs", () => {
    fc.assert(
      fc.property(tokenOptimizationConfigArb, (config) => {
        const result = TokenOptimizationConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      })
    );
  });
});
