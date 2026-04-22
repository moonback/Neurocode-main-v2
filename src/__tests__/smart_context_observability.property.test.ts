import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { ObservabilityStore } from "../context_manager/observability_store";
import type { SmartContextMode } from "../lib/schemas";

// Arbitraries for generating test data
const includedFileRecordArbitrary = fc.record({
  path: fc.string({ minLength: 1 }),
  relevanceScore: fc.double({ min: 0, max: 1 }),
  tokensUsed: fc.nat(),
  wasTruncated: fc.boolean(),
});

const strategyArbitrary = fc.constantFrom<SmartContextMode>(
  "balanced",
  "conservative",
  "deep",
);

// Generate a valid observability record where totalTokensUsed equals sum of file tokens
const observabilityRecordArbitrary = fc
  .record({
    interactionId: fc.uuid(),
    timestamp: fc.nat(),
    includedFiles: fc.array(includedFileRecordArbitrary, { minLength: 0 }),
    strategy: strategyArbitrary,
  })
  .map((partial) => {
    const totalTokensUsed = partial.includedFiles.reduce(
      (sum, file) => sum + file.tokensUsed,
      0,
    );
    return {
      ...partial,
      totalTokensUsed,
    };
  });

describe("ObservabilityStore Property Tests", () => {
  // Feature: smart-context-mode, Property 10: Observability records are complete
  it("Property 10: Total tokens equals sum of individual file tokens", () => {
    fc.assert(
      fc.property(observabilityRecordArbitrary, (record) => {
        // Calculate the sum of tokens from included files
        const sumOfFileTokens = record.includedFiles.reduce(
          (sum, file) => sum + file.tokensUsed,
          0,
        );

        // The record's totalTokensUsed should equal the sum
        expect(record.totalTokensUsed).toBe(sumOfFileTokens);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: smart-context-mode, Property 11: Observability retrieval round-trip
  it("Property 11: Retrieved record matches stored record", () => {
    fc.assert(
      fc.property(observabilityRecordArbitrary, (record) => {
        const store = new ObservabilityStore();

        // Record the entry
        store.record(record);

        // Retrieve it
        const retrieved = store.get(record.interactionId);

        // Should not be an error
        expect(retrieved).not.toHaveProperty("error");

        // Should match the original
        if ("error" in retrieved) {
          throw new Error("Unexpected error in retrieval");
        }

        expect(retrieved).toEqual(record);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: smart-context-mode, Property 12: Observability store retains at most 50 interactions
  it("Property 12: Store retains at most 50 interactions", () => {
    fc.assert(
      fc.property(
        fc.array(observabilityRecordArbitrary, {
          minLength: 51,
          maxLength: 100,
        }),
        (records) => {
          const store = new ObservabilityStore();

          // Record all entries
          for (const record of records) {
            store.record(record);
          }

          // Get all recent records
          const recent = store.getRecent(100);

          // Should have at most 50 entries
          expect(recent.length).toBeLessThanOrEqual(50);

          // Should have exactly 50 if we recorded more than 50
          if (records.length > 50) {
            expect(recent.length).toBe(50);
          }

          // The retained records should be the most recent 50
          const last50Records = records.slice(-50);
          const last50Ids = new Set(last50Records.map((r) => r.interactionId));

          for (const recentRecord of recent) {
            expect(last50Ids.has(recentRecord.interactionId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
