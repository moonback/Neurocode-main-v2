/**
 * Unit tests for PruningEngine
 *
 * Tests Requirements: 1.3, 1.4, 1.5, 1.6
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PruningEngine } from "./PruningEngine";
import type { Context, ConversationTurn } from "./ContextOptimizer";

describe("PruningEngine", () => {
  let engine: PruningEngine;

  beforeEach(() => {
    engine = new PruningEngine();
  });

  describe("removeDuplicates", () => {
    it("should remove duplicate files with identical content", () => {
      const context: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "file1.ts",
            content: "const x = 1;",
            isUserProvided: false,
          },
          {
            path: "file2.ts",
            content: "const x = 1;", // Duplicate content
            isUserProvided: false,
          },
          {
            path: "file3.ts",
            content: "const y = 2;",
            isUserProvided: false,
          },
        ],
        skills: [],
        metadata: { totalTokens: 100, timestamp: Date.now() },
      };

      const result = engine.removeDuplicates(context);

      expect(result.files).toHaveLength(2);
      expect(result.files[0].path).toBe("file1.ts");
      expect(result.files[1].path).toBe("file3.ts");
    });

    it("should preserve user-provided files even if they are duplicates", () => {
      const context: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "file1.ts",
            content: "const x = 1;",
            isUserProvided: false,
          },
          {
            path: "file2.ts",
            content: "const x = 1;", // Duplicate but user-provided
            isUserProvided: true,
          },
        ],
        skills: [],
        metadata: { totalTokens: 100, timestamp: Date.now() },
      };

      const result = engine.removeDuplicates(context);

      expect(result.files).toHaveLength(2);
      expect(result.files.some((f) => f.path === "file2.ts")).toBe(true);
    });

    it("should keep all files when there are no duplicates", () => {
      const context: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          { path: "file1.ts", content: "const x = 1;", isUserProvided: false },
          { path: "file2.ts", content: "const y = 2;", isUserProvided: false },
          { path: "file3.ts", content: "const z = 3;", isUserProvided: false },
        ],
        skills: [],
        metadata: { totalTokens: 100, timestamp: Date.now() },
      };

      const result = engine.removeDuplicates(context);

      expect(result.files).toHaveLength(3);
    });
  });

  describe("removeLogging", () => {
    it("should remove console.log statements", () => {
      const code = `
function test() {
  console.log('debug message');
  const x = 1;
  console.log('another message');
  return x;
}`;

      const result = engine.removeLogging(code);

      expect(result).not.toContain("console.log");
      expect(result).toContain("const x = 1;");
      expect(result).toContain("return x;");
    });

    it("should remove various console methods", () => {
      const code = `
console.log('log');
console.debug('debug');
console.info('info');
console.warn('warn');
console.error('error');
const x = 1;`;

      const result = engine.removeLogging(code);

      expect(result).not.toContain("console.log");
      expect(result).not.toContain("console.debug");
      expect(result).not.toContain("console.info");
      expect(result).not.toContain("console.warn");
      expect(result).not.toContain("console.error");
      expect(result).toContain("const x = 1;");
    });

    it("should remove logger statements", () => {
      const code = `
logger.debug('debug');
logger.info('info');
logger.warn('warn');
logger.error('error');
logger.trace('trace');
const x = 1;`;

      const result = engine.removeLogging(code);

      expect(result).not.toContain("logger.debug");
      expect(result).not.toContain("logger.info");
      expect(result).not.toContain("logger.warn");
      expect(result).not.toContain("logger.error");
      expect(result).not.toContain("logger.trace");
      expect(result).toContain("const x = 1;");
    });

    it("should handle multi-line logging statements", () => {
      const code = `
console.log(
  'multi-line',
  'message'
);
const x = 1;`;

      const result = engine.removeLogging(code);

      expect(result).not.toContain("console.log");
      expect(result).toContain("const x = 1;");
    });

    it("should preserve code that is not logging", () => {
      const code = `
function myConsole() {
  return { log: () => {} };
}
const customLogger = myConsole();`;

      const result = engine.removeLogging(code);

      // Should preserve function definitions and custom objects
      expect(result).toContain("function myConsole");
      expect(result).toContain("const customLogger");
    });
  });

  describe("removeComments", () => {
    it("should remove TODO comments", () => {
      const code = `
// TODO: implement this
function test() {
  // FIXME: bug here
  const x = 1;
  // HACK: temporary solution
  return x;
}`;

      const result = engine.removeComments(code, "typescript");

      expect(result).not.toContain("TODO");
      expect(result).not.toContain("FIXME");
      expect(result).not.toContain("HACK");
      expect(result).toContain("function test");
      expect(result).toContain("const x = 1;");
    });

    it("should remove 'end of' comments", () => {
      const code = `
function test() {
  const x = 1;
  return x;
} // end of function

class MyClass {
  method() {}
} // end of class`;

      const result = engine.removeComments(code, "typescript");

      expect(result).not.toContain("end of function");
      expect(result).not.toContain("end of class");
      expect(result).toContain("function test");
      expect(result).toContain("class MyClass");
    });

    it("should remove separator comments", () => {
      const code = `
// ===================================
function test() {
  const x = 1;
}
// -----------------------------------
function test2() {
  const y = 2;
}`;

      const result = engine.removeComments(code, "typescript");

      expect(result).not.toContain("===");
      expect(result).not.toContain("---");
      expect(result).toContain("function test");
      expect(result).toContain("function test2");
    });

    it("should remove empty comments", () => {
      const code = `
function test() {
  //
  const x = 1;
  //   
  return x;
}`;

      const result = engine.removeComments(code, "typescript");

      expect(result).toContain("function test");
      expect(result).toContain("const x = 1;");
      // Empty comment lines should be removed
      const lines = result.split("\n").filter((line) => line.trim() !== "");
      expect(lines.length).toBeLessThan(code.split("\n").length);
    });

    it("should clean up multiple consecutive blank lines", () => {
      const code = `
function test() {
  // TODO: remove this


  const x = 1;
  return x;
}`;

      const result = engine.removeComments(code, "typescript");

      // Should not have more than 2 consecutive newlines
      expect(result).not.toMatch(/\n\s*\n\s*\n/);
    });
  });

  describe("prioritizeRecent", () => {
    it("should keep all turns when under limit", () => {
      const turns: ConversationTurn[] = [
        { role: "user", content: "Hello", timestamp: 1000 },
        { role: "assistant", content: "Hi", timestamp: 2000 },
        { role: "user", content: "How are you?", timestamp: 3000 },
      ];

      const result = engine.prioritizeRecent(turns, 5);

      expect(result).toHaveLength(3);
      expect(result).toEqual(turns);
    });

    it("should prioritize recent turns when over limit", () => {
      const turns: ConversationTurn[] = [
        { role: "user", content: "Message 1", timestamp: 1000 },
        { role: "assistant", content: "Response 1", timestamp: 2000 },
        { role: "user", content: "Message 2", timestamp: 3000 },
        { role: "assistant", content: "Response 2", timestamp: 4000 },
        { role: "user", content: "Message 3", timestamp: 5000 },
      ];

      const result = engine.prioritizeRecent(turns, 3);

      expect(result).toHaveLength(3);
      // Should keep the 3 most recent turns
      expect(result[0].content).toBe("Message 2");
      expect(result[1].content).toBe("Response 2");
      expect(result[2].content).toBe("Message 3");
    });

    it("should preserve system messages", () => {
      const turns: ConversationTurn[] = [
        { role: "system", content: "System prompt", timestamp: 0 },
        { role: "user", content: "Message 1", timestamp: 1000 },
        { role: "assistant", content: "Response 1", timestamp: 2000 },
        { role: "user", content: "Message 2", timestamp: 3000 },
        { role: "assistant", content: "Response 2", timestamp: 4000 },
      ];

      const result = engine.prioritizeRecent(turns, 3);

      expect(result).toHaveLength(3);
      // System message should be preserved
      expect(result[0].role).toBe("system");
      expect(result[0].content).toBe("System prompt");
      // Plus 2 most recent conversation turns
      expect(result[1].content).toBe("Message 2");
      expect(result[2].content).toBe("Response 2");
    });

    it("should maintain chronological order", () => {
      const turns: ConversationTurn[] = [
        { role: "user", content: "Message 1", timestamp: 1000 },
        { role: "assistant", content: "Response 1", timestamp: 2000 },
        { role: "user", content: "Message 2", timestamp: 3000 },
        { role: "assistant", content: "Response 2", timestamp: 4000 },
      ];

      const result = engine.prioritizeRecent(turns, 2);

      expect(result).toHaveLength(2);
      // Should be in chronological order (oldest to newest)
      expect(result[0].timestamp).toBeLessThan(result[1].timestamp);
      expect(result[0].content).toBe("Message 2");
      expect(result[1].content).toBe("Response 2");
    });
  });

  describe("prune (integration)", () => {
    it("should apply all pruning operations and return metrics", () => {
      const context: Context = {
        userInstructions: ["Do something"],
        conversationHistory: [
          { role: "user", content: "Hello", timestamp: 1000 },
          { role: "assistant", content: "Hi", timestamp: 2000 },
        ],
        files: [
          {
            path: "file1.ts",
            content: `
// TODO: implement
function test() {
  console.log('debug');
  const x = 1;
  return x;
}`,
            isUserProvided: false,
            language: "typescript",
          },
          {
            path: "file2.ts",
            content: `
// TODO: implement
function test() {
  console.log('debug');
  const x = 1;
  return x;
}`, // Duplicate
            isUserProvided: false,
            language: "typescript",
          },
        ],
        skills: [],
        metadata: { totalTokens: 200, timestamp: Date.now() },
      };

      const { context: result, metrics } = engine.prune(context);

      // Should remove duplicate file
      expect(result.files).toHaveLength(1);
      expect(metrics.duplicatesRemoved).toBe(1);

      // Should remove logging and comments from remaining file
      expect(result.files[0].content).not.toContain("console.log");
      expect(result.files[0].content).not.toContain("TODO");
      expect(metrics.loggingStatementsRemoved).toBeGreaterThan(0);
      expect(metrics.commentsRemoved).toBeGreaterThan(0);

      // Should calculate tokens saved
      expect(metrics.tokensSaved).toBeGreaterThan(0);

      // Should update metadata with new token count
      expect(result.metadata.totalTokens).toBeLessThan(
        context.metadata.totalTokens,
      );
    });

    it("should preserve user-provided files", () => {
      const context: Context = {
        userInstructions: ["Do something"],
        conversationHistory: [],
        files: [
          {
            path: "user-file.ts",
            content: `
// TODO: keep this
console.log('keep this too');
const x = 1;`,
            isUserProvided: true,
            language: "typescript",
          },
        ],
        skills: [],
        metadata: { totalTokens: 100, timestamp: Date.now() },
      };

      const { context: result } = engine.prune(context);

      // User-provided file should be unchanged
      expect(result.files[0].content).toContain("TODO");
      expect(result.files[0].content).toContain("console.log");
    });

    it("should prune conversation turns when maxConversationTurns is specified", () => {
      const context: Context = {
        userInstructions: [],
        conversationHistory: [
          { role: "user", content: "Message 1", timestamp: 1000 },
          { role: "assistant", content: "Response 1", timestamp: 2000 },
          { role: "user", content: "Message 2", timestamp: 3000 },
          { role: "assistant", content: "Response 2", timestamp: 4000 },
          { role: "user", content: "Message 3", timestamp: 5000 },
        ],
        files: [],
        skills: [],
        metadata: { totalTokens: 100, timestamp: Date.now() },
      };

      const { context: result, metrics } = engine.prune(context, 3);

      expect(result.conversationHistory).toHaveLength(3);
      expect(metrics.turnsRemoved).toBe(2);
    });
  });
});
