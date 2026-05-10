/**
 * Tests for CompressionEngine
 *
 * These tests verify:
 * - Signature extraction from large files (>500 lines)
 * - Documentation summarization
 * - Pattern deduplication
 * - Compression metrics calculation
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CompressionEngine } from "../CompressionEngine";
import type { Context, FileContext } from "../ContextOptimizer";

describe("CompressionEngine", () => {
  let engine: CompressionEngine;

  beforeEach(() => {
    engine = new CompressionEngine();
  });

  describe("extractSignatures", () => {
    it("should not extract signatures from small files (<= 500 lines)", () => {
      const smallFile: FileContext = {
        path: "small.ts",
        content: "function test() {\n  return 42;\n}",
        language: "typescript",
      };

      const result = engine.extractSignatures(smallFile);

      expect(result.content).toBe(smallFile.content);
    });

    it("should extract function signatures from large TypeScript files", () => {
      // Create a file with >500 lines
      const lines = [];
      lines.push("export function add(a: number, b: number): number {");
      for (let i = 0; i < 500; i++) {
        lines.push("  // filler line " + i);
      }
      lines.push("  return a + b;");
      lines.push("}");

      const largeFile: FileContext = {
        path: "large.ts",
        content: lines.join("\n"),
        language: "typescript",
      };

      const result = engine.extractSignatures(largeFile);

      // Should extract only the signature
      expect(result.content).toContain("function add");
      expect(result.content).toContain("(a: number, b: number): number");
      expect(result.content).not.toContain("filler line");
      expect(result.content).not.toContain("return a + b");
    });

    it("should extract class signatures with method signatures", () => {
      const lines = [];
      lines.push("export class Calculator {");
      lines.push("  private value: number;");
      lines.push("");
      lines.push("  constructor(initial: number) {");
      for (let i = 0; i < 500; i++) {
        lines.push("    // filler line " + i);
      }
      lines.push("    this.value = initial;");
      lines.push("  }");
      lines.push("");
      lines.push("  add(n: number): number {");
      lines.push("    return this.value + n;");
      lines.push("  }");
      lines.push("}");

      const largeFile: FileContext = {
        path: "calculator.ts",
        content: lines.join("\n"),
        language: "typescript",
      };

      const result = engine.extractSignatures(largeFile);

      // Should extract class signature with method signatures
      expect(result.content).toContain("class Calculator");
      expect(result.content).toContain("constructor(initial: number)");
      expect(result.content).toContain("add(n: number): number");
      expect(result.content).not.toContain("filler line");
      expect(result.content).not.toContain("this.value = initial");
    });

    it("should preserve interfaces and type declarations", () => {
      const lines = [];
      lines.push("export interface User {");
      lines.push("  id: string;");
      lines.push("  name: string;");
      lines.push("}");
      lines.push("");
      lines.push("export type UserId = string;");
      lines.push("");
      lines.push("export function getUser(id: UserId): User {");
      for (let i = 0; i < 500; i++) {
        lines.push("  // filler line " + i);
      }
      lines.push("  return { id, name: 'test' };");
      lines.push("}");

      const largeFile: FileContext = {
        path: "user.ts",
        content: lines.join("\n"),
        language: "typescript",
      };

      const result = engine.extractSignatures(largeFile);

      // Should preserve interfaces and types
      expect(result.content).toContain("interface User");
      expect(result.content).toContain("id: string");
      expect(result.content).toContain("type UserId = string");
      expect(result.content).toContain("function getUser");
      expect(result.content).not.toContain("filler line");
    });

    it("should not process non-TypeScript/JavaScript files", () => {
      const lines = [];
      for (let i = 0; i < 600; i++) {
        lines.push("line " + i);
      }

      const pythonFile: FileContext = {
        path: "script.py",
        content: lines.join("\n"),
        language: "python",
      };

      const result = engine.extractSignatures(pythonFile);

      // Should return original content for non-TS/JS files
      expect(result.content).toBe(pythonFile.content);
    });

    it("should handle parsing errors gracefully", () => {
      const lines = [];
      lines.push("export function broken(");
      for (let i = 0; i < 500; i++) {
        lines.push("  // filler line " + i);
      }
      lines.push("  // missing closing brace and implementation");

      const brokenFile: FileContext = {
        path: "broken.ts",
        content: lines.join("\n"),
        language: "typescript",
      };

      const result = engine.extractSignatures(brokenFile);

      // TypeScript parser is forgiving and can extract partial signatures
      // The result should be shorter than the original (signature extracted)
      // or equal (if extraction failed completely)
      expect(result.content.length).toBeLessThanOrEqual(
        brokenFile.content.length,
      );
    });
  });

  describe("summarizeDocumentation", () => {
    it("should keep first paragraph of non-JSDoc documentation", () => {
      const doc = `This is the summary paragraph.
It has multiple lines.

This is a detailed explanation that goes on and on.
With more details here.

And even more paragraphs.`;

      const result = engine.summarizeDocumentation(doc);

      expect(result).toContain("This is the summary paragraph");
      expect(result).toContain("It has multiple lines");
      expect(result).not.toContain("detailed explanation");
      expect(result).not.toContain("even more paragraphs");
    });

    it("should keep summary and important tags from JSDoc", () => {
      const doc = `/**
 * This is the summary of the function.
 * It does something important.
 *
 * This is a longer explanation that provides
 * more context about the implementation.
 *
 * @param name - The name parameter
 * @param age - The age parameter
 * @returns The result value
 * @throws Error when something goes wrong
 * @example
 * const result = myFunction('test', 25);
 * console.log(result);
 * @see https://example.com/docs
 */`;

      const result = engine.summarizeDocumentation(doc);

      // Should keep summary
      expect(result).toContain("This is the summary of the function");
      expect(result).toContain("It does something important");

      // Should keep important tags
      expect(result).toContain("@param name");
      expect(result).toContain("@param age");
      expect(result).toContain("@returns The result value");
      expect(result).toContain("@throws Error");

      // Should remove examples and see tags
      expect(result).not.toContain("@example");
      expect(result).not.toContain("const result = myFunction");
      expect(result).not.toContain("@see");

      // Should remove long explanation
      expect(result).not.toContain("longer explanation");
    });

    it("should handle JSDoc with only summary", () => {
      const doc = `/**
 * Simple function summary.
 */`;

      const result = engine.summarizeDocumentation(doc);

      expect(result).toContain("Simple function summary");
      expect(result).toContain("/**");
      expect(result).toContain("*/");
    });

    it("should preserve @deprecated tags", () => {
      const doc = `/**
 * This function is old.
 *
 * @deprecated Use newFunction instead
 * @param x - The parameter
 * @example
 * oldFunction(5);
 */`;

      const result = engine.summarizeDocumentation(doc);

      expect(result).toContain("@deprecated Use newFunction instead");
      expect(result).toContain("@param x");
      expect(result).not.toContain("@example");
    });
  });

  describe("deduplicatePatterns", () => {
    it("should not deduplicate when there are fewer than 2 files", () => {
      const context: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "file1.ts",
            content: "function test() { return 42; }",
          },
        ],
        skills: [],
        metadata: { totalTokens: 100, timestamp: Date.now() },
      };

      const result = engine.deduplicatePatterns(context);

      expect(result.files[0].content).toBe(context.files[0].content);
    });

    it("should replace repeated patterns with references", () => {
      const repeatedPattern = `function calculateTotal(items: Item[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}`;

      const context: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "file1.ts",
            content: repeatedPattern,
          },
          {
            path: "file2.ts",
            content: repeatedPattern,
          },
          {
            path: "file3.ts",
            content: repeatedPattern,
          },
        ],
        skills: [],
        metadata: { totalTokens: 300, timestamp: Date.now() },
      };

      const result = engine.deduplicatePatterns(context);

      // First file should keep the pattern
      expect(result.files[0].content).toBe(repeatedPattern);

      // Subsequent files should have references
      expect(result.files[1].content).toContain("[Pattern #");
      expect(result.files[1].content).toContain("file1.ts");
      expect(result.files[2].content).toContain("[Pattern #");
      expect(result.files[2].content).toContain("file1.ts");
    });

    it("should not replace patterns that are too short", () => {
      const shortPattern = "const x = 1;";

      const context: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "file1.ts",
            content: shortPattern,
          },
          {
            path: "file2.ts",
            content: shortPattern,
          },
        ],
        skills: [],
        metadata: { totalTokens: 50, timestamp: Date.now() },
      };

      const result = engine.deduplicatePatterns(context);

      // Should not deduplicate short patterns
      expect(result.files[0].content).toBe(shortPattern);
      expect(result.files[1].content).toBe(shortPattern);
      expect(result.files[1].content).not.toContain("[Pattern #");
    });

    it("should handle files with no repeated patterns", () => {
      const context: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "file1.ts",
            content: "function unique1() { return 1; }",
          },
          {
            path: "file2.ts",
            content: "function unique2() { return 2; }",
          },
        ],
        skills: [],
        metadata: { totalTokens: 100, timestamp: Date.now() },
      };

      const result = engine.deduplicatePatterns(context);

      // Should return unchanged
      expect(result.files[0].content).toBe(context.files[0].content);
      expect(result.files[1].content).toBe(context.files[1].content);
    });
  });

  describe("measureCompression", () => {
    it("should calculate compression metrics correctly", () => {
      const original: Context = {
        userInstructions: ["Do something"],
        conversationHistory: [
          {
            role: "user",
            content: "Hello",
            timestamp: Date.now(),
            tokenCount: 10,
          },
        ],
        files: [
          {
            path: "file1.ts",
            content: "a".repeat(1000), // 1000 chars = ~250 tokens
            tokenCount: 250,
          },
        ],
        skills: [],
        metadata: { totalTokens: 263, timestamp: Date.now() },
      };

      const compressed: Context = {
        userInstructions: ["Do something"],
        conversationHistory: [
          {
            role: "user",
            content: "Hello",
            timestamp: Date.now(),
            tokenCount: 10,
          },
        ],
        files: [
          {
            path: "file1.ts",
            content: "a".repeat(400), // 400 chars = ~100 tokens
            tokenCount: 100,
          },
        ],
        skills: [],
        metadata: { totalTokens: 113, timestamp: Date.now() },
      };

      const metrics = engine.measureCompression(original, compressed);

      expect(metrics.originalTokens).toBeGreaterThan(0);
      expect(metrics.compressedTokens).toBeGreaterThan(0);
      expect(metrics.compressedTokens).toBeLessThan(metrics.originalTokens);
      expect(metrics.tokensSaved).toBeGreaterThan(0);
      expect(metrics.compressionRatio).toBeLessThan(1.0);
      expect(metrics.compressionRatio).toBeGreaterThan(0);
      expect(Array.isArray(metrics.techniquesApplied)).toBe(true);
    });

    it("should detect signature extraction technique", () => {
      const lines = [];
      for (let i = 0; i < 600; i++) {
        lines.push("line " + i);
      }

      const original: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "large.ts",
            content: lines.join("\n"),
            language: "typescript",
          },
        ],
        skills: [],
        metadata: { totalTokens: 1000, timestamp: Date.now() },
      };

      const compressed: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "large.ts",
            content: "function test(): void;",
            language: "typescript",
          },
        ],
        skills: [],
        metadata: { totalTokens: 100, timestamp: Date.now() },
      };

      const metrics = engine.measureCompression(original, compressed);

      expect(metrics.techniquesApplied).toContain("signature-extraction");
    });

    it("should detect pattern deduplication technique", () => {
      const original: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "file1.ts",
            content: "function test() { return 42; }",
          },
        ],
        skills: [],
        metadata: { totalTokens: 100, timestamp: Date.now() },
      };

      const compressed: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "file1.ts",
            content: "/* [Pattern #1] - See file0.ts for implementation */",
          },
        ],
        skills: [],
        metadata: { totalTokens: 50, timestamp: Date.now() },
      };

      const metrics = engine.measureCompression(original, compressed);

      expect(metrics.techniquesApplied).toContain("pattern-deduplication");
    });

    it("should handle no compression case", () => {
      const context: Context = {
        userInstructions: [],
        conversationHistory: [],
        files: [
          {
            path: "file1.ts",
            content: "const x = 1;",
          },
        ],
        skills: [],
        metadata: { totalTokens: 10, timestamp: Date.now() },
      };

      const metrics = engine.measureCompression(context, context);

      expect(metrics.originalTokens).toBe(metrics.compressedTokens);
      expect(metrics.tokensSaved).toBe(0);
      expect(metrics.compressionRatio).toBe(1.0);
    });
  });

  describe("integration with ContextOptimizer", () => {
    it("should compress large files during optimization", () => {
      const lines = [];
      lines.push("export function largeFunction(x: number): number {");
      for (let i = 0; i < 600; i++) {
        lines.push("  // implementation line " + i);
      }
      lines.push("  return x * 2;");
      lines.push("}");

      const file: FileContext = {
        path: "large.ts",
        content: lines.join("\n"),
        language: "typescript",
      };

      const result = engine.extractSignatures(file);

      expect(result.content.length).toBeLessThan(file.content.length);
      expect(result.content).toContain("function largeFunction");
      expect(result.content).not.toContain("implementation line");
    });
  });
});
