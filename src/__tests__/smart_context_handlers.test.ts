import { describe, it, expect, beforeEach } from "vitest";
import { ObservabilityStore } from "../context_manager/observability_store";
import type { ContextObservabilityRecord } from "../lib/schemas";

/**
 * Unit tests for smart context IPC handlers.
 * These tests verify the handler logic by directly testing the ObservabilityStore
 * that the handlers delegate to.
 */
describe("Smart Context Handlers", () => {
  let store: ObservabilityStore;

  beforeEach(() => {
    store = new ObservabilityStore();
  });

  describe("getContextObservability", () => {
    it("should return observability record for valid interaction ID", () => {
      const record: ContextObservabilityRecord = {
        interactionId: "test-123",
        timestamp: Date.now(),
        includedFiles: [
          {
            path: "src/test.ts",
            relevanceScore: 0.8,
            tokensUsed: 100,
            wasTruncated: false,
          },
        ],
        totalTokensUsed: 100,
        strategy: "balanced",
      };

      store.record(record);
      const result = store.get("test-123");

      expect(result).toEqual(record);
    });

    it("should return error object for unknown interaction ID", () => {
      const result = store.get("unknown-id");

      expect(result).toEqual({
        error: "Observability data not available for this interaction",
      });
    });

    it("should return error object for empty interaction ID", () => {
      const result = store.get("");

      expect(result).toEqual({
        error: "Observability data not available for this interaction",
      });
    });
  });

  describe("getRecentContextObservability", () => {
    it("should return empty array when no records exist", () => {
      const result = store.getRecent();

      expect(result).toEqual([]);
    });

    it("should return recent records in descending timestamp order", () => {
      const record1: ContextObservabilityRecord = {
        interactionId: "id-1",
        timestamp: 1000,
        includedFiles: [],
        totalTokensUsed: 50,
        strategy: "balanced",
      };

      const record2: ContextObservabilityRecord = {
        interactionId: "id-2",
        timestamp: 2000,
        includedFiles: [],
        totalTokensUsed: 75,
        strategy: "conservative",
      };

      const record3: ContextObservabilityRecord = {
        interactionId: "id-3",
        timestamp: 1500,
        includedFiles: [],
        totalTokensUsed: 60,
        strategy: "deep",
      };

      store.record(record1);
      store.record(record2);
      store.record(record3);

      const result = store.getRecent();

      // Should be sorted by timestamp descending
      expect(result).toHaveLength(3);
      expect(result[0].interactionId).toBe("id-2"); // timestamp 2000
      expect(result[1].interactionId).toBe("id-3"); // timestamp 1500
      expect(result[2].interactionId).toBe("id-1"); // timestamp 1000
    });

    it("should respect the limit parameter", () => {
      // Add 5 records
      for (let i = 0; i < 5; i++) {
        store.record({
          interactionId: `id-${i}`,
          timestamp: i * 1000,
          includedFiles: [],
          totalTokensUsed: 50,
          strategy: "balanced",
        });
      }

      const result = store.getRecent(2);

      expect(result).toHaveLength(2);
      // Should return the 2 most recent
      expect(result[0].interactionId).toBe("id-4");
      expect(result[1].interactionId).toBe("id-3");
    });

    it("should handle limit larger than available records", () => {
      const record: ContextObservabilityRecord = {
        interactionId: "id-1",
        timestamp: 1000,
        includedFiles: [],
        totalTokensUsed: 50,
        strategy: "balanced",
      };

      store.record(record);

      const result = store.getRecent(100);

      expect(result).toHaveLength(1);
      expect(result[0].interactionId).toBe("id-1");
    });
  });

  describe("ring buffer behavior", () => {
    it("should evict oldest record when capacity is exceeded", () => {
      // Fill the store to capacity (50 entries)
      for (let i = 0; i < 50; i++) {
        store.record({
          interactionId: `id-${i}`,
          timestamp: i * 1000,
          includedFiles: [],
          totalTokensUsed: 50,
          strategy: "balanced",
        });
      }

      // Add one more to trigger eviction
      store.record({
        interactionId: "id-50",
        timestamp: 50000,
        includedFiles: [],
        totalTokensUsed: 50,
        strategy: "balanced",
      });

      // The oldest record (id-0) should be evicted
      const oldestResult = store.get("id-0");
      expect(oldestResult).toEqual({
        error: "Observability data not available for this interaction",
      });

      // The newest record should be present
      const newestResult = store.get("id-50");
      expect(newestResult).not.toHaveProperty("error");

      // Total records should be 50
      const allRecent = store.getRecent(100);
      expect(allRecent).toHaveLength(50);
    });
  });
});
