// Property-Based Tests for Cost Calculation Accuracy
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { calculateCost } from "../cost_tracker";
import { PROVIDER_CONFIGS } from "../provider_registry";

describe("Property 11: Cost Calculation Accuracy", () => {
  /**
   * **Validates: Requirements 4.2, 4.4**
   *
   * Property: For any provider pricing model, input token count, and output token count,
   * the calculated cost SHALL equal (inputTokens × inputPricePerMillion + outputTokens ×
   * outputPricePerMillion) / 1,000,000, with precision to at least 6 decimal places.
   */

  it("cost calculation matches formula with 6 decimal precision", () => {
    // Get all supported providers
    const providerIds = Object.keys(PROVIDER_CONFIGS);

    // Generate arbitrary provider, input tokens, and output tokens
    const providerArb = fc.constantFrom(...providerIds);
    const tokenCountArb = fc.integer({ min: 0, max: 10_000_000 });

    fc.assert(
      fc.property(
        providerArb,
        tokenCountArb,
        tokenCountArb,
        (provider, inputTokens, outputTokens) => {
          // Calculate cost using the function
          const result = calculateCost(inputTokens, outputTokens, provider);

          // Get provider pricing
          const providerConfig = PROVIDER_CONFIGS[provider];
          const { inputTokensPerMillion, outputTokensPerMillion } =
            providerConfig.pricing;

          // Calculate expected costs using the formula
          const expectedInputCost =
            (inputTokens * inputTokensPerMillion) / 1_000_000;
          const expectedOutputCost =
            (outputTokens * outputTokensPerMillion) / 1_000_000;
          const expectedTotalCost = expectedInputCost + expectedOutputCost;

          // Round to 6 decimal places for comparison
          const roundedExpectedInputCost = Number(expectedInputCost.toFixed(6));
          const roundedExpectedOutputCost = Number(
            expectedOutputCost.toFixed(6),
          );
          const roundedExpectedTotalCost = Number(expectedTotalCost.toFixed(6));

          // Verify costs match expected values with 6 decimal precision
          expect(result.inputCost).toBe(roundedExpectedInputCost);
          expect(result.outputCost).toBe(roundedExpectedOutputCost);
          expect(result.totalCost).toBe(roundedExpectedTotalCost);

          // Verify precision: check that values have at most 6 decimal places
          const inputCostStr = result.inputCost.toString();
          const outputCostStr = result.outputCost.toString();
          const totalCostStr = result.totalCost.toString();

          const getDecimalPlaces = (numStr: string): number => {
            const parts = numStr.split(".");
            return parts.length > 1 ? parts[1].length : 0;
          };

          expect(getDecimalPlaces(inputCostStr)).toBeLessThanOrEqual(6);
          expect(getDecimalPlaces(outputCostStr)).toBeLessThanOrEqual(6);
          expect(getDecimalPlaces(totalCostStr)).toBeLessThanOrEqual(6);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("total cost equals sum of input and output costs", () => {
    const providerIds = Object.keys(PROVIDER_CONFIGS);
    const providerArb = fc.constantFrom(...providerIds);
    const tokenCountArb = fc.integer({ min: 0, max: 10_000_000 });

    fc.assert(
      fc.property(
        providerArb,
        tokenCountArb,
        tokenCountArb,
        (provider, inputTokens, outputTokens) => {
          const result = calculateCost(inputTokens, outputTokens, provider);

          // Total cost should equal sum of input and output costs (within floating point tolerance)
          const calculatedTotal = result.inputCost + result.outputCost;
          expect(Math.abs(result.totalCost - calculatedTotal)).toBeLessThan(
            0.00001,
          );

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("zero tokens result in zero cost", () => {
    const providerIds = Object.keys(PROVIDER_CONFIGS);
    const providerArb = fc.constantFrom(...providerIds);

    fc.assert(
      fc.property(providerArb, (provider) => {
        const result = calculateCost(0, 0, provider);

        expect(result.inputCost).toBe(0);
        expect(result.outputCost).toBe(0);
        expect(result.totalCost).toBe(0);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("cost is proportional to token count", () => {
    const providerIds = Object.keys(PROVIDER_CONFIGS);
    const providerArb = fc.constantFrom(...providerIds);
    const tokenCountArb = fc.integer({ min: 1, max: 1_000_000 });
    const multiplierArb = fc.integer({ min: 2, max: 10 });

    fc.assert(
      fc.property(
        providerArb,
        tokenCountArb,
        tokenCountArb,
        multiplierArb,
        (provider, inputTokens, outputTokens, multiplier) => {
          const result1 = calculateCost(inputTokens, outputTokens, provider);
          const result2 = calculateCost(
            inputTokens * multiplier,
            outputTokens * multiplier,
            provider,
          );

          // Cost should scale proportionally (within rounding tolerance)
          const expectedInputCost = Number(
            (result1.inputCost * multiplier).toFixed(6),
          );
          const expectedOutputCost = Number(
            (result1.outputCost * multiplier).toFixed(6),
          );
          const expectedTotalCost = Number(
            (result1.totalCost * multiplier).toFixed(6),
          );

          // Allow small rounding differences (< 0.00001 for larger values)
          expect(Math.abs(result2.inputCost - expectedInputCost)).toBeLessThan(
            0.00001,
          );
          expect(
            Math.abs(result2.outputCost - expectedOutputCost),
          ).toBeLessThan(0.00001);
          expect(Math.abs(result2.totalCost - expectedTotalCost)).toBeLessThan(
            0.00001,
          );

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("costs are always non-negative", () => {
    const providerIds = Object.keys(PROVIDER_CONFIGS);
    const providerArb = fc.constantFrom(...providerIds);
    const tokenCountArb = fc.integer({ min: 0, max: 10_000_000 });

    fc.assert(
      fc.property(
        providerArb,
        tokenCountArb,
        tokenCountArb,
        (provider, inputTokens, outputTokens) => {
          const result = calculateCost(inputTokens, outputTokens, provider);

          expect(result.inputCost).toBeGreaterThanOrEqual(0);
          expect(result.outputCost).toBeGreaterThanOrEqual(0);
          expect(result.totalCost).toBeGreaterThanOrEqual(0);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("calculation is deterministic for same inputs", () => {
    const providerIds = Object.keys(PROVIDER_CONFIGS);
    const providerArb = fc.constantFrom(...providerIds);
    const tokenCountArb = fc.integer({ min: 0, max: 10_000_000 });

    fc.assert(
      fc.property(
        providerArb,
        tokenCountArb,
        tokenCountArb,
        (provider, inputTokens, outputTokens) => {
          const result1 = calculateCost(inputTokens, outputTokens, provider);
          const result2 = calculateCost(inputTokens, outputTokens, provider);
          const result3 = calculateCost(inputTokens, outputTokens, provider);

          // All results should be identical
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("handles edge case of very large token counts", () => {
    const providerIds = Object.keys(PROVIDER_CONFIGS);
    const providerArb = fc.constantFrom(...providerIds);
    const largeTokenCountArb = fc.integer({ min: 1_000_000, max: 100_000_000 });

    fc.assert(
      fc.property(
        providerArb,
        largeTokenCountArb,
        largeTokenCountArb,
        (provider, inputTokens, outputTokens) => {
          const result = calculateCost(inputTokens, outputTokens, provider);

          // Verify calculation still works correctly
          const providerConfig = PROVIDER_CONFIGS[provider];
          const expectedInputCost =
            (inputTokens * providerConfig.pricing.inputTokensPerMillion) /
            1_000_000;
          const expectedOutputCost =
            (outputTokens * providerConfig.pricing.outputTokensPerMillion) /
            1_000_000;

          expect(result.inputCost).toBeCloseTo(expectedInputCost, 5);
          expect(result.outputCost).toBeCloseTo(expectedOutputCost, 5);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("handles providers with zero pricing (free models)", () => {
    // Test with providers that have zero pricing (e.g., ollama, lmstudio)
    const freeProviders = Object.keys(PROVIDER_CONFIGS).filter((provider) => {
      const config = PROVIDER_CONFIGS[provider];
      return (
        config.pricing.inputTokensPerMillion === 0 &&
        config.pricing.outputTokensPerMillion === 0
      );
    });

    if (freeProviders.length === 0) {
      // Skip test if no free providers exist
      return;
    }

    const providerArb = fc.constantFrom(...freeProviders);
    const tokenCountArb = fc.integer({ min: 0, max: 10_000_000 });

    fc.assert(
      fc.property(
        providerArb,
        tokenCountArb,
        tokenCountArb,
        (provider, inputTokens, outputTokens) => {
          const result = calculateCost(inputTokens, outputTokens, provider);

          // All costs should be zero for free providers
          expect(result.inputCost).toBe(0);
          expect(result.outputCost).toBe(0);
          expect(result.totalCost).toBe(0);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("input-only tokens result in zero output cost", () => {
    const providerIds = Object.keys(PROVIDER_CONFIGS);
    const providerArb = fc.constantFrom(...providerIds);
    const tokenCountArb = fc.integer({ min: 1, max: 10_000_000 });

    fc.assert(
      fc.property(providerArb, tokenCountArb, (provider, inputTokens) => {
        const result = calculateCost(inputTokens, 0, provider);

        expect(result.outputCost).toBe(0);
        expect(result.totalCost).toBe(result.inputCost);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("output-only tokens result in zero input cost", () => {
    const providerIds = Object.keys(PROVIDER_CONFIGS);
    const providerArb = fc.constantFrom(...providerIds);
    const tokenCountArb = fc.integer({ min: 1, max: 10_000_000 });

    fc.assert(
      fc.property(providerArb, tokenCountArb, (provider, outputTokens) => {
        const result = calculateCost(0, outputTokens, provider);

        expect(result.inputCost).toBe(0);
        expect(result.totalCost).toBe(result.outputCost);

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
