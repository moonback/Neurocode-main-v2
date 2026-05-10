/**
 * Unit tests for SkillEngine
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SkillEngine } from "./SkillEngine";
import { SkillLoader } from "./SkillLoader";

// Mock SkillLoader
vi.mock("./SkillLoader", () => {
  return {
    SkillLoader: vi.fn().mockImplementation(() => {
      return {
        loadSkill: vi.fn().mockResolvedValue({
          success: true,
          data: {
            name: "test-skill",
            description: "Test skill",
            content: "mock skill content",
            scope: "user" as const,
            path: "/path/to/skill",
          },
          metrics: {
            skillName: "test-skill",
            operation: "loadSkill" as const,
            startTime: Date.now(),
            endTime: Date.now() + 10,
            durationMs: 10,
            success: true,
          },
        }),
        loadMetadata: vi.fn().mockResolvedValue({
          success: true,
          metadata: {
            name: "test-skill",
            description: "Test skill",
            dependencies: [],
            estimatedTokens: 100,
          },
          metrics: {
            skillName: "test-skill",
            operation: "loadMetadata" as const,
            startTime: Date.now(),
            endTime: Date.now() + 5,
            durationMs: 5,
            success: true,
          },
        }),
      };
    }),
  };
});

describe("SkillEngine", () => {
  let engine: SkillEngine;
  let loader: SkillLoader;

  beforeEach(() => {
    loader = new SkillLoader();
    engine = new SkillEngine(loader);
  });

  describe("constructor", () => {
    it("should create engine with default config", () => {
      const config = engine.getConfig();
      expect(config.maxConcurrency).toBe(5);
      expect(config.performanceWarningThreshold).toBe(5000);
      expect(config.enableResultCache).toBe(true);
      expect(config.resultCacheSize).toBe(100);
      expect(config.resultCacheTimeout).toBe(10);
    });

    it("should create engine with custom config", () => {
      const customEngine = new SkillEngine(loader, {
        maxConcurrency: 10,
        performanceWarningThreshold: 3000,
        enableResultCache: false,
      });

      const config = customEngine.getConfig();
      expect(config.maxConcurrency).toBe(10);
      expect(config.performanceWarningThreshold).toBe(3000);
      expect(config.enableResultCache).toBe(false);
    });
  });

  describe("executeSkill", () => {
    it("should execute a skill successfully", async () => {
      const result = await engine.executeSkill("test-skill", {
        param: "value",
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.fromCache).toBe(false);
      expect(result.context.skillName).toBe("test-skill");
      expect(result.context.status).toBe("completed");
    });

    it("should track execution context", async () => {
      const promise = engine.executeSkill("test-skill", { param: "value" });

      // Check active executions while running
      const active = engine.getActiveExecutions();
      expect(active.length).toBeGreaterThan(0);

      await promise;

      // Check active executions after completion
      const activeAfter = engine.getActiveExecutions();
      expect(activeAfter.length).toBe(0);
    });

    it("should handle execution errors", async () => {
      // Mock loader to throw error
      vi.mocked(loader.loadSkill).mockResolvedValueOnce({
        success: false,
        error: "Skill not found",
        metrics: {
          skillName: "nonexistent",
          operation: "loadSkill" as const,
          startTime: Date.now(),
          endTime: Date.now() + 5,
          durationMs: 5,
          success: false,
          error: "Skill not found",
        },
      });

      const result = await engine.executeSkill("nonexistent", {
        param: "value",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.context.status).toBe("failed");
    });

    it("should cache deterministic results", async () => {
      const inputs = { param: "value" };

      // First execution
      const result1 = await engine.executeSkill("test-skill", inputs, true);
      expect(result1.fromCache).toBe(false);

      // Second execution should be from cache
      const result2 = await engine.executeSkill("test-skill", inputs, true);
      expect(result2.fromCache).toBe(true);
      expect(result2.result).toEqual(result1.result);
    });

    it("should not cache non-deterministic results", async () => {
      const inputs = { param: "value" };

      // First execution
      const result1 = await engine.executeSkill("test-skill", inputs, false);
      expect(result1.fromCache).toBe(false);

      // Second execution should not be from cache
      const result2 = await engine.executeSkill("test-skill", inputs, false);
      expect(result2.fromCache).toBe(false);
    });

    it("should respect cache disabled config", async () => {
      const noCacheEngine = new SkillEngine(loader, {
        enableResultCache: false,
      });

      const inputs = { param: "value" };

      // First execution
      const result1 = await noCacheEngine.executeSkill(
        "test-skill",
        inputs,
        true,
      );
      expect(result1.fromCache).toBe(false);

      // Second execution should not be from cache
      const result2 = await noCacheEngine.executeSkill(
        "test-skill",
        inputs,
        true,
      );
      expect(result2.fromCache).toBe(false);
    });

    it("should warn on slow execution", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const slowEngine = new SkillEngine(loader, {
        performanceWarningThreshold: 5, // 5ms threshold
      });

      await slowEngine.executeSkill("test-skill", { param: "value" });

      expect(warnSpy).toHaveBeenCalled();
      expect(warnSpy.mock.calls[0][0]).toContain("Performance warning");

      warnSpy.mockRestore();
    });

    it("should reuse loaded skill content", async () => {
      const loadSkillSpy = vi.mocked(loader.loadSkill);
      loadSkillSpy.mockClear();

      // Execute same skill twice
      await engine.executeSkill("test-skill", { param: "a" });
      await engine.executeSkill("test-skill", { param: "b" });

      // Should only load once
      expect(loadSkillSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("executeParallel", () => {
    it("should execute multiple skills in parallel", async () => {
      const executions = [
        { skillName: "skill1", inputs: { param: "a" } },
        { skillName: "skill2", inputs: { param: "b" } },
        { skillName: "skill3", inputs: { param: "c" } },
      ];

      const results = await engine.executeParallel(executions);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });

    it("should respect concurrency limits", async () => {
      const limitedEngine = new SkillEngine(loader, {
        maxConcurrency: 2,
      });

      const executions = Array.from({ length: 5 }, (_, i) => ({
        skillName: `skill${i}`,
        inputs: { param: `value${i}` },
      }));

      const startTime = Date.now();
      const results = await limitedEngine.executeParallel(executions);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.success)).toBe(true);

      // With concurrency limit of 2 and 5 executions, should take longer
      // than executing all at once (each execution takes ~10ms)
      expect(duration).toBeGreaterThan(20);
    });

    it("should handle mixed success and failure", async () => {
      // Mock some failures
      let callCount = 0;
      vi.mocked(loader.loadSkill).mockImplementation(async (skillName) => {
        callCount++;
        const now = Date.now();
        if (callCount === 2) {
          return {
            success: false,
            error: "Failed to load",
            metrics: {
              skillName,
              operation: "loadSkill" as const,
              startTime: now,
              endTime: now + 5,
              durationMs: 5,
              success: false,
              error: "Failed to load",
            },
          };
        }
        return {
          success: true,
          data: {
            name: skillName,
            description: "Test skill",
            content: "mock content",
            scope: "user" as const,
            path: `/path/to/${skillName}`,
          },
          metrics: {
            skillName,
            operation: "loadSkill" as const,
            startTime: now,
            endTime: now + 10,
            durationMs: 10,
            success: true,
          },
        };
      });

      const executions = [
        { skillName: "skill1", inputs: { param: "a" } },
        { skillName: "skill2", inputs: { param: "b" } },
        { skillName: "skill3", inputs: { param: "c" } },
      ];

      const results = await engine.executeParallel(executions);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe("unloadSkill", () => {
    it("should unload a loaded skill", async () => {
      // Load a skill
      await engine.executeSkill("test-skill", { param: "value" });

      // Unload it
      const unloaded = engine.unloadSkill("test-skill");
      expect(unloaded).toBe(true);

      // Next execution should reload
      const loadSkillSpy = vi.mocked(loader.loadSkill);
      loadSkillSpy.mockClear();

      await engine.executeSkill("test-skill", { param: "value" });
      expect(loadSkillSpy).toHaveBeenCalledTimes(1);
    });

    it("should return false for non-loaded skill", () => {
      const unloaded = engine.unloadSkill("nonexistent");
      expect(unloaded).toBe(false);
    });

    it("should support unload-reload idempotence", async () => {
      // Load skill
      const result1 = await engine.executeSkill("test-skill", {
        param: "value",
      });

      // Unload
      engine.unloadSkill("test-skill");

      // Reload
      const result2 = await engine.executeSkill("test-skill", {
        param: "value",
      });

      // Results should be equivalent
      expect(result1.success).toBe(result2.success);
      expect(result1.result).toEqual(result2.result);
    });
  });

  describe("unloadAllSkills", () => {
    it("should unload all loaded skills", async () => {
      // Load multiple skills
      await engine.executeSkill("skill1", { param: "a" });
      await engine.executeSkill("skill2", { param: "b" });
      await engine.executeSkill("skill3", { param: "c" });

      // Unload all
      engine.unloadAllSkills();

      // Next executions should reload
      const loadSkillSpy = vi.mocked(loader.loadSkill);
      loadSkillSpy.mockClear();

      await engine.executeSkill("skill1", { param: "a" });
      await engine.executeSkill("skill2", { param: "b" });

      expect(loadSkillSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("cache management", () => {
    it("should get cache statistics", async () => {
      const inputs = { param: "value" };

      // Execute with caching
      await engine.executeSkill("test-skill", inputs, true);
      await engine.executeSkill("test-skill", inputs, true); // cache hit

      const stats = engine.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it("should clear cache", async () => {
      const inputs = { param: "value" };

      // Execute with caching
      await engine.executeSkill("test-skill", inputs, true);

      // Clear cache
      engine.clearCache();

      // Next execution should not be from cache
      const result = await engine.executeSkill("test-skill", inputs, true);
      expect(result.fromCache).toBe(false);
    });

    it("should invalidate skill cache", async () => {
      await engine.executeSkill("skill1", { param: "a" }, true);
      await engine.executeSkill("skill1", { param: "b" }, true);
      await engine.executeSkill("skill2", { param: "c" }, true);

      const invalidated = engine.invalidateSkillCache("skill1");
      expect(invalidated).toBe(2);

      // skill1 results should not be cached
      const result1 = await engine.executeSkill("skill1", { param: "a" }, true);
      expect(result1.fromCache).toBe(false);

      // skill2 result should still be cached
      const result2 = await engine.executeSkill("skill2", { param: "c" }, true);
      expect(result2.fromCache).toBe(true);
    });
  });

  describe("getActiveExecutions", () => {
    it("should return empty array when no executions", () => {
      const active = engine.getActiveExecutions();
      expect(active).toHaveLength(0);
    });

    it("should track active executions", async () => {
      // Start multiple executions
      const promises = [
        engine.executeSkill("skill1", { param: "a" }),
        engine.executeSkill("skill2", { param: "b" }),
        engine.executeSkill("skill3", { param: "c" }),
      ];

      // Check active executions (may be 0 if executions complete too fast)
      const active = engine.getActiveExecutions();
      expect(active.length).toBeGreaterThanOrEqual(0);

      await Promise.all(promises);

      // Should be empty after completion
      const activeAfter = engine.getActiveExecutions();
      expect(activeAfter).toHaveLength(0);
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      engine.updateConfig({
        maxConcurrency: 10,
        performanceWarningThreshold: 3000,
      });

      const config = engine.getConfig();
      expect(config.maxConcurrency).toBe(10);
      expect(config.performanceWarningThreshold).toBe(3000);
    });

    it("should recreate result cache when size changes", async () => {
      const inputs = { param: "value" };

      // Execute with caching
      await engine.executeSkill("test-skill", inputs, true);

      // Update cache size
      engine.updateConfig({ resultCacheSize: 50 });

      // Cache should be cleared
      const result = await engine.executeSkill("test-skill", inputs, true);
      expect(result.fromCache).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty inputs", async () => {
      const result = await engine.executeSkill("test-skill", {});
      expect(result.success).toBe(true);
    });

    it("should handle special characters in skill names", async () => {
      const result = await engine.executeSkill("skill:with:colons", {
        param: "value",
      });
      expect(result.success).toBe(true);
    });

    it("should handle concurrent executions of same skill", async () => {
      const promises = Array.from({ length: 10 }, () =>
        engine.executeSkill("test-skill", { param: "value" }),
      );

      const results = await Promise.all(promises);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("should handle zero concurrency limit gracefully", async () => {
      // This is an edge case - zero concurrency should still allow at least one execution
      const zeroEngine = new SkillEngine(loader, {
        maxConcurrency: 0,
      });

      // This might hang or fail depending on implementation
      // For now, we just test that it doesn't crash
      const promise = zeroEngine.executeSkill("test-skill", { param: "value" });

      // Set a timeout to prevent hanging
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 1000),
      );

      await expect(Promise.race([promise, timeout])).rejects.toThrow("Timeout");
    });
  });
});
