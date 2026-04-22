import { describe, it, expect, beforeEach } from "vitest";
import { ObservabilityStore } from "../context_manager/observability_store";
import type { ContextObservabilityRecord } from "../lib/schemas";

describe("ObservabilityStore", () => {
  let store: ObservabilityStore;

  beforeEach(() => {
    store = new ObservabilityStore();
  });

  const createRecord = (
    id: string,
    timestamp: number = Date.now(),
  ): ContextObservabilityRecord => ({
    interactionId: id,
    timestamp,
    includedFiles: [
      {
        path: "test.ts",
        relevanceScore: 0.8,
        tokensUsed: 100,
        wasTruncated: false,
      },
    ],
    totalTokensUsed: 100,
    strategy: "balanced",
  });

  describe("record", () => {
    it("should store a new record", () => {
      const record = createRecord("test-1");
      store.record(record);

      const retrieved = store.get("test-1");
      expect(retrieved).toEqual(record);
    });

    it("should update an existing record with the same ID", () => {
      const record1 = createRecord("test-1", 1000);
      const record2 = createRecord("test-1", 2000);

      store.record(record1);
      store.record(record2);

      const retrieved = store.get("test-1");
      expect(retrieved).toEqual(record2);
    });
  });

  describe("get", () => {
    it("should retrieve a stored record by ID", () => {
      const record = createRecord("test-1");
      store.record(record);

      const retrieved = store.get("test-1");
      expect(retrieved).toEqual(record);
    });

    it("should return error message for unknown ID", () => {
      const result = store.get("unknown-id");

      expect(result).toEqual({
        error: "Observability data not available for this interaction",
      });
    });
  });

  describe("getRecent", () => {
    it("should return records in descending timestamp order", () => {
      const record1 = createRecord("test-1", 1000);
      const record2 = createRecord("test-2", 2000);
      const record3 = createRecord("test-3", 3000);

      store.record(record1);
      store.record(record2);
      store.record(record3);

      const recent = store.getRecent();

      expect(recent).toHaveLength(3);
      expect(recent[0].interactionId).toBe("test-3");
      expect(recent[1].interactionId).toBe("test-2");
      expect(recent[2].interactionId).toBe("test-1");
    });

    it("should respect the limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        store.record(createRecord(`test-${i}`, i * 1000));
      }

      const recent = store.getRecent(5);
      expect(recent).toHaveLength(5);
    });

    it("should return empty array when store is empty", () => {
      const recent = store.getRecent();
      expect(recent).toEqual([]);
    });
  });

  describe("ring buffer eviction", () => {
    it("should evict oldest entry when capacity is exceeded", () => {
      // Fill the store to capacity (50 entries)
      for (let i = 0; i < 50; i++) {
        store.record(createRecord(`test-${i}`, i * 1000));
      }

      // Add one more entry
      store.record(createRecord("test-50", 50000));

      // The oldest entry (test-0) should be evicted
      const oldest = store.get("test-0");
      expect(oldest).toEqual({
        error: "Observability data not available for this interaction",
      });

      // The newest entry should be present
      const newest = store.get("test-50");
      expect(newest).not.toHaveProperty("error");
    });

    it("should retain exactly 50 entries after adding more than 50", () => {
      // Add 60 entries
      for (let i = 0; i < 60; i++) {
        store.record(createRecord(`test-${i}`, i * 1000));
      }

      const recent = store.getRecent(100);
      expect(recent).toHaveLength(50);

      // Should have entries 10-59 (the last 50)
      const ids = recent.map((r) => r.interactionId);
      for (let i = 10; i < 60; i++) {
        expect(ids).toContain(`test-${i}`);
      }

      // Should not have entries 0-9
      for (let i = 0; i < 10; i++) {
        expect(ids).not.toContain(`test-${i}`);
      }
    });

    it("should not evict when updating an existing entry", () => {
      // Fill to capacity
      for (let i = 0; i < 50; i++) {
        store.record(createRecord(`test-${i}`, i * 1000));
      }

      // Update an existing entry (should not trigger eviction)
      store.record(createRecord("test-25", 100000));

      // All original entries should still be present
      for (let i = 0; i < 50; i++) {
        const result = store.get(`test-${i}`);
        expect(result).not.toHaveProperty("error");
      }

      const recent = store.getRecent(100);
      expect(recent).toHaveLength(50);
    });
  });
});
