/**
 * Unit tests for AdaptiveSelector
 *
 * Tests Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdaptiveSelector } from "./AdaptiveSelector";
import type {
  Context,
  FileContext,
  ConversationTurn,
} from "./ContextOptimizer";

describe("AdaptiveSelector", () => {
  let selector: AdaptiveSelector;

  beforeEach(() => {
    selector = new AdaptiveSelector();
  });

  // Helper to create a test file
  const createFile = (
    path: string,
    content: string,
    isUserProvided = false,
  ): FileContext => ({
    path,
    content,
    isUserProvided,
    tokenCount: Math.ceil(content.length / 4),
  });

  // Helper to create a test conversation turn
  const createTurn = (
    role: "user" | "assistant" | "system",
    content: string,
    timestamp: number,
  ): ConversationTurn => ({
    role,
    content,
    timestamp,
    tokenCount: Math.ceil(content.length / 4),
  });

  // Helper to create a test context
  const createContext = (
    files: FileContext[],
    turns: ConversationTurn[],
    userInstructions: string[] = [],
  ): Context => {
    let totalTokens = 0;
    for (const instruction of userInstructions) {
      totalTokens += Math.ceil(instruction.length / 4);
    }
    for (const file of files) {
      totalTokens += file.tokenCount || 0;
    }
    for (const turn of turns) {
      totalTokens += turn.tokenCount || 0;
    }

    return {
      userInstructions,
      conversationHistory: turns,
      files,
      skills: [],
      metadata: {
        totalTokens,
        timestamp: Date.now(),
      },
    };
  };

  describe("rankFilesByRelevance", () => {
    it("should rank files by relevance to task (Requirement 8.1)", () => {
      const files = [
        createFile(
          "auth.ts",
          "function login() { /* authentication logic */ }",
        ),
        createFile("database.ts", "function query() { /* database query */ }"),
        createFile(
          "login.ts",
          "function handleLogin() { /* login handler */ }",
        ),
      ];

      const task = "implement user login authentication";
      const ranked = selector.rankFilesByRelevance(files, task);

      // Files with "login" and "auth" should rank higher
      expect(ranked[0].path).toMatch(/login|auth/);
      expect(ranked[ranked.length - 1].path).toBe("database.ts");
    });

    it("should prioritize user-provided files (Requirement 8.5)", () => {
      const files = [
        createFile("auto.ts", "function autoDiscovered() { /* auto */ }"),
        createFile("user.ts", "function userProvided() { /* user */ }", true),
        createFile("other.ts", "function other() { /* other */ }"),
      ];

      const task = "implement something";
      const ranked = selector.rankFilesByRelevance(files, task);

      // User-provided file should be first
      expect(ranked[0].path).toBe("user.ts");
      expect(ranked[0].isUserProvided).toBe(true);
      expect(ranked[0].relevanceScore).toBe(1.0);
    });

    it("should assign relevance scores to all files", () => {
      const files = [
        createFile("test.ts", "test content"),
        createFile("other.ts", "other content"),
      ];

      const task = "test task";
      const ranked = selector.rankFilesByRelevance(files, task);

      // All files should have relevance scores
      for (const file of ranked) {
        expect(file.relevanceScore).toBeDefined();
        expect(file.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(file.relevanceScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("applyDifferentialInclusion", () => {
    it("should include high-relevance files in full (Requirement 8.2)", () => {
      const files = [
        { ...createFile("high.ts", "a".repeat(400)), relevanceScore: 0.8 },
        { ...createFile("low.ts", "b".repeat(400)), relevanceScore: 0.2 },
      ];

      const budget = 500; // tokens
      const result = selector.applyDifferentialInclusion(files, budget);

      // High relevance file should be included in full
      const highFile = result.find((f) => f.path === "high.ts");
      expect(highFile).toBeDefined();
      expect(highFile?.content).toBe("a".repeat(400));
    });

    it("should include medium-relevance files as summaries (Requirement 8.2)", () => {
      const files = [
        {
          ...createFile("medium.ts", "x".repeat(1000)),
          relevanceScore: 0.4,
        },
      ];

      const budget = 500; // tokens
      const result = selector.applyDifferentialInclusion(files, budget);

      // Medium relevance file should be included as summary
      const mediumFile = result.find((f) => f.path === "medium.ts");
      expect(mediumFile).toBeDefined();
      expect(mediumFile?.content.length).toBeLessThan(1000);
      expect(mediumFile?.content).toContain("File: medium.ts");
    });

    it("should exclude low-relevance files (Requirement 8.2)", () => {
      const files = [
        { ...createFile("low.ts", "content"), relevanceScore: 0.1 },
      ];

      const budget = 1000; // tokens
      const result = selector.applyDifferentialInclusion(files, budget);

      // Low relevance file should be excluded
      expect(result).toHaveLength(0);
    });

    it("should always include user-provided files in full (Requirement 8.5)", () => {
      const files = [
        {
          ...createFile("user.ts", "user content", true),
          relevanceScore: 0.1, // Low relevance, but user-provided
        },
      ];

      const budget = 100; // tokens
      const result = selector.applyDifferentialInclusion(files, budget);

      // User-provided file should be included despite low relevance
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("user.ts");
      expect(result[0].content).toBe("user content");
    });

    it("should respect token budget", () => {
      const files = [
        { ...createFile("file1.ts", "a".repeat(400)), relevanceScore: 0.9 },
        { ...createFile("file2.ts", "b".repeat(400)), relevanceScore: 0.8 },
        { ...createFile("file3.ts", "c".repeat(400)), relevanceScore: 0.7 },
      ];

      const budget = 150; // Only enough for ~1.5 files
      const result = selector.applyDifferentialInclusion(files, budget);

      // Should not exceed budget
      let totalTokens = 0;
      for (const file of result) {
        totalTokens += file.tokenCount || 0;
      }
      expect(totalTokens).toBeLessThanOrEqual(budget);
    });
  });

  describe("selectRelevantTurns", () => {
    it("should include recent turns (Requirement 8.3)", () => {
      const turns = [
        createTurn("user", "old message 1", 1000),
        createTurn("assistant", "old response 1", 1001),
        createTurn("user", "old message 2", 1002),
        createTurn("assistant", "old response 2", 1003),
        createTurn("user", "recent message 1", 1004),
        createTurn("assistant", "recent response 1", 1005),
        createTurn("user", "recent message 2", 1006),
        createTurn("assistant", "recent response 2", 1007),
      ];

      const task = "some task";
      const budget = 500; // tokens
      const result = selector.selectRelevantTurns(turns, task, budget, 4);

      // Should include at least the 4 most recent turns
      const recentTurns = turns.slice(-4);
      for (const recentTurn of recentTurns) {
        expect(result).toContainEqual(recentTurn);
      }
    });

    it("should select relevant past turns using semantic similarity (Requirement 8.4)", () => {
      const turns = [
        createTurn("user", "how do I implement authentication?", 1000),
        createTurn("assistant", "use JWT tokens for auth", 1001),
        createTurn("user", "what about database queries?", 1002),
        createTurn("assistant", "use prepared statements", 1003),
        createTurn("user", "recent unrelated message", 1004),
      ];

      const task = "implement user authentication with JWT";
      const budget = 500; // tokens
      const result = selector.selectRelevantTurns(turns, task, budget, 1);

      // Should include recent turn and relevant auth-related turns
      expect(result.length).toBeGreaterThan(1);
      const contents = result.map((t) => t.content).join(" ");
      expect(contents).toContain("authentication");
    });

    it("should preserve system messages (Requirement 8.3)", () => {
      const turns = [
        createTurn("system", "You are a helpful assistant", 1000),
        createTurn("user", "old message", 1001),
        createTurn("assistant", "old response", 1002),
        createTurn("user", "recent message", 1003),
      ];

      const task = "some task";
      const budget = 200; // tokens
      const result = selector.selectRelevantTurns(turns, task, budget, 1);

      // System message should be preserved
      const systemTurn = result.find((t) => t.role === "system");
      expect(systemTurn).toBeDefined();
      expect(systemTurn?.content).toBe("You are a helpful assistant");
    });

    it("should maintain chronological order", () => {
      const turns = [
        createTurn("user", "message 1", 1000),
        createTurn("assistant", "response 1", 1001),
        createTurn("user", "message 2", 1002),
        createTurn("assistant", "response 2", 1003),
      ];

      const task = "some task";
      const budget = 500; // tokens
      const result = selector.selectRelevantTurns(turns, task, budget);

      // Result should be in chronological order
      for (let i = 1; i < result.length; i++) {
        expect(result[i].timestamp).toBeGreaterThanOrEqual(
          result[i - 1].timestamp,
        );
      }
    });

    it("should respect token budget", () => {
      const turns = [
        createTurn("user", "a".repeat(400), 1000),
        createTurn("assistant", "b".repeat(400), 1001),
        createTurn("user", "c".repeat(400), 1002),
        createTurn("assistant", "d".repeat(400), 1003),
      ];

      const task = "some task";
      const budget = 150; // Only enough for ~1.5 turns
      const result = selector.selectRelevantTurns(turns, task, budget, 1);

      // Should not exceed budget
      let totalTokens = 0;
      for (const turn of result) {
        totalTokens += turn.tokenCount || 0;
      }
      expect(totalTokens).toBeLessThanOrEqual(budget);
    });
  });

  describe("selectRelevant (integration)", () => {
    it("should coordinate file ranking, differential inclusion, and turn selection (Requirements 8.1-8.5)", () => {
      const files = [
        createFile("auth.ts", "authentication code", false),
        createFile("user.ts", "user provided code", true),
        createFile("db.ts", "database code", false),
      ];

      const turns = [
        createTurn("system", "You are helpful", 1000),
        createTurn("user", "implement auth", 1001),
        createTurn("assistant", "here's auth code", 1002),
        createTurn("user", "recent message", 1003),
      ];

      const context = createContext(files, turns, ["User instruction"]);
      const task = "implement authentication";
      const budget = 500; // tokens

      const result = selector.selectRelevant(context, task, budget);

      // Should preserve user instructions
      expect(result.userInstructions).toEqual(["User instruction"]);

      // Should include user-provided file
      const userFile = result.files.find((f) => f.path === "user.ts");
      expect(userFile).toBeDefined();

      // Should include relevant files
      const authFile = result.files.find((f) => f.path === "auth.ts");
      expect(authFile).toBeDefined();

      // Should include system message
      const systemTurn = result.conversationHistory.find(
        (t) => t.role === "system",
      );
      expect(systemTurn).toBeDefined();

      // Should not exceed budget
      expect(result.metadata.totalTokens).toBeLessThanOrEqual(budget);
    });

    it("should prioritize user content when budget is tight", () => {
      const files = [
        createFile("user.ts", "a".repeat(200), true),
        createFile("auto.ts", "b".repeat(200), false),
      ];

      const context = createContext(files, [], ["Important user instruction"]);
      const task = "implement feature";
      const budget = 100; // Very tight budget

      const result = selector.selectRelevant(context, task, budget);

      // User instructions should be preserved
      expect(result.userInstructions).toEqual(["Important user instruction"]);

      // User-provided file should be prioritized
      if (result.files.length > 0) {
        expect(result.files[0].path).toBe("user.ts");
      }
    });

    it("should handle empty context gracefully", () => {
      const context = createContext([], [], []);
      const task = "some task";
      const budget = 1000;

      const result = selector.selectRelevant(context, task, budget);

      expect(result.userInstructions).toEqual([]);
      expect(result.conversationHistory).toEqual([]);
      expect(result.files).toEqual([]);
      expect(result.skills).toEqual([]);
    });
  });
});
