/**
 * Unit tests for ResultCache
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ResultCache } from "./ResultCache";

describe("ResultCache", () => {
  let cache: ResultCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new ResultCache<string>(5, 10); // max 5 entries, 10 minute timeout
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("should create cache with default parameters", () => {
      const defaultCache = new ResultCache();
      const stats = defaultCache.getStats();
      expect(stats.maxSize).toBe(100);
      expect(stats.size).toBe(0);
    });

    it("should create cache with custom parameters", () => {
      const customCache = new ResultCache(50, 5);
      const stats = customCache.getStats();
      expect(stats.maxSize).toBe(50);
    });
  });

  describe("put and get", () => {
    it("should cache and retrieve results", () => {
      const inputs = { param1: "value1", param2: 42 };
      cache.put("testSkill", inputs, "result1", 100);

      const cached = cache.get("testSkill", inputs);
      expect(cached).toBeDefined();
      expect(cached?.result).toBe("result1");
      expect(cached?.executionTime).toBe(100);
      expect(cached?.timestamp).toBeGreaterThan(0);
    });

    it("should return undefined for non-existent results", () => {
      const inputs = { param1: "value1" };
      const cached = cache.get("nonexistent", inputs);
      expect(cached).toBeUndefined();
    });

    it("should generate different keys for different skills", () => {
      const inputs = { param1: "value1" };
      cache.put("skill1", inputs, "result1", 100);
      cache.put("skill2", inputs, "result2", 200);

      const cached1 = cache.get("skill1", inputs);
      const cached2 = cache.get("skill2", inputs);

      expect(cached1?.result).toBe("result1");
      expect(cached2?.result).toBe("result2");
    });

    it("should generate different keys for different inputs", () => {
      const inputs1 = { param1: "value1" };
      const inputs2 = { param1: "value2" };

      cache.put("testSkill", inputs1, "result1", 100);
      cache.put("testSkill", inputs2, "result2", 200);

      const cached1 = cache.get("testSkill", inputs1);
      const cached2 = cache.get("testSkill", inputs2);

      expect(cached1?.result).toBe("result1");
      expect(cached2?.result).toBe("result2");
    });

    it("should generate same key for inputs with different key order", () => {
      const inputs1 = { param1: "value1", param2: "value2" };
      const inputs2 = { param2: "value2", param1: "value1" };

      cache.put("testSkill", inputs1, "result1", 100);

      const cached = cache.get("testSkill", inputs2);
      expect(cached?.result).toBe("result1");
    });

    it("should handle complex input types", () => {
      const inputs = {
        string: "test",
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: "value" },
        null: null,
        undefined: undefined,
      };

      cache.put("testSkill", inputs, "result1", 100);

      const cached = cache.get("testSkill", inputs);
      expect(cached?.result).toBe("result1");
    });

    it("should handle empty inputs", () => {
      const inputs = {};
      cache.put("testSkill", inputs, "result1", 100);

      const cached = cache.get("testSkill", inputs);
      expect(cached?.result).toBe("result1");
    });

    it("should update existing cached results", () => {
      const inputs = { param1: "value1" };
      cache.put("testSkill", inputs, "result1", 100);
      cache.put("testSkill", inputs, "result2", 200);

      const cached = cache.get("testSkill", inputs);
      expect(cached?.result).toBe("result2");
      expect(cached?.executionTime).toBe(200);
    });
  });

  describe("has", () => {
    it("should return true for cached results", () => {
      const inputs = { param1: "value1" };
      cache.put("testSkill", inputs, "result1", 100);

      expect(cache.has("testSkill", inputs)).toBe(true);
    });

    it("should return false for non-cached results", () => {
      const inputs = { param1: "value1" };
      expect(cache.has("testSkill", inputs)).toBe(false);
    });

    it("should return false after expiration", () => {
      const inputs = { param1: "value1" };
      cache.put("testSkill", inputs, "result1", 100);

      // Advance time past timeout
      vi.advanceTimersByTime(11 * 60 * 1000);

      expect(cache.has("testSkill", inputs)).toBe(false);
    });
  });

  describe("invalidateSkill", () => {
    it("should invalidate all results for a skill", () => {
      cache.put("skill1", { param: "a" }, "result1", 100);
      cache.put("skill1", { param: "b" }, "result2", 100);
      cache.put("skill2", { param: "c" }, "result3", 100);

      const invalidated = cache.invalidateSkill("skill1");

      expect(invalidated).toBe(2);
      expect(cache.has("skill1", { param: "a" })).toBe(false);
      expect(cache.has("skill1", { param: "b" })).toBe(false);
      expect(cache.has("skill2", { param: "c" })).toBe(true);
    });

    it("should return 0 for non-existent skill", () => {
      const invalidated = cache.invalidateSkill("nonexistent");
      expect(invalidated).toBe(0);
    });

    it("should handle partial skill name matches correctly", () => {
      cache.put("skill", { param: "a" }, "result1", 100);
      cache.put("skill2", { param: "b" }, "result2", 100);

      const invalidated = cache.invalidateSkill("skill");

      expect(invalidated).toBe(1);
      expect(cache.has("skill", { param: "a" })).toBe(false);
      expect(cache.has("skill2", { param: "b" })).toBe(true);
    });
  });

  describe("clear", () => {
    it("should clear all cached results", () => {
      cache.put("skill1", { param: "a" }, "result1", 100);
      cache.put("skill2", { param: "b" }, "result2", 100);

      cache.clear();

      expect(cache.getStats().size).toBe(0);
      expect(cache.has("skill1", { param: "a" })).toBe(false);
      expect(cache.has("skill2", { param: "b" })).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should track cache statistics", () => {
      const inputs = { param: "value" };
      cache.put("testSkill", inputs, "result1", 100);

      cache.get("testSkill", inputs); // hit
      cache.get("testSkill", { param: "other" }); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
    });
  });

  describe("getEntries", () => {
    it("should return all cached entries", () => {
      cache.put("skill1", { param: "a" }, "result1", 100);
      cache.put("skill2", { param: "b" }, "result2", 200);

      const entries = cache.getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].key).toContain("skill1");
      expect(entries[1].key).toContain("skill2");
    });
  });

  describe("evictExpired", () => {
    it("should evict expired entries", () => {
      cache.put("skill1", { param: "a" }, "result1", 100);
      cache.put("skill2", { param: "b" }, "result2", 100);

      // Advance time past timeout
      vi.advanceTimersByTime(11 * 60 * 1000);

      const evicted = cache.evictExpired();
      expect(evicted).toBe(2);
      expect(cache.getStats().size).toBe(0);
    });

    it("should only evict expired entries", () => {
      cache.put("skill1", { param: "a" }, "result1", 100);

      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);

      cache.put("skill2", { param: "b" }, "result2", 100);

      // Advance time by another 6 minutes (11 total for skill1, 6 for skill2)
      vi.advanceTimersByTime(6 * 60 * 1000);

      const evicted = cache.evictExpired();
      expect(evicted).toBe(1);
      expect(cache.has("skill1", { param: "a" })).toBe(false);
      expect(cache.has("skill2", { param: "b" })).toBe(true);
    });
  });

  describe("resetStats", () => {
    it("should reset statistics", () => {
      const inputs = { param: "value" };
      cache.put("testSkill", inputs, "result1", 100);
      cache.get("testSkill", inputs); // hit
      cache.get("testSkill", { param: "other" }); // miss

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe("LRU eviction", () => {
    it("should evict least recently used when at capacity", () => {
      cache.put("skill1", { param: "a" }, "result1", 100);
      cache.put("skill2", { param: "b" }, "result2", 100);
      cache.put("skill3", { param: "c" }, "result3", 100);
      cache.put("skill4", { param: "d" }, "result4", 100);
      cache.put("skill5", { param: "e" }, "result5", 100);

      // Add one more, should evict skill1
      cache.put("skill6", { param: "f" }, "result6", 100);

      expect(cache.has("skill1", { param: "a" })).toBe(false);
      expect(cache.has("skill6", { param: "f" })).toBe(true);
      expect(cache.getStats().size).toBe(5);
    });
  });

  describe("generic type support", () => {
    it("should support different result types", () => {
      const numberCache = new ResultCache<number>(5);
      numberCache.put("testSkill", { param: "a" }, 42, 100);

      const cached = numberCache.get("testSkill", { param: "a" });
      expect(cached?.result).toBe(42);
    });

    it("should support object result types", () => {
      interface TestResult {
        status: string;
        data: number[];
      }

      const objectCache = new ResultCache<TestResult>(5);
      const result: TestResult = { status: "success", data: [1, 2, 3] };
      objectCache.put("testSkill", { param: "a" }, result, 100);

      const cached = objectCache.get("testSkill", { param: "a" });
      expect(cached?.result).toEqual(result);
    });
  });

  describe("edge cases", () => {
    it("should handle special characters in skill names", () => {
      const inputs = { param: "value" };
      cache.put("skill:with:colons", inputs, "result1", 100);

      const cached = cache.get("skill:with:colons", inputs);
      expect(cached?.result).toBe("result1");
    });

    it("should handle very long skill names", () => {
      const longName = "a".repeat(1000);
      const inputs = { param: "value" };
      cache.put(longName, inputs, "result1", 100);

      const cached = cache.get(longName, inputs);
      expect(cached?.result).toBe("result1");
    });

    it("should handle inputs with circular references gracefully", () => {
      const inputs: any = { param: "value" };
      inputs.self = inputs; // circular reference

      // JSON.stringify will throw on circular references
      expect(() => {
        cache.put("testSkill", inputs, "result1", 100);
      }).toThrow();
    });

    it("should handle large input objects", () => {
      const largeInputs = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `value${i}`,
        })),
      };

      cache.put("testSkill", largeInputs, "result1", 100);

      const cached = cache.get("testSkill", largeInputs);
      expect(cached?.result).toBe("result1");
    });

    it("should handle zero execution time", () => {
      const inputs = { param: "value" };
      cache.put("testSkill", inputs, "result1", 0);

      const cached = cache.get("testSkill", inputs);
      expect(cached?.executionTime).toBe(0);
    });

    it("should handle negative execution time", () => {
      const inputs = { param: "value" };
      cache.put("testSkill", inputs, "result1", -100);

      const cached = cache.get("testSkill", inputs);
      expect(cached?.executionTime).toBe(-100);
    });
  });

  describe("deterministic key generation", () => {
    it("should generate consistent keys for identical inputs", () => {
      const inputs1 = { a: 1, b: 2, c: 3 };
      const inputs2 = { a: 1, b: 2, c: 3 };

      cache.put("testSkill", inputs1, "result1", 100);

      const cached = cache.get("testSkill", inputs2);
      expect(cached?.result).toBe("result1");
    });

    it("should generate different keys for different input values", () => {
      const inputs1 = { param: 1 };
      const inputs2 = { param: 2 };

      cache.put("testSkill", inputs1, "result1", 100);
      cache.put("testSkill", inputs2, "result2", 100);

      const cached1 = cache.get("testSkill", inputs1);
      const cached2 = cache.get("testSkill", inputs2);

      expect(cached1?.result).toBe("result1");
      expect(cached2?.result).toBe("result2");
    });

    it("should handle inputs with different types for same key", () => {
      const inputs1 = { param: "1" };
      const inputs2 = { param: 1 };

      cache.put("testSkill", inputs1, "result1", 100);
      cache.put("testSkill", inputs2, "result2", 100);

      const cached1 = cache.get("testSkill", inputs1);
      const cached2 = cache.get("testSkill", inputs2);

      expect(cached1?.result).toBe("result1");
      expect(cached2?.result).toBe("result2");
    });
  });
});
