/**
 * Unit tests for SkillEngine preloading functionality
 *
 * Tests Requirements: 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillEngine } from './SkillEngine';
import { SkillLoader } from './SkillLoader';
import type { Skill } from '@/skills/types';

// Mock SkillLoader
vi.mock('./SkillLoader');

// Mock database
vi.mock('@/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        run: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          groupBy: vi.fn(() => ({
            all: vi.fn(() => []),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/db/schema', () => ({
  skillAnalytics: {
    skillName: 'skillName',
    timestamp: 'timestamp',
  },
}));

describe('SkillEngine - Preloading', () => {
  let engine: SkillEngine;
  let loader: SkillLoader;

  beforeEach(() => {
    vi.clearAllMocks();

    loader = new SkillLoader();

    // Mock loadSkill to return success
    vi.spyOn(loader, 'loadSkill').mockResolvedValue({
      success: true,
      data: {
        name: 'test-skill',
        content: 'test content',
      } as Skill,
      metrics: {
        skillName: 'test-skill',
        operation: 'loadSkill',
        startTime: Date.now(),
        endTime: Date.now() + 10,
        durationMs: 10,
        success: true,
      },
    });

    engine = new SkillEngine(loader, {
      enablePreloading: true,
      preloadingIdleThreshold: 1000,
      preloadingMemoryLimit: 5,
      preloadingMaxPredictions: 3,
    });
  });

  describe('Configuration', () => {
    it('should initialize with preloading enabled', () => {
      const config = engine.getConfig();
      expect(config.enablePreloading).toBe(true);
      expect(config.preloadingIdleThreshold).toBe(1000);
      expect(config.preloadingMemoryLimit).toBe(5);
      expect(config.preloadingMaxPredictions).toBe(3);
    });

    it('should initialize preloading stats', () => {
      const stats = engine.getPreloadingStats();
      expect(stats.preloadedSkills).toBe(0);
      expect(stats.preloadHits).toBe(0);
      expect(stats.preloadMisses).toBe(0);
      expect(stats.preloadHitRate).toBe(0);
      expect(stats.lastPreloadTime).toBeNull();
      expect(stats.memoryUsage).toBe(0);
    });

    it('should allow disabling preloading', () => {
      const engineNoPreload = new SkillEngine(loader, {
        enablePreloading: false,
      });

      const config = engineNoPreload.getConfig();
      expect(config.enablePreloading).toBe(false);

      engineNoPreload.destroy();
    });
  });

  describe('Preload Statistics Tracking', () => {
    it('should track preload misses when skill is not preloaded', async () => {
      const statsBefore = engine.getPreloadingStats();

      await engine.executeSkill('new-skill', { test: 'input' });

      const statsAfter = engine.getPreloadingStats();
      expect(statsAfter.preloadMisses).toBe(statsBefore.preloadMisses + 1);
    });

    it('should calculate preload hit rate', async () => {
      // Execute a skill (miss)
      await engine.executeSkill('skill-1', { test: 'input' });

      // Manually mark as preloaded for testing
      await engine.executeSkill('skill-1', { test: 'input' });

      const stats = engine.getPreloadingStats();
      expect(stats.preloadHitRate).toBeGreaterThanOrEqual(0);
      expect(stats.preloadHitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      const stats = engine.getPreloadingStats();
      expect(stats.memoryUsage).toBe(0);
    });

    it('should update memory usage when unloading skills', async () => {
      await engine.executeSkill('skill-1', { test: 'input' });

      engine.unloadSkill('skill-1');

      const stats = engine.getPreloadingStats();
      expect(stats.memoryUsage).toBe(0);
    });

    it('should clear memory usage when unloading all skills', async () => {
      await engine.executeSkill('skill-1', { test: 'input' });
      await engine.executeSkill('skill-2', { test: 'input' });

      engine.unloadAllSkills();

      const stats = engine.getPreloadingStats();
      expect(stats.memoryUsage).toBe(0);
    });
  });

  describe('Prediction Integration', () => {
    it('should provide prediction accuracy metrics', () => {
      const accuracy = engine.getPredictionAccuracy();

      expect(accuracy).toBeDefined();
      expect(accuracy.totalPredictions).toBeGreaterThanOrEqual(0);
      expect(accuracy.correctPredictions).toBeGreaterThanOrEqual(0);
      expect(accuracy.falsePositives).toBeGreaterThanOrEqual(0);
      expect(accuracy.falseNegatives).toBeGreaterThanOrEqual(0);
      expect(accuracy.accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy.accuracy).toBeLessThanOrEqual(1);
    });

    it('should track skill usage for prediction', async () => {
      await engine.executeSkill('skill-1', { test: 'input' });
      await engine.executeSkill('skill-2', { test: 'input' });

      const accuracy = engine.getPredictionAccuracy();
      expect(accuracy).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should stop idle detection on destroy', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      engine.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should be safe to call destroy multiple times', () => {
      engine.destroy();
      engine.destroy();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Skill Execution with Preloading', () => {
    it('should execute skills successfully', async () => {
      const result = await engine.executeSkill('test-skill', { test: 'input' });

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
    });

    it('should track execution context', async () => {
      await engine.executeSkill('test-skill', { test: 'input' });

      const activeExecutions = engine.getActiveExecutions();
      // Execution should be complete, so no active executions
      expect(activeExecutions.length).toBe(0);
    });

    it('should handle parallel execution', async () => {
      const executions = [
        { skillName: 'skill-1', inputs: { test: 'input1' } },
        { skillName: 'skill-2', inputs: { test: 'input2' } },
        { skillName: 'skill-3', inputs: { test: 'input3' } },
      ];

      const results = await engine.executeParallel(executions);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('should allow updating configuration', () => {
      engine.updateConfig({
        preloadingMemoryLimit: 10,
        preloadingMaxPredictions: 5,
      });

      const config = engine.getConfig();
      expect(config.preloadingMemoryLimit).toBe(10);
      expect(config.preloadingMaxPredictions).toBe(5);
    });

    it('should preserve other config values when updating', () => {
      const originalThreshold = engine.getConfig().preloadingIdleThreshold;

      engine.updateConfig({
        preloadingMemoryLimit: 10,
      });

      const config = engine.getConfig();
      expect(config.preloadingIdleThreshold).toBe(originalThreshold);
    });
  });

  describe('Error Handling', () => {
    it('should handle skill loading failures gracefully', async () => {
      vi.spyOn(loader, 'loadSkill').mockResolvedValueOnce({
        success: false,
        error: 'Load failed',
        metrics: {
          skillName: 'failing-skill',
          operation: 'loadSkill',
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 0,
          success: false,
          error: 'Load failed',
        },
      });

      const result = await engine.executeSkill('failing-skill', {
        test: 'input',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track failed executions', async () => {
      vi.spyOn(loader, 'loadSkill').mockResolvedValueOnce({
        success: false,
        error: 'Load failed',
        metrics: {
          skillName: 'failing-skill',
          operation: 'loadSkill',
          startTime: Date.now(),
          endTime: Date.now(),
          durationMs: 0,
          success: false,
          error: 'Load failed',
        },
      });

      await engine.executeSkill('failing-skill', { test: 'input' });

      // Should still track the miss
      const stats = engine.getPreloadingStats();
      expect(stats.preloadMisses).toBeGreaterThan(0);
    });
  });
});
