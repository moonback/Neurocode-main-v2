// Feature: smart-context-mode
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { assembleContext } from "../context_manager/assembler";
import type { AssemblerOptions, ScoredFile } from "../context_manager/types";

const STRATEGIES = ["conservative", "balanced", "deep"] as const;

// Arbitrary for a single ScoredFile
const scoredFileArb = fc.record<ScoredFile>({
  path: fc.oneof(
    fc.constant("src/a.ts"),
    fc.constant("src/b.ts"),
    fc.constant("lib/utils.ts"),
    fc.constant("components/Button.tsx"),
    fc.constant("src/deep/nested.ts"),
  ),
  content: fc.string({ minLength: 0, maxLength: 800 }),
  mtime: fc.integer({ min: 0, max: 2_000_000_000_000 }),
  sizeTokens: fc.integer({ min: 0, max: 2000 }),
  relevanceScore: fc.float({
    min: Math.fround(0),
    max: Math.fround(1),
    noNaN: true,
  }),
});

// Arbitrary for a list of scored files (allow duplicates — assembler should handle them)
const scoredFilesArb = fc.array(scoredFileArb, { minLength: 0, maxLength: 10 });

// Arbitrary for a positive token budget
const tokenBudgetArb = fc.integer({ min: 1, max: 100_000 });

// Arbitrary for a strategy
const strategyArb = fc.oneof(...STRATEGIES.map((s) => fc.constant(s)));

// Full AssemblerOptions arbitrary
const assemblerOptionsArb = fc.record<AssemblerOptions>({
  scoredFiles: scoredFilesArb,
  strategy: strategyArb,
  tokenBudget: tokenBudgetArb,
  activeFilePath: fc.oneof(
    fc.constant(null),
    fc.constant("src/a.ts"),
    fc.constant("src/b.ts"),
  ),
});

