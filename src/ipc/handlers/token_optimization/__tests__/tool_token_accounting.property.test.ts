// Property-Based Tests for Tool Call Token Accounting
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { calculateTokenBudget } from "../token_allocator";
import { PROVIDER_CONFIGS } from "../provider_registry";

describe("Property 21: Tool Call Token Accounting", () => {
  /**
   * **Validates: Requirements 7.6**
   *
   * Property: When MCP tools are active, the token budget SHALL account for
   * tool call tokens by reducing the available allocation budget by the
   * estimated tool definition size.
   */

  it("budget is reduced by tool definition size", () => {
    const providerArb = fc.constantFrom(...Object.keys(PROVIDER_CONFIGS));
    const toolsArb = fc.array(
      fc.record({
        name: fc.string({ minLength: 5, maxLength: 20 }),
        description: fc.string({ minLength: 10, maxLength: 100 }),
        inputSchema: fc.record({
          type: fc.constant("object"),
          properties: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 10 }),
            fc.record({
              type: fc.constantFrom("string", "number", "boolean"),
              description: fc.string({ minLength: 5, maxLength: 50 }),
            }),
          ),
        }),
      }),
      { minLength: 0, maxLength: 10 },
    );

    fc.assert(
      fc.property(providerArb, toolsArb, (provider, tools) => {
        const allocation = {
          inputContextRatio: 0.6,
          systemInstructionsRatio: 0.2,
          outputGenerationRatio: 0.2,
        };

        // Budget without tools
        const budgetNoTools = calculateTokenBudget(provider, allocation, []);

        // Budget with tools
        const budgetWithTools = calculateTokenBudget(provider, allocation, tools);

        // Calculate expected tool tokens (using same heuristic as implementation)
        const toolsJson = JSON.stringify(tools);
        const expectedToolTokens = Math.ceil(toolsJson.length / 4);

        // Verify remaining tokens is reduced by tool tokens
        // Note: allocateTokens also uses the reduced budget, so we check total - toolTokens
        const availableForAllocation = Math.max(0, budgetWithTools.total - expectedToolTokens);
        
        // Sum of allocations should equal availableForAllocation (within rounding error of 2 tokens due to multiple floors)
        const totalAllocated = 
          budgetWithTools.allocated.inputContext + 
          budgetWithTools.allocated.systemInstructions + 
          budgetWithTools.allocated.outputGeneration;
        
        expect(Math.abs(totalAllocated - availableForAllocation)).toBeLessThanOrEqual(2);

        // If tools are present, remaining should be less than total
        if (tools.length > 0 && budgetWithTools.total > 0) {
          expect(budgetWithTools.remaining).toBeLessThan(budgetNoTools.total);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("large tool definitions eventually trigger validation error", () => {
    const provider = "openai/gpt-4"; // Smallish context window for easier trigger
    const allocation = {
      inputContextRatio: 0.1,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.1, // Small ratio
    };

    // Generate extremely large tools
    const largeTools = Array(100).fill({
      name: "very_large_tool_name_to_consume_tokens",
      description: "a".repeat(1000),
      inputSchema: {
        type: "object",
        properties: Object.fromEntries(
          Array(50).fill(0).map((_, i) => [`prop${i}`, { type: "string", description: "b".repeat(100) }])
        )
      }
    });

    // This should throw because either availableForAllocation will be 0
    // or outputGeneration will be below MINIMUM_OUTPUT_TOKENS (1024)
    expect(() => calculateTokenBudget(provider, allocation, largeTools)).toThrow(/below minimum threshold|Total tokens must be positive/);
  });

  it("empty tools results in same budget as no tools", () => {
    const provider = "anthropic/claude-3-opus";
    const allocation = {
      inputContextRatio: 0.5,
      systemInstructionsRatio: 0.2,
      outputGenerationRatio: 0.3,
    };

    const budget1 = calculateTokenBudget(provider, allocation, []);
    const budget2 = calculateTokenBudget(provider, allocation, undefined as any);

    expect(budget1.allocated).toEqual(budget2.allocated);
    expect(budget1.remaining).toBe(budget1.total);
  });
});
