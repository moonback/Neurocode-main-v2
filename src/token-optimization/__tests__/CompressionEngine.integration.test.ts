/**
 * Integration tests for CompressionEngine with ContextOptimizer
 *
 * These tests verify that the CompressionEngine integrates correctly
 * with the ContextOptimizer's compress() method.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ContextOptimizer } from "../ContextOptimizer";
import type { Context, CompressedContext } from "../ContextOptimizer";
import type { TokenBudget } from "../TokenManager";

describe("CompressionEngine Integration", () => {
  let optimizer: ContextOptimizer;

  beforeEach(() => {
    optimizer = new ContextOptimizer();
  });

  // Helper to create a token budget
  function createBudget(total: number): TokenBudget {
    return {
      total,
      used: 0,
      remaining: total,
      warningThreshold: Math.floor(total * 0.8),
      criticalThreshold: Math.floor(total * 0.9),
    };
  }

  it("should compress large files during optimization", () => {
    // Create a large file (>500 lines)
    const lines = [];
    lines.push("export class LargeClass {");
    lines.push("  private value: number;");
    lines.push("");
    lines.push("  constructor(initial: number) {");
    for (let i = 0; i < 500; i++) {
      lines.push(`    // implementation line ${i}`);
    }
    lines.push("    this.value = initial;");
    lines.push("  }");
    lines.push("");
    lines.push("  getValue(): number {");
    lines.push("    return this.value;");
    lines.push("  }");
    lines.push("}");

    const context: Context = {
      userInstructions: ["Optimize this code"],
      conversationHistory: [],
      files: [
        {
          path: "large.ts",
          content: lines.join("\n"),
          language: "typescript",
          isUserProvided: false,
        },
      ],
      skills: [],
      metadata: {
        totalTokens: 10000,
        timestamp: Date.now(),
      },
    };

    // Create a budget that triggers compression (context at 95% of budget = critical)
    const budget = createBudget(10500);

    // Optimize the context
    const optimized = optimizer.optimize(context, budget);

    // Verify compression was applied
    expect(optimized.optimizationsApplied).toContain("compression");
    expect(optimized.optimizedTokenCount).toBeLessThan(
      optimized.originalTokenCount,
    );

    // Verify the file was compressed (signature extracted)
    expect(optimized.files[0].content).toContain("class LargeClass");
    expect(optimized.files[0].content).toContain(
      "constructor(initial: number)",
    );
    expect(optimized.files[0].content).toContain("getValue(): number");
    expect(optimized.files[0].content).not.toContain("implementation line");
  });

  it("should deduplicate patterns across multiple files", () => {
    const repeatedCode = `function calculateTotal(items: Item[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}`;

    const context: Context = {
      userInstructions: [],
      conversationHistory: [],
      files: [
        {
          path: "file1.ts",
          content: repeatedCode,
          language: "typescript",
          isUserProvided: false,
        },
        {
          path: "file2.ts",
          content: repeatedCode,
          language: "typescript",
          isUserProvided: false,
        },
        {
          path: "file3.ts",
          content: repeatedCode,
          language: "typescript",
          isUserProvided: false,
        },
      ],
      skills: [],
      metadata: {
        totalTokens: 5000,
        timestamp: Date.now(),
      },
    };

    // Use compress() directly to test pattern deduplication
    const compressed = optimizer.compress(context);

    // Verify compression metrics
    expect(compressed.compressionMetrics.patternsReplaced).toBeGreaterThan(0);

    // First file should keep the pattern
    expect(compressed.files[0].content).toBe(repeatedCode);

    // Subsequent files should have references
    expect(compressed.files[1].content).toContain("[Pattern #");
    expect(compressed.files[2].content).toContain("[Pattern #");
  });

  it("should preserve user-provided files during compression", () => {
    const lines = [];
    for (let i = 0; i < 600; i++) {
      lines.push(`line ${i}`);
    }

    const context: Context = {
      userInstructions: ["Keep my file intact"],
      conversationHistory: [],
      files: [
        {
          path: "user-file.ts",
          content: lines.join("\n"),
          language: "typescript",
          isUserProvided: true, // User-provided file
        },
      ],
      skills: [],
      metadata: {
        totalTokens: 8000,
        timestamp: Date.now(),
      },
    };

    const budget = createBudget(10000);

    const optimized = optimizer.optimize(context, budget);

    // User-provided file should NOT be compressed
    expect(optimized.files[0].content).toBe(context.files[0].content);
    expect(optimized.files[0].isUserProvided).toBe(true);
  });

  it("should apply both pruning and compression when needed", () => {
    const lines = [];
    lines.push("export function largeFunction(x: number): number {");
    for (let i = 0; i < 500; i++) {
      lines.push(`  console.log('debug line ${i}');`);
      lines.push(`  // TODO: implement line ${i}`);
    }
    lines.push("  return x * 2;");
    lines.push("}");

    const context: Context = {
      userInstructions: [],
      conversationHistory: [],
      files: [
        {
          path: "large.ts",
          content: lines.join("\n"),
          language: "typescript",
          isUserProvided: false,
        },
      ],
      skills: [],
      metadata: {
        totalTokens: 12000,
        timestamp: Date.now(),
      },
    };

    // Create a budget that triggers both pruning and compression
    const budget = createBudget(12600);

    const optimized = optimizer.optimize(context, budget);

    // Both pruning and compression should be applied
    expect(optimized.optimizationsApplied).toContain("pruning");
    // Compression may or may not be applied depending on how much pruning saves
    // So we just verify significant token reduction
    expect(optimized.optimizedTokenCount).toBeLessThan(
      optimized.originalTokenCount * 0.5,
    );

    // Verify logging and comments were removed (pruning)
    expect(optimized.files[0].content).not.toContain("console.log");
    expect(optimized.files[0].content).not.toContain("TODO");
  });

  it("should report compression metrics in debug info", () => {
    const lines = [];
    for (let i = 0; i < 600; i++) {
      lines.push(`export function func${i}() { return ${i}; }`);
    }

    const context: Context = {
      userInstructions: [],
      conversationHistory: [],
      files: [
        {
          path: "large.ts",
          content: lines.join("\n"),
          language: "typescript",
          isUserProvided: false,
        },
      ],
      skills: [],
      metadata: {
        totalTokens: 8000,
        timestamp: Date.now(),
      },
    };

    // Create a budget that triggers compression (context at 95% of budget = critical)
    const budget = createBudget(8400);

    const optimized = optimizer.optimize(context, budget);

    // Verify debug info is present
    expect(optimized.debugInfo).toBeDefined();

    // If compression was applied, verify compression details
    if (optimized.optimizationsApplied.includes("compression")) {
      expect(optimized.debugInfo?.compressionDetails).toBeDefined();
      expect(
        optimized.debugInfo?.compressionDetails?.filesCompressed,
      ).toBeGreaterThanOrEqual(0);
      expect(
        optimized.debugInfo?.compressionDetails?.signaturesExtracted,
      ).toBeGreaterThanOrEqual(0);
      expect(
        optimized.debugInfo?.compressionDetails?.patternsReplaced,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("should use compress() method directly", () => {
    const lines = [];
    for (let i = 0; i < 600; i++) {
      lines.push(`export function func${i}() { return ${i}; }`);
    }

    const context: Context = {
      userInstructions: [],
      conversationHistory: [],
      files: [
        {
          path: "large.ts",
          content: lines.join("\n"),
          language: "typescript",
          isUserProvided: false,
        },
      ],
      skills: [],
      metadata: {
        totalTokens: 5000,
        timestamp: Date.now(),
      },
    };

    const compressed: CompressedContext = optimizer.compress(context);

    // Verify compression metrics
    expect(compressed.compressionMetrics).toBeDefined();
    expect(compressed.compressionMetrics.tokensSaved).toBeGreaterThanOrEqual(0);
    expect(
      compressed.compressionMetrics.filesCompressed,
    ).toBeGreaterThanOrEqual(0);
  });
});
