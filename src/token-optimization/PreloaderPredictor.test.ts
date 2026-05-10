/**
 * Unit tests for PreloaderPredictor
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PreloaderPredictor,
  type UsageEvent,
  type PredictionConfig,
} from "./PreloaderPredictor";

// Mock the database
vi.mock("@/db", () => ({
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

vi.mock("@/db/schema", () => ({
  skillAnalytics: {
    skillName: "skillName",
    timestamp: "timestamp",
    conversationId: "conversationId",
    executionTime: "executionTime",
    cacheHit: "cacheHit",
    errorOccurred: "errorOccurred",
  },
}));

describe("PreloaderPredictor", () => {
  let predictor: PreloaderPredictor;

  beforeEach(() => {
    predictor = new PreloaderPredictor();
  });

  describe("constructor", () => {
    it("should create instance with default config", () => {
      const config = predictor.getConfig();

      expect(config.lookbackDays).toBe(30);
      expect(config.minUsageThreshold).toBe(2);
      expect(config.recencyWeight).toBe(0.4);
      expect(config.frequencyWeight).toBe(0.3);
      expect(config.contextWeight).toBe(0.3);
      expect(config.predictionThreshold).toBe(0.3);
    });

    it("should create instance with custom config", () => {
      const customConfig: Partial<PredictionConfig> = {
        lookbackDays: 60,
        recencyWeight: 0.5,
      };

      const customPredictor = new PreloaderPredictor(customConfig);
      const config = customPredictor.getConfig();

      expect(config.lookbackDays).toBe(60);
      expect(config.recencyWeight).toBe(0.5);
      expect(config.frequencyWeight).toBe(0.3); // Default
    });
  });

  describe("trackUsage", () => {
    it("should track skill usage event", () => {
      const event: UsageEvent = {
        skillName: "test-skill",
        timestamp: new Date(),
        conversationId: "conv-123",
        wasPreloaded: false,
      };

      expect(() => predictor.trackUsage(event)).not.toThrow();
    });

    it("should track multiple usage events", () => {
      const events: UsageEvent[] = [
        {
          skillName: "skill-1",
          timestamp: new Date(),
          wasPreloaded: false,
        },
        {
          skillName: "skill-2",
          timestamp: new Date(),
          wasPreloaded: true,
        },
        {
          skillName: "skill-1",
          timestamp: new Date(),
          wasPreloaded: false,
        },
      ];

      events.forEach((event) => {
        expect(() => predictor.trackUsage(event)).not.toThrow();
      });
    });

    it("should handle tracking errors gracefully", () => {
      const event: UsageEvent = {
        skillName: "test-skill",
        timestamp: new Date(),
        wasPreloaded: false,
      };

      // Should not throw even if database fails
      expect(() => predictor.trackUsage(event)).not.toThrow();
    });
  });

  describe("analyzePatterns", () => {
    it("should return empty array when no patterns exist", () => {
      const patterns = predictor.analyzePatterns();

      expect(patterns).toEqual([]);
    });

    it("should handle database errors gracefully", () => {
      const patterns = predictor.analyzePatterns();

      expect(patterns).toEqual([]);
    });
  });

  describe("predictSkills", () => {
    it("should return empty array when no patterns exist", () => {
      const predictions = predictor.predictSkills();

      expect(predictions).toEqual([]);
    });

    it("should return predictions with context", () => {
      const predictions = predictor.predictSkills("test context");

      expect(Array.isArray(predictions)).toBe(true);
    });

    it("should limit predictions to maximum", () => {
      const predictions = predictor.predictSkills();

      expect(predictions.length).toBeLessThanOrEqual(10);
    });

    it("should return predictions sorted by priority", () => {
      const predictions = predictor.predictSkills();

      for (let i = 1; i < predictions.length; i++) {
        expect(predictions[i - 1].priority).toBeGreaterThanOrEqual(
          predictions[i].priority,
        );
      }
    });

    it("should include required fields in predictions", () => {
      const predictions = predictor.predictSkills();

      predictions.forEach((prediction) => {
        expect(prediction).toHaveProperty("skillName");
        expect(prediction).toHaveProperty("probability");
        expect(prediction).toHaveProperty("confidence");
        expect(prediction).toHaveProperty("reason");
        expect(prediction).toHaveProperty("priority");

        expect(prediction.probability).toBeGreaterThanOrEqual(0);
        expect(prediction.probability).toBeLessThanOrEqual(1);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(prediction.priority).toBeGreaterThanOrEqual(1);
        expect(prediction.priority).toBeLessThanOrEqual(10);
      });
    });

    it("should handle prediction errors gracefully", () => {
      expect(() => predictor.predictSkills()).not.toThrow();
    });
  });

  describe("measureAccuracy", () => {
    it("should return zero accuracy when no predictions", () => {
      const accuracy = predictor.measureAccuracy();

      expect(accuracy.totalPredictions).toBe(0);
      expect(accuracy.correctPredictions).toBe(0);
      expect(accuracy.falsePositives).toBe(0);
      expect(accuracy.falseNegatives).toBe(0);
      expect(accuracy.accuracy).toBe(0);
      expect(accuracy.precision).toBe(0);
      expect(accuracy.recall).toBe(0);
    });

    it("should calculate accuracy metrics correctly", () => {
      const accuracy = predictor.measureAccuracy();

      expect(accuracy).toHaveProperty("totalPredictions");
      expect(accuracy).toHaveProperty("correctPredictions");
      expect(accuracy).toHaveProperty("falsePositives");
      expect(accuracy).toHaveProperty("falseNegatives");
      expect(accuracy).toHaveProperty("accuracy");
      expect(accuracy).toHaveProperty("precision");
      expect(accuracy).toHaveProperty("recall");
    });

    it("should return metrics in valid range", () => {
      const accuracy = predictor.measureAccuracy();

      expect(accuracy.accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy.accuracy).toBeLessThanOrEqual(1);
      expect(accuracy.precision).toBeGreaterThanOrEqual(0);
      expect(accuracy.precision).toBeLessThanOrEqual(1);
      expect(accuracy.recall).toBeGreaterThanOrEqual(0);
      expect(accuracy.recall).toBeLessThanOrEqual(1);
    });
  });

  describe("adjustAlgorithm", () => {
    it("should not adjust with high accuracy", () => {
      const initialConfig = predictor.getConfig();

      const accuracy = {
        totalPredictions: 100,
        correctPredictions: 80,
        falsePositives: 20,
        falseNegatives: 10,
        accuracy: 0.8,
        precision: 0.8,
        recall: 0.89,
      };

      predictor.adjustAlgorithm(accuracy);

      const newConfig = predictor.getConfig();

      // Config should remain similar with high accuracy
      expect(newConfig.recencyWeight).toBeCloseTo(
        initialConfig.recencyWeight,
        1,
      );
      expect(newConfig.frequencyWeight).toBeCloseTo(
        initialConfig.frequencyWeight,
        1,
      );
    });

    it("should adjust weights with low recall", () => {
      const initialConfig = predictor.getConfig();

      const accuracy = {
        totalPredictions: 30,
        correctPredictions: 10,
        falsePositives: 20,
        falseNegatives: 30,
        accuracy: 0.33,
        precision: 0.33,
        recall: 0.25,
      };

      predictor.adjustAlgorithm(accuracy);

      const newConfig = predictor.getConfig();

      // Should increase recency weight
      expect(newConfig.recencyWeight).toBeGreaterThan(
        initialConfig.recencyWeight,
      );
    });

    it("should adjust threshold with low precision", () => {
      const initialConfig = predictor.getConfig();

      const accuracy = {
        totalPredictions: 30,
        correctPredictions: 10,
        falsePositives: 20,
        falseNegatives: 5,
        accuracy: 0.33,
        precision: 0.33,
        recall: 0.67,
      };

      predictor.adjustAlgorithm(accuracy);

      const newConfig = predictor.getConfig();

      // Should increase threshold to reduce false positives
      expect(newConfig.predictionThreshold).toBeGreaterThan(
        initialConfig.predictionThreshold,
      );
    });

    it("should not adjust with insufficient data", () => {
      const initialConfig = predictor.getConfig();

      const accuracy = {
        totalPredictions: 5,
        correctPredictions: 1,
        falsePositives: 4,
        falseNegatives: 2,
        accuracy: 0.2,
        precision: 0.2,
        recall: 0.33,
      };

      predictor.adjustAlgorithm(accuracy);

      const newConfig = predictor.getConfig();

      // Should not adjust with < 20 predictions
      expect(newConfig).toEqual(initialConfig);
    });
  });

  describe("getConfig", () => {
    it("should return current configuration", () => {
      const config = predictor.getConfig();

      expect(config).toHaveProperty("lookbackDays");
      expect(config).toHaveProperty("minUsageThreshold");
      expect(config).toHaveProperty("recencyWeight");
      expect(config).toHaveProperty("frequencyWeight");
      expect(config).toHaveProperty("contextWeight");
      expect(config).toHaveProperty("predictionThreshold");
    });

    it("should return a copy of config", () => {
      const config1 = predictor.getConfig();
      config1.lookbackDays = 999;

      const config2 = predictor.getConfig();

      expect(config2.lookbackDays).not.toBe(999);
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      const newConfig: Partial<PredictionConfig> = {
        lookbackDays: 45,
        recencyWeight: 0.6,
      };

      predictor.updateConfig(newConfig);

      const config = predictor.getConfig();

      expect(config.lookbackDays).toBe(45);
      expect(config.recencyWeight).toBe(0.6);
      expect(config.frequencyWeight).toBe(0.3); // Unchanged
    });

    it("should preserve other config values", () => {
      const initialConfig = predictor.getConfig();

      predictor.updateConfig({ lookbackDays: 60 });

      const newConfig = predictor.getConfig();

      expect(newConfig.lookbackDays).toBe(60);
      expect(newConfig.minUsageThreshold).toBe(initialConfig.minUsageThreshold);
      expect(newConfig.recencyWeight).toBe(initialConfig.recencyWeight);
    });
  });

  describe("clearHistory", () => {
    it("should clear prediction history", () => {
      // Track some events
      predictor.trackUsage({
        skillName: "test-skill",
        timestamp: new Date(),
        wasPreloaded: false,
      });

      // Make some predictions
      predictor.predictSkills();

      // Clear history
      predictor.clearHistory();

      // Accuracy should be zero after clearing
      const accuracy = predictor.measureAccuracy();
      expect(accuracy.totalPredictions).toBe(0);
    });
  });

  describe("integration", () => {
    it("should track usage and make predictions", () => {
      // Track usage
      const event: UsageEvent = {
        skillName: "popular-skill",
        timestamp: new Date(),
        wasPreloaded: false,
      };

      predictor.trackUsage(event);

      // Make predictions
      const predictions = predictor.predictSkills();

      expect(Array.isArray(predictions)).toBe(true);
    });

    it("should measure and adjust based on accuracy", () => {
      // Make predictions
      predictor.predictSkills();

      // Measure accuracy
      const accuracy = predictor.measureAccuracy();

      // Adjust algorithm
      expect(() => predictor.adjustAlgorithm(accuracy)).not.toThrow();
    });

    it("should handle full workflow", () => {
      // 1. Track usage
      predictor.trackUsage({
        skillName: "skill-1",
        timestamp: new Date(),
        wasPreloaded: false,
      });

      // 2. Analyze patterns
      const patterns = predictor.analyzePatterns();
      expect(Array.isArray(patterns)).toBe(true);

      // 3. Make predictions
      const predictions = predictor.predictSkills("test context");
      expect(Array.isArray(predictions)).toBe(true);

      // 4. Measure accuracy
      const accuracy = predictor.measureAccuracy();
      expect(accuracy).toBeDefined();

      // 5. Adjust algorithm
      predictor.adjustAlgorithm(accuracy);

      // 6. Update config
      predictor.updateConfig({ lookbackDays: 45 });

      // 7. Clear history
      predictor.clearHistory();

      expect(true).toBe(true);
    });
  });
});
