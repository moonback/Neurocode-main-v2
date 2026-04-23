import { describe, it, expect } from "vitest";
import {
  TokenOptimizationConfigSchema,
  PruningStrategySchema,
  TokenAllocationSchema,
  CostBudgetSchema,
  MessagePrioritySchema,
  ProviderConfigSchema,
  TokenBudgetSchema,
  CostRecordSchema,
  PruningResultSchema,
  OptimizationMetricsSchema,
} from "../types";

describe("Token Optimization Type Schemas", () => {
  describe("PruningStrategySchema", () => {
    it("should accept valid pruning strategies", () => {
      expect(PruningStrategySchema.parse("conservative")).toBe("conservative");
      expect(PruningStrategySchema.parse("balanced")).toBe("balanced");
      expect(PruningStrategySchema.parse("aggressive")).toBe("aggressive");
    });

    it("should reject invalid pruning strategies", () => {
      expect(() => PruningStrategySchema.parse("invalid")).toThrow();
      expect(() => PruningStrategySchema.parse("")).toThrow();
      expect(() => PruningStrategySchema.parse(123)).toThrow();
    });
  });

  describe("TokenAllocationSchema", () => {
    it("should accept valid token allocation ratios", () => {
      const validAllocation = {
        inputContextRatio: 0.7,
        systemInstructionsRatio: 0.1,
        outputGenerationRatio: 0.2,
      };
      expect(TokenAllocationSchema.parse(validAllocation)).toEqual(
        validAllocation,
      );
    });

    it("should reject ratios outside 0-1 range", () => {
      expect(() =>
        TokenAllocationSchema.parse({
          inputContextRatio: 1.5,
          systemInstructionsRatio: 0.1,
          outputGenerationRatio: 0.2,
        }),
      ).toThrow();

      expect(() =>
        TokenAllocationSchema.parse({
          inputContextRatio: -0.1,
          systemInstructionsRatio: 0.1,
          outputGenerationRatio: 0.2,
        }),
      ).toThrow();
    });
  });

  describe("CostBudgetSchema", () => {
    it("should accept valid cost budget", () => {
      const validBudget = {
        amount: 100,
        period: "monthly" as const,
        warningThreshold: 80,
      };
      expect(CostBudgetSchema.parse(validBudget)).toEqual(validBudget);
    });

    it("should reject non-positive amounts", () => {
      expect(() =>
        CostBudgetSchema.parse({
          amount: 0,
          period: "monthly",
          warningThreshold: 80,
        }),
      ).toThrow();

      expect(() =>
        CostBudgetSchema.parse({
          amount: -10,
          period: "monthly",
          warningThreshold: 80,
        }),
      ).toThrow();
    });

    it("should reject invalid periods", () => {
      expect(() =>
        CostBudgetSchema.parse({
          amount: 100,
          period: "yearly",
          warningThreshold: 80,
        }),
      ).toThrow();
    });

    it("should reject warning thresholds outside 0-100 range", () => {
      expect(() =>
        CostBudgetSchema.parse({
          amount: 100,
          period: "monthly",
          warningThreshold: 150,
        }),
      ).toThrow();
    });
  });

  describe("TokenOptimizationConfigSchema", () => {
    it("should accept valid configuration", () => {
      const validConfig = {
        pruningStrategy: "balanced" as const,
        enableAutoPruning: true,
        pruningThreshold: 80,
        tokenAllocation: {
          inputContextRatio: 0.7,
          systemInstructionsRatio: 0.1,
          outputGenerationRatio: 0.2,
        },
        enableCostTracking: true,
        costBudget: {
          amount: 100,
          period: "monthly" as const,
          warningThreshold: 80,
        },
        enableMessagePinning: true,
        slidingWindowSize: 10,
        coordinateWithCompaction: true,
        coordinateWithSmartContext: true,
      };
      expect(TokenOptimizationConfigSchema.parse(validConfig)).toEqual(
        validConfig,
      );
    });

    it("should accept configuration without optional fields", () => {
      const minimalConfig = {
        pruningStrategy: "conservative" as const,
        enableAutoPruning: false,
        pruningThreshold: 85,
        tokenAllocation: {
          inputContextRatio: 0.7,
          systemInstructionsRatio: 0.1,
          outputGenerationRatio: 0.2,
        },
        enableCostTracking: false,
        enableMessagePinning: false,
        coordinateWithCompaction: true,
        coordinateWithSmartContext: true,
      };
      expect(TokenOptimizationConfigSchema.parse(minimalConfig)).toEqual(
        minimalConfig,
      );
    });

    it("should reject invalid pruning threshold", () => {
      expect(() =>
        TokenOptimizationConfigSchema.parse({
          pruningStrategy: "balanced",
          enableAutoPruning: true,
          pruningThreshold: 150,
          tokenAllocation: {
            inputContextRatio: 0.7,
            systemInstructionsRatio: 0.1,
            outputGenerationRatio: 0.2,
          },
          enableCostTracking: false,
          enableMessagePinning: false,
          coordinateWithCompaction: true,
          coordinateWithSmartContext: true,
        }),
      ).toThrow();
    });
  });

  describe("MessagePrioritySchema", () => {
    it("should accept valid message priority", () => {
      const validPriority = {
        messageId: 123,
        score: 75.5,
        factors: {
          recency: 80,
          userInteraction: 70,
          semanticRelevance: 60,
          referenceCount: 3,
        },
        isPinned: false,
        isProtected: true,
      };
      expect(MessagePrioritySchema.parse(validPriority)).toEqual(validPriority);
    });

    it("should reject scores outside 0-100 range", () => {
      expect(() =>
        MessagePrioritySchema.parse({
          messageId: 123,
          score: 150,
          factors: {
            recency: 80,
            userInteraction: 70,
            semanticRelevance: 60,
            referenceCount: 3,
          },
          isPinned: false,
          isProtected: false,
        }),
      ).toThrow();
    });

    it("should reject negative reference count", () => {
      expect(() =>
        MessagePrioritySchema.parse({
          messageId: 123,
          score: 75,
          factors: {
            recency: 80,
            userInteraction: 70,
            semanticRelevance: 60,
            referenceCount: -1,
          },
          isPinned: false,
          isProtected: false,
        }),
      ).toThrow();
    });
  });

  describe("ProviderConfigSchema", () => {
    it("should accept valid provider configuration", () => {
      const validConfig = {
        providerId: "openai/gpt-4",
        contextWindow: 128000,
        maxOutputTokens: 4096,
        pricing: {
          inputTokensPerMillion: 30.0,
          outputTokensPerMillion: 60.0,
          lastUpdated: new Date("2024-01-01"),
        },
        optimalAllocation: {
          inputContextRatio: 0.7,
          systemInstructionsRatio: 0.1,
          outputGenerationRatio: 0.2,
        },
        supportsExtendedContext: false,
      };
      expect(ProviderConfigSchema.parse(validConfig)).toEqual(validConfig);
    });

    it("should reject empty provider ID", () => {
      expect(() =>
        ProviderConfigSchema.parse({
          providerId: "",
          contextWindow: 128000,
          pricing: {
            inputTokensPerMillion: 30.0,
            outputTokensPerMillion: 60.0,
            lastUpdated: new Date(),
          },
          optimalAllocation: {
            inputContextRatio: 0.7,
            systemInstructionsRatio: 0.1,
            outputGenerationRatio: 0.2,
          },
          supportsExtendedContext: false,
        }),
      ).toThrow();
    });

    it("should reject non-positive context window", () => {
      expect(() =>
        ProviderConfigSchema.parse({
          providerId: "test",
          contextWindow: 0,
          pricing: {
            inputTokensPerMillion: 30.0,
            outputTokensPerMillion: 60.0,
            lastUpdated: new Date(),
          },
          optimalAllocation: {
            inputContextRatio: 0.7,
            systemInstructionsRatio: 0.1,
            outputGenerationRatio: 0.2,
          },
          supportsExtendedContext: false,
        }),
      ).toThrow();
    });
  });

  describe("TokenBudgetSchema", () => {
    it("should accept valid token budget", () => {
      const validBudget = {
        total: 128000,
        allocated: {
          inputContext: 89600,
          systemInstructions: 12800,
          outputGeneration: 25600,
        },
        used: {
          inputContext: 50000,
          systemInstructions: 5000,
          outputGeneration: 10000,
        },
        remaining: 63000,
        provider: "openai/gpt-4",
      };
      expect(TokenBudgetSchema.parse(validBudget)).toEqual(validBudget);
    });

    it("should reject negative token values", () => {
      expect(() =>
        TokenBudgetSchema.parse({
          total: 128000,
          allocated: {
            inputContext: -1000,
            systemInstructions: 12800,
            outputGeneration: 25600,
          },
          used: {
            inputContext: 0,
            systemInstructions: 0,
            outputGeneration: 0,
          },
          remaining: 128000,
          provider: "test",
        }),
      ).toThrow();
    });
  });

  describe("CostRecordSchema", () => {
    it("should accept valid cost record", () => {
      const validRecord = {
        id: 1,
        timestamp: new Date("2024-01-01"),
        provider: "openai/gpt-4",
        appId: 1,
        chatId: 1,
        messageId: 1,
        inputTokens: 1000,
        outputTokens: 500,
        toolTokens: 200,
        inputCost: 0.03,
        outputCost: 0.03,
        totalCost: 0.06,
        model: "gpt-4",
      };
      expect(CostRecordSchema.parse(validRecord)).toEqual(validRecord);
    });

    it("should reject negative costs", () => {
      expect(() =>
        CostRecordSchema.parse({
          id: 1,
          timestamp: new Date(),
          provider: "test",
          appId: 1,
          chatId: 1,
          messageId: 1,
          inputTokens: 1000,
          outputTokens: 500,
          inputCost: -0.03,
          outputCost: 0.03,
          totalCost: 0.0,
          model: "test",
        }),
      ).toThrow();
    });
  });

  describe("PruningResultSchema", () => {
    it("should accept valid pruning result", () => {
      const validResult = {
        originalMessageCount: 100,
        prunedMessageCount: 60,
        tokensRemoved: 50000,
        strategy: "balanced" as const,
        preservedMessages: [1, 2, 3],
        removedMessages: [4, 5, 6],
        compressionSummaries: [
          {
            messageRange: [10, 20] as [number, number],
            summary: "Summary of messages 10-20",
          },
        ],
      };
      expect(PruningResultSchema.parse(validResult)).toEqual(validResult);
    });

    it("should reject negative message counts", () => {
      expect(() =>
        PruningResultSchema.parse({
          originalMessageCount: -1,
          prunedMessageCount: 60,
          tokensRemoved: 50000,
          strategy: "balanced",
          preservedMessages: [],
          removedMessages: [],
          compressionSummaries: [],
        }),
      ).toThrow();
    });
  });

  describe("OptimizationMetricsSchema", () => {
    it("should accept valid optimization metrics", () => {
      const validMetrics = {
        period: {
          start: new Date("2024-01-01"),
          end: new Date("2024-01-31"),
        },
        tokenUsage: {
          total: 1000000,
          byProvider: { "openai/gpt-4": 500000, "anthropic/claude": 500000 },
          byApp: { "1": 600000, "2": 400000 },
          saved: 200000,
        },
        costs: {
          total: 100.0,
          byProvider: { "openai/gpt-4": 60.0, "anthropic/claude": 40.0 },
          byApp: { "1": 70.0, "2": 30.0 },
          saved: 20.0,
        },
        pruningEffectiveness: {
          averageReduction: 35.5,
          strategyBreakdown: {
            conservative: 20.0,
            balanced: 35.0,
            aggressive: 50.0,
          },
        },
        highConsumptionConversations: [
          {
            chatId: 1,
            appId: 1,
            totalTokens: 500000,
            totalCost: 50.0,
          },
        ],
      };
      expect(OptimizationMetricsSchema.parse(validMetrics)).toEqual(
        validMetrics,
      );
    });

    it("should reject invalid average reduction percentage", () => {
      expect(() =>
        OptimizationMetricsSchema.parse({
          period: {
            start: new Date("2024-01-01"),
            end: new Date("2024-01-31"),
          },
          tokenUsage: {
            total: 1000000,
            byProvider: {},
            byApp: {},
            saved: 200000,
          },
          costs: {
            total: 100.0,
            byProvider: {},
            byApp: {},
            saved: 20.0,
          },
          pruningEffectiveness: {
            averageReduction: 150,
            strategyBreakdown: {},
          },
          highConsumptionConversations: [],
        }),
      ).toThrow();
    });
  });
});
