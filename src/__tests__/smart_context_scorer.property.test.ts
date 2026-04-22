// Feature: smart-context-mode
import * as fc from "fast-check";
import { describe, it } from "vitest";
import { scoreFile } from "../context_manager/scorer";
import type { CandidateFile, ScorerInput } from "../context_manager/types";

// Arbitrary for a CandidateFile
const candidateFileArb = fc.record<CandidateFile>({
  path: fc.oneof(
    fc.constant("src/foo.ts"),
    fc.constant("src/bar.ts"),
    fc.constant("lib/utils.ts"),
    fc.constant("components/Button.tsx"),
    fc.constant("a/b/c.ts"),
  ),
  content: fc.string({ maxLength: 500 }),
  mtime: fc.integer({ min: 0, max: Date.now() }),
  sizeTokens: fc.integer({ min: 0, max: 10000 }),
});

// Arbitrary for a full ScorerInput
const scorerInputArb = fc.record<ScorerInput>({
  candidate: candidateFileArb,
  activeFilePath: fc.oneof(
    fc.constant(null),
    fc.constant("src/active.ts"),
    fc.constant("src/foo.ts"),
    fc.constant("lib/main.ts"),
  ),
  requestText: fc.string({ maxLength: 200 }),
  importedPaths: fc
    .array(fc.string({ maxLength: 50 }), { maxLength: 5 })
    .map((arr) => new Set(arr)),
  importingPaths: fc
    .array(fc.string({ maxLength: 50 }), { maxLength: 5 })
    .map((arr) => new Set(arr)),
  now: fc.integer({ min: 0, max: Date.now() + 1000 * 60 * 60 * 24 * 365 }),
});

// **Validates: Requirements 2.1**
describe("Property 1: Relevance scores are bounded", () => {
  it("scoreFile always returns a relevanceScore in [0.0, 1.0]", () => {
    fc.assert(
      fc.property(scorerInputArb, (input) => {
        const result = scoreFile(input);
        return result.relevanceScore >= 0.0 && result.relevanceScore <= 1.0;
      }),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 1.1, 1.2, 2.2**
describe("Property 2: Import-related files score higher than unrelated files", () => {
  it("a file in importedPaths scores higher than an otherwise identical unrelated file", () => {
    // Build a controlled arbitrary: same candidate path, same content, same timestamps,
    // but one is in importedPaths and the other is not.
    const controlledArb = fc.record({
      candidatePath: fc.constant("src/b.ts"),
      content: fc.string({ maxLength: 200 }),
      mtime: fc.integer({ min: 0, max: Date.now() }),
      sizeTokens: fc.integer({ min: 0, max: 1000 }),
      activeFilePath: fc.constant("src/active.ts"),
      requestText: fc.constant(""), // no symbol overlap so only import factor differs
      now: fc.integer({
        min: Date.now(),
        max: Date.now() + 1000 * 60 * 60 * 24 * 30,
      }),
    });

    fc.assert(
      fc.property(
        controlledArb,
        ({
          candidatePath,
          content,
          mtime,
          sizeTokens,
          activeFilePath,
          requestText,
          now,
        }) => {
          const candidate: CandidateFile = {
            path: candidatePath,
            content,
            mtime,
            sizeTokens,
          };

          // File B is imported by active file
          const importedInput: ScorerInput = {
            candidate,
            activeFilePath,
            requestText,
            importedPaths: new Set([candidatePath]),
            importingPaths: new Set(),
            now,
          };

          // File C is unrelated (same candidate path, but not in any import set)
          const unrelatedInput: ScorerInput = {
            candidate,
            activeFilePath,
            requestText,
            importedPaths: new Set(),
            importingPaths: new Set(),
            now,
          };

          const importedScore = scoreFile(importedInput).relevanceScore;
          const unrelatedScore = scoreFile(unrelatedInput).relevanceScore;

          // Import factor adds 0.40 to the score, so imported must be strictly higher
          return importedScore > unrelatedScore;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// **Validates: Requirements 2.5**
describe("Property 3: Scoring is deterministic", () => {
  it("running scoreFile twice with identical inputs produces identical scores", () => {
    fc.assert(
      fc.property(scorerInputArb, (input) => {
        const result1 = scoreFile(input);
        const result2 = scoreFile(input);
        return result1.relevanceScore === result2.relevanceScore;
      }),
      { numRuns: 100 },
    );
  });
});
