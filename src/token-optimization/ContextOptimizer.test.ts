/**
 * Unit tests for ContextOptimizer
 *
 * Tests the core optimization pipeline coordination and threshold checking
 */

import { describe, it, expect } from "vitest";
import {
  ContextOptimizer,
  Context,
  ConversationTurn,
  FileContext,
  SkillContext,
} from "./ContextOptimizer";
import { TokenBudget } from "./TokenManager";

describe("ContextOptimizer", () => {
  const optimizer = new ContextOptimizer();

  // Helper function to create a test context
  function createTestContext(totalTokens: number): Context {
    return {
      userInstructions: ["Test instruction"],
      conversationHistory: [] as ConversationTurn[],
      files: [] as FileContext[],
      skills: [] as SkillContext[],
      metadata: {
        totalTokens,
        timestamp: Date.now(),
        requestId: "test-request",
      },
    };
  }

  // Helper function to create a test budget
  function createTestBudget(total: number): TokenBudget {
    return {
      total,
      used: 0,
      remaining: total,
      warningThreshold: Math.floor(total * 0.8), // 80%
      criticalThreshold: Math.floor(total * 0.9), // 90%
    };
  }

  describe("shouldOptimize", () => {
    it("should return false when context is below warning threshold", () => {
      const context = createTestContext(7000); // 70% of 10000
      const budget = createTestBudget(10000);

      const result = optimizer.shouldOptimize(context, budget);

      expect(result.shouldOptimize).toBe(false);
      expect(result.level).toBe("none");
    });

    it("should return true with warning level when context exceeds 80% threshold", () => {
      const context = createTestContext(8500); // 85% of 10000
      const budget = createTestBudget(10000);

      const result = optimizer.shouldOptimize(context, budget);

      expect(result.shouldOptimize).toBe(true);
      expect(result.level).toBe("warning");
    });

    it("should return true with critical level when context exceeds 90% threshold", () => {
      const context = createTestContext(9500); // 95% of 10000
      const budget = createTestBudget(10000);

      const result = optimizer.shouldOptimize(context, budget);

      expect(result.shouldOptimize).toBe(true);
      expect(result.level).toBe("critical");
    });

    it("should return warning level when exactly at 80% threshold", () => {
      const context = createTestContext(8000); // Exactly 80% of 10000
      const budget = createTestBudget(10000);

      const result = optimizer.shouldOptimize(context, budget);

      expect(result.shouldOptimize).toBe(true);
      expect(result.level).toBe("warning");
    });

    it("should return critical level when exactly at 90% threshold", () => {
      const context = createTestContext(9000); // Exactly 90% of 10000
      const budget = createTestBudget(10000);

      const result = optimizer.shouldOptimize(context, budget);

      expect(result.shouldOptimize).toBe(true);
      expect(result.level).toBe("critical");
    });
  });

  describe("optimize", () => {
    it("should return unchanged context when below warning threshold", () => {
      const context = createTestContext(7000);
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      expect(result.originalTokenCount).toBe(7000);
      expect(result.optimizedTokenCount).toBe(7000);
      expect(result.compressionRatio).toBe(1.0);
      expect(result.optimizationsApplied).toEqual([]);
    });

    it("should preserve user instructions during optimization", () => {
      const context = createTestContext(9000);
      context.userInstructions = [
        "Important user instruction 1",
        "Important user instruction 2",
      ];
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      expect(result.userInstructions).toEqual([
        "Important user instruction 1",
        "Important user instruction 2",
      ]);
    });

    it("should include metadata about original and optimized token counts", () => {
      const context = createTestContext(9000);
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      expect(result.originalTokenCount).toBe(9000);
      expect(result.optimizedTokenCount).toBeDefined();
      expect(result.compressionRatio).toBeDefined();
      expect(result.compressionRatio).toBeGreaterThan(0);
      expect(result.compressionRatio).toBeLessThanOrEqual(1.0);
    });

    it("should track which optimizations were applied", () => {
      const context = createTestContext(9000);
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      expect(result.optimizationsApplied).toBeDefined();
      expect(Array.isArray(result.optimizationsApplied)).toBe(true);
    });

    it("should include debug info when optimizations are applied", () => {
      const context = createTestContext(9000);
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      expect(result.debugInfo).toBeDefined();
    });
  });

  describe("user content preservation", () => {
    it("should preserve user instructions exactly as provided", () => {
      const context = createTestContext(9000);
      context.userInstructions = [
        "User instruction 1",
        "User instruction 2",
        "User instruction 3",
      ];
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      expect(result.userInstructions).toEqual([
        "User instruction 1",
        "User instruction 2",
        "User instruction 3",
      ]);
      expect(result.userInstructions.length).toBe(3);
    });

    it("should mark user-provided files correctly", () => {
      const context = createTestContext(5000);
      context.files = [
        {
          path: "user-file.ts",
          content: "user content",
          isUserProvided: true,
        },
        {
          path: "auto-file.ts",
          content: "auto content",
          isUserProvided: false,
        },
        {
          path: "unmarked-file.ts",
          content: "unmarked content",
          // isUserProvided not set
        },
      ];

      const result = optimizer.optimize(context, createTestBudget(10000));

      expect(result.files[0].isUserProvided).toBe(true);
      expect(result.files[1].isUserProvided).toBe(false);
      expect(result.files[2].isUserProvided).toBe(false); // defaults to false
    });

    it("should preserve user-provided files during optimization", () => {
      const context = createTestContext(9000);
      context.files = [
        {
          path: "user-file.ts",
          content: "important user content that must be preserved",
          isUserProvided: true,
          tokenCount: 100,
        },
        {
          path: "auto-file.ts",
          content: "auto-discovered content",
          isUserProvided: false,
          tokenCount: 50,
        },
      ];
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      // User-provided file should be preserved
      const userFile = result.files.find((f) => f.path === "user-file.ts");
      expect(userFile).toBeDefined();
      expect(userFile?.content).toBe(
        "important user content that must be preserved",
      );
      expect(userFile?.isUserProvided).toBe(true);
    });

    it("should identify user-provided files correctly", () => {
      const userFile: FileContext = {
        path: "user.ts",
        content: "content",
        isUserProvided: true,
      };
      const autoFile: FileContext = {
        path: "auto.ts",
        content: "content",
        isUserProvided: false,
      };
      const unmarkedFile: FileContext = {
        path: "unmarked.ts",
        content: "content",
      };

      expect(optimizer.isUserProvided(userFile)).toBe(true);
      expect(optimizer.isUserProvided(autoFile)).toBe(false);
      expect(optimizer.isUserProvided(unmarkedFile)).toBe(false);
    });

    it("should never modify user instructions content", () => {
      const originalInstructions = [
        "Do not modify this instruction",
        "This is critical user input",
        "Preserve this exactly",
      ];
      const context = createTestContext(9500); // Critical threshold
      context.userInstructions = [...originalInstructions];
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      // User instructions should be identical
      expect(result.userInstructions).toEqual(originalInstructions);
      // Verify deep equality
      result.userInstructions.forEach((instruction, index) => {
        expect(instruction).toBe(originalInstructions[index]);
      });
    });

    it("should preserve empty user instructions array", () => {
      const context = createTestContext(9000);
      context.userInstructions = [];
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      expect(result.userInstructions).toEqual([]);
      expect(Array.isArray(result.userInstructions)).toBe(true);
    });

    it("should handle context with only user-provided content", () => {
      const context = createTestContext(9000);
      context.userInstructions = ["User instruction"];
      context.files = [
        {
          path: "user1.ts",
          content: "user content 1",
          isUserProvided: true,
        },
        {
          path: "user2.ts",
          content: "user content 2",
          isUserProvided: true,
        },
      ];
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      expect(result.userInstructions).toEqual(["User instruction"]);
      expect(result.files.length).toBe(2);
      expect(result.files.every((f) => f.isUserProvided)).toBe(true);
    });

    it("should handle context with no user-provided content", () => {
      const context = createTestContext(9000);
      context.userInstructions = [];
      context.files = [
        {
          path: "auto1.ts",
          content: "auto content 1",
          isUserProvided: false,
        },
        {
          path: "auto2.ts",
          content: "auto content 2",
          isUserProvided: false,
        },
      ];
      const budget = createTestBudget(10000);

      const result = optimizer.optimize(context, budget);

      expect(result.userInstructions).toEqual([]);
      expect(result.files.every((f) => !f.isUserProvided)).toBe(true);
    });
  });

  describe("prune", () => {
    it("should return context with pruning metrics", () => {
      const context = createTestContext(5000);

      const result = optimizer.prune(context);

      expect(result.pruningMetrics).toBeDefined();
      expect(result.pruningMetrics.duplicatesRemoved).toBeDefined();
      expect(result.pruningMetrics.loggingStatementsRemoved).toBeDefined();
      expect(result.pruningMetrics.commentsRemoved).toBeDefined();
      expect(result.pruningMetrics.turnsRemoved).toBeDefined();
      expect(result.pruningMetrics.tokensSaved).toBeDefined();
    });

    it("should preserve context structure", () => {
      const context = createTestContext(5000);
      context.userInstructions = ["Test"];
      context.files = [
        {
          path: "test.ts",
          content: "const x = 1;",
        },
      ];

      const result = optimizer.prune(context);

      expect(result.userInstructions).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.conversationHistory).toBeDefined();
      expect(result.skills).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe("compress", () => {
    it("should return context with compression metrics", () => {
      const context = createTestContext(5000);

      const result = optimizer.compress(context);

      expect(result.compressionMetrics).toBeDefined();
      expect(result.compressionMetrics.filesCompressed).toBeDefined();
      expect(result.compressionMetrics.signaturesExtracted).toBeDefined();
      expect(result.compressionMetrics.patternsReplaced).toBeDefined();
      expect(result.compressionMetrics.tokensSaved).toBeDefined();
    });

    it("should preserve context structure", () => {
      const context = createTestContext(5000);
      context.userInstructions = ["Test"];
      context.files = [
        {
          path: "test.ts",
          content: "const x = 1;",
        },
      ];

      const result = optimizer.compress(context);

      expect(result.userInstructions).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.conversationHistory).toBeDefined();
      expect(result.skills).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe("selectRelevant", () => {
    it("should return context with selected content", () => {
      const context = createTestContext(5000);
      context.files = [
        {
          path: "file1.ts",
          content: "content1",
          relevanceScore: 0.9,
        },
        {
          path: "file2.ts",
          content: "content2",
          relevanceScore: 0.3,
        },
      ];

      const result = optimizer.selectRelevant(context, "test task", 3000);

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
    });

    it("should preserve context structure", () => {
      const context = createTestContext(5000);
      context.userInstructions = ["Test"];

      const result = optimizer.selectRelevant(context, "test task", 3000);

      expect(result.userInstructions).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.conversationHistory).toBeDefined();
      expect(result.skills).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
});
