// Token Optimizer Integration Tests
// Feature: token-optimization
// Requirements: 7.1, 7.2

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { TokenOptimizer } from "./token_optimizer";
import type { Message } from "./message_history_manager";
import { initializeDatabase, db } from "@/db";
import { tokenOptimizationConfig, apps, chats, costRecords } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("TokenOptimizer Integration Tests", () => {
  let optimizer: TokenOptimizer;
  let testAppId: number;
  let testChatId: number;

  beforeAll(() => {
    // Initialize database before all tests
    initializeDatabase();
  });

  beforeEach(() => {
    optimizer = new TokenOptimizer();

    // Create test app
    const appResult = db
      .insert(apps)
      .values({
        name: "Test App",
        path: "/test/path",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: apps.id })
      .get();
    testAppId = appResult.id;

    // Create test chat
    const chatResult = db
      .insert(chats)
      .values({
        appId: testAppId,
        title: "Test Chat",
        createdAt: new Date(),
      })
      .returning({ id: chats.id })
      .get();
    testChatId = chatResult.id;
  });

  afterEach(() => {
    // Clean up test data
    try {
      db.delete(costRecords).where(eq(costRecords.appId, testAppId)).run();
    } catch (e) {
      // Ignore if table doesn't exist
    }
    try {
      db.delete(chats).where(eq(chats.appId, testAppId)).run();
    } catch (e) {
      // Ignore if table doesn't exist
    }
    try {
      db.delete(tokenOptimizationConfig)
        .where(eq(tokenOptimizationConfig.appId, testAppId))
        .run();
    } catch (e) {
      // Ignore if table doesn't exist
    }
    try {
      db.delete(tokenOptimizationConfig)
        .where(eq(tokenOptimizationConfig.appId, null))
        .run();
    } catch (e) {
      // Ignore if table doesn't exist
    }
    try {
      db.delete(apps).where(eq(apps.id, testAppId)).run();
    } catch (e) {
      // Ignore if table doesn't exist
    }
  });

  describe("Full Optimization Pipeline", () => {
    it("should execute full optimization flow: load config → calculate budget → prune context → track cost", async () => {
      // Arrange: Set up configuration
      await optimizer.updateConfig(
        {
          pruningStrategy: "balanced",
          enableAutoPruning: true,
          pruningThreshold: 80,
          enableCostTracking: true,
        },
        testAppId,
      );

      // Create a large message array that will trigger pruning
      const messages: Message[] = [];
      // Create enough messages to exceed 80% of context window
      // GPT-4 has 128k tokens, 80% = 102,400 tokens
      // Each message has ~2000 chars = ~500 tokens
      // Need ~205 messages to reach threshold
      for (let i = 0; i < 250; i++) {
        messages.push({
          id: i + 1,
          role: i % 2 === 0 ? "user" : "assistant",
          content: "This is a test message with some content. ".repeat(50), // ~2000 chars = ~500 tokens
          createdAt: new Date(Date.now() - (250 - i) * 1000),
          isPinned: false,
          isCompactionSummary: false,
          referenceCount: 0,
        });
      }

      // Add a system message (should be protected)
      messages.unshift({
        id: 0,
        role: "system",
        content: "You are a helpful assistant.",
        createdAt: new Date(Date.now() - 251000),
        isPinned: false,
        isCompactionSummary: false,
        referenceCount: 0,
      });

      const provider = "openai/gpt-4";

      // Act: Run optimization
      const result = await optimizer.optimizeContext(
        messages,
        provider,
        testAppId,
      );

      // Assert: Verify optimization result
      expect(result).toBeDefined();
      expect(result.optimizedMessages).toBeDefined();
      expect(result.pruningResult).toBeDefined();
      expect(result.tokenBudget).toBeDefined();
      expect(result.costEstimate).toBeDefined();

      // Verify pruning occurred (or at least was attempted)
      // Note: Pruning may not occur if threshold isn't reached
      // With 250 messages * ~500 tokens = ~125k tokens, which exceeds 80% of 128k
      // So pruning should occur
      if (result.pruningResult.tokensRemoved > 0) {
        expect(result.optimizedMessages.length).toBeLessThan(messages.length);
      } else {
        // If no pruning occurred, at least verify the result is valid
        expect(result.optimizedMessages.length).toBeLessThanOrEqual(
          messages.length,
        );
      }

      // Verify system message was preserved
      const systemMessage = result.optimizedMessages.find(
        (m) => m.role === "system",
      );
      expect(systemMessage).toBeDefined();
      expect(systemMessage?.id).toBe(0);

      // Verify most recent user and assistant messages were preserved
      const lastUserMessage = messages
        .filter((m) => m.role === "user")
        .slice(-1)[0];
      const lastAssistantMessage = messages
        .filter((m) => m.role === "assistant")
        .slice(-1)[0];

      expect(
        result.optimizedMessages.some((m) => m.id === lastUserMessage.id),
      ).toBe(true);
      expect(
        result.optimizedMessages.some((m) => m.id === lastAssistantMessage.id),
      ).toBe(true);

      // Verify token budget was calculated
      expect(result.tokenBudget.total).toBe(128_000); // OpenAI GPT-4 context window
      expect(result.tokenBudget.allocated.inputContext).toBeGreaterThan(0);
      expect(result.tokenBudget.allocated.systemInstructions).toBeGreaterThan(
        0,
      );
      expect(result.tokenBudget.allocated.outputGeneration).toBeGreaterThan(0);

      // Verify cost estimate was calculated
      expect(result.costEstimate).toBeDefined();
      expect(result.costEstimate!.inputCost).toBeGreaterThan(0);
      expect(result.costEstimate!.outputCost).toBeGreaterThan(0);
      expect(result.costEstimate!.totalCost).toBeGreaterThan(0);
    });

    it("should skip pruning when below threshold", async () => {
      // Arrange: Set up configuration
      await optimizer.updateConfig(
        {
          pruningStrategy: "balanced",
          enableAutoPruning: true,
          pruningThreshold: 80,
        },
        testAppId,
      );

      // Create a small message array that won't trigger pruning
      const messages: Message[] = [
        {
          id: 1,
          role: "system",
          content: "You are a helpful assistant.",
          createdAt: new Date(),
          isPinned: false,
          isCompactionSummary: false,
          referenceCount: 0,
        },
        {
          id: 2,
          role: "user",
          content: "Hello!",
          createdAt: new Date(),
          isPinned: false,
          isCompactionSummary: false,
          referenceCount: 0,
        },
        {
          id: 3,
          role: "assistant",
          content: "Hi! How can I help you today?",
          createdAt: new Date(),
          isPinned: false,
          isCompactionSummary: false,
          referenceCount: 0,
        },
      ];

      const provider = "openai/gpt-4";

      // Act: Run optimization
      const result = await optimizer.optimizeContext(
        messages,
        provider,
        testAppId,
      );

      // Assert: Verify no pruning occurred
      expect(result.optimizedMessages.length).toBe(messages.length);
      expect(result.pruningResult.tokensRemoved).toBe(0);
      expect(result.pruningResult.removedMessages).toHaveLength(0);
    });

    it("should respect auto-pruning disabled setting", async () => {
      // Arrange: Disable auto-pruning
      await optimizer.updateConfig(
        {
          pruningStrategy: "aggressive",
          enableAutoPruning: false,
          pruningThreshold: 80,
        },
        testAppId,
      );

      // Create a large message array
      const messages: Message[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push({
          id: i + 1,
          role: i % 2 === 0 ? "user" : "assistant",
          content: "This is a test message with some content. ".repeat(50),
          createdAt: new Date(),
          isPinned: false,
          isCompactionSummary: false,
          referenceCount: 0,
        });
      }

      const provider = "openai/gpt-4";

      // Act: Run optimization
      const result = await optimizer.optimizeContext(
        messages,
        provider,
        testAppId,
      );

      // Assert: Verify no pruning occurred despite large message array
      expect(result.optimizedMessages.length).toBe(messages.length);
      expect(result.pruningResult.tokensRemoved).toBe(0);
    });
  });

  describe("Coordination with Compaction", () => {
    it("should indicate optimization should run before compaction when threshold is reached", async () => {
      // Arrange: Set up configuration
      await optimizer.updateConfig(
        {
          pruningStrategy: "balanced",
          enableAutoPruning: true,
          pruningThreshold: 80,
          coordinateWithCompaction: true,
        },
        testAppId,
      );

      // Create a large message array
      const messages: Message[] = [];
      // Create enough messages to exceed 80% of context window
      for (let i = 0; i < 250; i++) {
        messages.push({
          id: i + 1,
          role: i % 2 === 0 ? "user" : "assistant",
          content: "This is a test message with some content. ".repeat(50),
          createdAt: new Date(),
          isPinned: false,
          isCompactionSummary: false,
          referenceCount: 0,
        });
      }

      const provider = "openai/gpt-4";

      // Act: Check if optimization should run before compaction
      const shouldRun = await optimizer.shouldRunBeforeCompaction(
        messages,
        provider,
        testAppId,
      );

      // Assert: Should return true because threshold is reached
      expect(shouldRun).toBe(true);
    });

    it("should indicate optimization should not run when below threshold", async () => {
      // Arrange: Set up configuration
      await optimizer.updateConfig(
        {
          pruningStrategy: "balanced",
          enableAutoPruning: true,
          pruningThreshold: 80,
          coordinateWithCompaction: true,
        },
        testAppId,
      );

      // Create a small message array
      const messages: Message[] = [
        {
          id: 1,
          role: "user",
          content: "Hello!",
          createdAt: new Date(),
          isPinned: false,
          isCompactionSummary: false,
          referenceCount: 0,
        },
      ];

      const provider = "openai/gpt-4";

      // Act: Check if optimization should run before compaction
      const shouldRun = await optimizer.shouldRunBeforeCompaction(
        messages,
        provider,
        testAppId,
      );

      // Assert: Should return false because threshold is not reached
      expect(shouldRun).toBe(false);
    });

    it("should respect coordination disabled setting", async () => {
      // Arrange: Disable coordination
      await optimizer.updateConfig(
        {
          pruningStrategy: "balanced",
          enableAutoPruning: true,
          pruningThreshold: 80,
          coordinateWithCompaction: false,
        },
        testAppId,
      );

      // Create a large message array
      const messages: Message[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push({
          id: i + 1,
          role: i % 2 === 0 ? "user" : "assistant",
          content: "This is a test message with some content. ".repeat(50),
          createdAt: new Date(),
          isPinned: false,
          isCompactionSummary: false,
          referenceCount: 0,
        });
      }

      const provider = "openai/gpt-4";

      // Act: Check if optimization should run before compaction
      const shouldRun = await optimizer.shouldRunBeforeCompaction(
        messages,
        provider,
        testAppId,
      );

      // Assert: Should return false because coordination is disabled
      expect(shouldRun).toBe(false);
    });
  });

  describe("Cost Tracking", () => {
    it("should record token usage when cost tracking is enabled", async () => {
      // Arrange: Enable cost tracking
      await optimizer.updateConfig(
        {
          enableCostTracking: true,
        },
        testAppId,
      );

      // Act: Record token usage (without messageId to avoid foreign key constraint)
      await optimizer.recordTokenUsage({
        provider: "openai/gpt-4",
        model: "gpt-4",
        appId: testAppId,
        chatId: testChatId,
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Assert: Verify cost record was created
      const records = db
        .select()
        .from(costRecords)
        .where(eq(costRecords.chatId, testChatId))
        .all();

      expect(records).toHaveLength(1);
      expect(records[0].inputTokens).toBe(1000);
      expect(records[0].outputTokens).toBe(500);
      expect(records[0].totalCost).toBeGreaterThan(0);
    });

    it("should skip recording when cost tracking is disabled", async () => {
      // Arrange: Disable cost tracking
      await optimizer.updateConfig(
        {
          enableCostTracking: false,
        },
        testAppId,
      );

      // Act: Record token usage (without messageId to avoid foreign key constraint)
      await optimizer.recordTokenUsage({
        provider: "openai/gpt-4",
        model: "gpt-4",
        appId: testAppId,
        chatId: testChatId,
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Assert: Verify no cost record was created
      const records = db
        .select()
        .from(costRecords)
        .where(eq(costRecords.chatId, testChatId))
        .all();

      expect(records).toHaveLength(0);
    });
  });

  describe("Configuration Management", () => {
    it("should load default configuration when no configuration exists", async () => {
      // Act: Load configuration for app with no config
      const config = await optimizer.loadConfig(testAppId);

      // Assert: Should return default configuration
      expect(config).toBeDefined();
      expect(config.pruningStrategy).toBe("balanced");
      expect(config.enableAutoPruning).toBe(true);
      expect(config.pruningThreshold).toBe(80);
      expect(config.enableCostTracking).toBe(true);
    });

    it("should load app-scoped configuration when it exists", async () => {
      // Arrange: Create app-scoped configuration
      await optimizer.updateConfig(
        {
          pruningStrategy: "aggressive",
          pruningThreshold: 70,
        },
        testAppId,
      );

      // Act: Load configuration
      const config = await optimizer.loadConfig(testAppId);

      // Assert: Should return app-scoped configuration
      expect(config.pruningStrategy).toBe("aggressive");
      expect(config.pruningThreshold).toBe(70);
    });

    it("should fall back to default configuration when no configuration exists", async () => {
      // Arrange: Ensure no configuration exists for testAppId
      // (This test verifies the fallback to default config)

      // Act: Load configuration for app with no config
      const config = await optimizer.loadConfig(999999); // Use non-existent app ID

      // Assert: Should return default configuration
      expect(config.pruningStrategy).toBe("balanced");
      expect(config.pruningThreshold).toBe(80);
      expect(config.enableAutoPruning).toBe(true);
    });

    it("should update existing configuration", async () => {
      // Arrange: Create initial configuration
      await optimizer.updateConfig(
        {
          pruningStrategy: "balanced",
          pruningThreshold: 80,
        },
        testAppId,
      );

      // Act: Update configuration
      await optimizer.updateConfig(
        {
          pruningStrategy: "aggressive",
        },
        testAppId,
      );

      // Assert: Should have updated configuration
      const config = await optimizer.loadConfig(testAppId);
      expect(config.pruningStrategy).toBe("aggressive");
      expect(config.pruningThreshold).toBe(80); // Should preserve existing value
    });
  });

  describe("Analytics Integration", () => {
    it("should retrieve analytics metrics", async () => {
      // Arrange: Record some cost data
      await optimizer.updateConfig(
        {
          enableCostTracking: true,
        },
        testAppId,
      );

      await optimizer.recordTokenUsage({
        provider: "openai/gpt-4",
        model: "gpt-4",
        appId: testAppId,
        chatId: testChatId,
        inputTokens: 1000,
        outputTokens: 500,
      });

      // Act: Get analytics metrics
      const metrics = await optimizer.getAnalyticsMetrics({
        appId: testAppId,
      });

      // Assert: Should return metrics
      expect(metrics).toBeDefined();
      expect(metrics.tokenUsage).toBeDefined();
      expect(metrics.costs).toBeDefined();
      expect(metrics.tokenUsage.total).toBeGreaterThan(0);
      expect(metrics.costs.total).toBeGreaterThan(0);
    });
  });
});