// **Validates: Requirements 3.3**
describe("Property 4: Context assembly never exceeds the token budget", () => {
  it("totalTokensUsed never exceeds tokenBudget for any input", () => {
    fc.assert(
      fc.property(assemblerOptionsArb, (options) => {
        const result = assembleContext(options);
        return result.totalTokensUsed <= options.tokenBudget;
      }),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 4.2, 4.3, 4.4**
describe("Property 5: Strategy thresholds are enforced", () => {
  const STRATEGY_THRESHOLDS = {
    conservative: { minScore: 0.7, budgetCap: 0.25, strict: false },
    balanced: { minScore: 0.4, budgetCap: 0.5, strict: false },
    deep: { minScore: 0.1, budgetCap: 0.8, strict: true }, // deep uses strictly > 0.1
  } as const;

  it("all included files meet the strategy minimum score (except active file in conservative)", () => {
    fc.assert(
      fc.property(
        scoredFilesArb,
        tokenBudgetArb,
        strategyArb,
        fc.oneof(fc.constant(null), fc.constant("src/a.ts")),
        (scoredFiles, tokenBudget, strategy, activeFilePath) => {
          const result = assembleContext({
            scoredFiles,
            strategy,
            tokenBudget,
            activeFilePath,
          });

          const threshold = STRATEGY_THRESHOLDS[strategy].minScore;
          const strict = STRATEGY_THRESHOLDS[strategy].strict;

          for (const included of result.includedFiles) {
            // Conservative strategy always includes the active file regardless of score
            if (
              strategy === "conservative" &&
              included.path === activeFilePath
            ) {
              continue;
            }
            const passes = strict
              ? included.relevanceScore > threshold
              : included.relevanceScore >= threshold;
            if (!passes) return false;
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("total tokens never exceed the strategy budget cap", () => {
    fc.assert(
      fc.property(
        scoredFilesArb,
        tokenBudgetArb,
        strategyArb,
        fc.oneof(fc.constant(null), fc.constant("src/a.ts")),
        (scoredFiles, tokenBudget, strategy, activeFilePath) => {
          const result = assembleContext({
            scoredFiles,
            strategy,
            tokenBudget,
            activeFilePath,
          });

          const cap = STRATEGY_THRESHOLDS[strategy].budgetCap;
          const effectiveBudget = Math.floor(tokenBudget * cap);
          return result.totalTokensUsed <= effectiveBudget;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 3.1, 3.2**
describe("Property 6: Low-scoring files are truncated to top-level declarations", () => {
  it("files with relevanceScore < 0.3 do not contain full implementation bodies", () => {
    // Build files that have multi-line function bodies (non-declaration lines)
    // and score below 0.3. After assembly, their content should only have declarations.
    const lowScoreFileArb = fc.record<ScoredFile>({
      path: fc.constant("src/low.ts"),
      content: fc.constant(
        [
          "export function foo() {",
          "  const x = 1;",
          "  const y = 2;",
          "  return x + y;",
          "}",
          "export class Bar {",
          "  private value = 42;",
          "  getValue() {",
          "    return this.value;",
          "  }",
          "}",
        ].join("\n"),
      ),
      mtime: fc.integer({ min: 0, max: 2_000_000_000_000 }),
      sizeTokens: fc.integer({ min: 10, max: 500 }),
      // Score strictly below 0.3
      relevanceScore: fc.float({
        min: Math.fround(0),
        max: Math.fround(0.29),
        noNaN: true,
      }),
    });

    fc.assert(
      fc.property(
        lowScoreFileArb,
        fc.integer({ min: 10_000, max: 100_000 }), // large budget so truncation is score-based
        strategyArb,
        (lowFile, tokenBudget, strategy) => {
          // Ensure the file passes the strategy threshold
          const threshold =
            strategy === "conservative"
              ? 0.7
              : strategy === "balanced"
                ? 0.4
                : 0.1;

          if (lowFile.relevanceScore < threshold) {
            // File won't be included at all — property trivially holds
            return true;
          }

          const result = assembleContext({
            scoredFiles: [lowFile],
            strategy,
            tokenBudget,
            activeFilePath: null,
          });

          const included = result.includedFiles.find(
            (f) => f.path === "src/low.ts",
          );
          if (!included) return true; // not included — trivially holds

          // The formatted output for this file should not contain implementation lines
          // like "  const x = 1;" or "  return x + y;"
          const fileSection = result.formattedOutput;
          const hasImplementationLines =
            fileSection.includes("  const x = 1;") ||
            fileSection.includes("  return x + y;") ||
            fileSection.includes("  private value = 42;");

          return !hasImplementationLines;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 3.4**
describe("Property 7: Truncated files contain an omission marker", () => {
  it("any file marked wasTruncated has an omission marker in the formatted output", () => {
    fc.assert(
      fc.property(assemblerOptionsArb, (options) => {
        const result = assembleContext(options);

        for (const included of result.includedFiles) {
          if (included.wasTruncated) {
            // The formatted output must contain the omission marker
            if (!result.formattedOutput.includes("// [dyad: content omitted")) {
              return false;
            }
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("files truncated due to low score contain the omission marker", () => {
    // Use a file with score < 0.3 and content that will be truncated
    const lowScoreFileWithBodyArb = fc.record<ScoredFile>({
      path: fc.constant("src/truncated.ts"),
      content: fc.constant(
        [
          "export function alpha() {",
          "  doSomething();",
          "  doSomethingElse();",
          "}",
        ].join("\n"),
      ),
      mtime: fc.integer({ min: 0, max: 2_000_000_000_000 }),
      sizeTokens: fc.integer({ min: 10, max: 500 }),
      relevanceScore: fc.float({
        min: Math.fround(0.1),
        max: Math.fround(0.29),
        noNaN: true,
      }),
    });

    fc.assert(
      fc.property(
        lowScoreFileWithBodyArb,
        fc.integer({ min: 10_000, max: 100_000 }),
        (file, tokenBudget) => {
          const result = assembleContext({
            scoredFiles: [file],
            strategy: "deep", // deep includes score > 0.1
            tokenBudget,
            activeFilePath: null,
          });

          const included = result.includedFiles.find(
            (f) => f.path === "src/truncated.ts",
          );
          if (!included) return true;

          // Must be marked as truncated and contain the marker
          return (
            included.wasTruncated &&
            result.formattedOutput.includes("// [dyad: content omitted")
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 2.3, 2.4**
describe("Property 8: Files are included in descending score order with recency tiebreaking", () => {
  it("includedFiles are sorted descending by relevanceScore", () => {
    fc.assert(
      fc.property(assemblerOptionsArb, (options) => {
        const result = assembleContext(options);
        const files = result.includedFiles;

        for (let i = 0; i < files.length - 1; i++) {
          if (files[i].relevanceScore < files[i + 1].relevanceScore) {
            return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("when two files have equal scores, the one with higher mtime appears first", () => {
    // Build two files with the same score but different mtimes
    const twoFilesArb = fc.record({
      score: fc.float({
        min: Math.fround(0.4),
        max: Math.fround(1.0),
        noNaN: true,
      }),
      mtime1: fc.integer({ min: 1_000_000, max: 1_000_000_000 }),
      mtime2: fc.integer({ min: 1_000_000, max: 1_000_000_000 }),
      tokenBudget: fc.integer({ min: 10_000, max: 100_000 }),
    });

    fc.assert(
      fc.property(twoFilesArb, ({ score, mtime1, mtime2, tokenBudget }) => {
        if (mtime1 === mtime2) return true; // skip equal mtimes

        const fileA: ScoredFile = {
          path: "src/a.ts",
          content: "export const a = 1;",
          mtime: mtime1,
          sizeTokens: 10,
          relevanceScore: score,
        };
        const fileB: ScoredFile = {
          path: "src/b.ts",
          content: "export const b = 2;",
          mtime: mtime2,
          sizeTokens: 10,
          relevanceScore: score,
        };

        const result = assembleContext({
          scoredFiles: [fileA, fileB],
          strategy: "balanced",
          tokenBudget,
          activeFilePath: null,
        });

        if (result.includedFiles.length < 2) return true; // budget too small

        const firstPath = result.includedFiles[0].path;
        const expectedFirst = mtime1 > mtime2 ? "src/a.ts" : "src/b.ts";
        return firstPath === expectedFirst;
      }),
      { numRuns: 100 },
    );
  });
});
