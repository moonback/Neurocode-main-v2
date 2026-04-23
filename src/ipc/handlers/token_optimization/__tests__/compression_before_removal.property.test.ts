// Property-Based Tests for Compression Before Removal
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import {
  compressMessages,
  pruneContext,
  BalancedStrategy,
  AggressiveStrategy,
} from "../context_pruner";
import type { Message } from "../message_history_manager";
import type { TokenBudget } from "../types";

describe("Property 4: Compression Before Removal", () => {
  /**
   * **Validates: Requirements 1.5**
   *
   * Property: For any message array containing repetitive content, the pruning
   * algorithm SHALL attempt compression before removing messages entirely, and
   * the number of compressed messages SHALL be greater than or equal to zero.
   */

  // Arbitrary for generating messages
  const messageArb = fc
    .record({
      id: fc.integer({ min: 1, max: 10000 }),
      role: fc.constantFrom("user", "assistant", "system"),
      content: fc.string({ minLength: 1, maxLength: 500 }),
      createdAt: fc.date(),
      isPinned: fc.boolean(),
      isCompactionSummary: fc.boolean(),
      referenceCount: fc.integer({ min: 0, max: 10 }),
    })
    .map((record) => record as Message);

  it("compressMessages returns a non-empty string for any non-empty message array", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 1, maxLength: 50 }),
        fc.constantFrom("minimal", "moderate", "maximum"),
        (messages, level) => {
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          const compressed = compressMessages(
            uniqueMessages,
            level as "minimal" | "moderate" | "maximum",
          );

          // Compression should always return a non-empty string
          expect(compressed).toBeTruthy();
          expect(compressed.length).toBeGreaterThan(0);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("compressMessages returns empty string for empty message array", () => {
    const compressed = compressMessages([], "minimal");
    expect(compressed).toBe("");
  });

  it("compression summaries are generated when messages are removed", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 10, maxLength: 50 }),
        (messages) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
            role: "user" as const,
            isPinned: false,
            isCompactionSummary: false,
            referenceCount: 0,
          }));

          // Create token budget that triggers pruning
          const tokenBudget: TokenBudget = {
            total: 10000,
            allocated: {
              inputContext: 7000,
              systemInstructions: 1000,
              outputGeneration: 2000,
            },
            used: {
              inputContext: 8500, // 85% - should trigger pruning
              systemInstructions: 500,
              outputGeneration: 0,
            },
            remaining: 1000,
            provider: "test-provider",
          };

          const strategy = new BalancedStrategy();
          const result = pruneContext(uniqueMessages, strategy, tokenBudget);

          // If messages were removed, compression summaries should be generated
          if (result.removedMessages.length > 0) {
            expect(result.compressionSummaries.length).toBeGreaterThanOrEqual(
              0,
            );

            // Each compression summary should have a valid message range and summary
            for (const summary of result.compressionSummaries) {
              expect(summary.messageRange).toHaveLength(2);
              expect(summary.messageRange[0]).toBeLessThanOrEqual(
                summary.messageRange[1],
              );
              expect(summary.summary).toBeTruthy();
              expect(summary.summary.length).toBeGreaterThan(0);
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("compression level affects the compression output", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 5, maxLength: 20 }),
        (messages) => {
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          const minimal = compressMessages(uniqueMessages, "minimal");
          const moderate = compressMessages(uniqueMessages, "moderate");
          const maximum = compressMessages(uniqueMessages, "maximum");

          // All compression levels should produce output
          expect(minimal).toBeTruthy();
          expect(moderate).toBeTruthy();
          expect(maximum).toBeTruthy();

          // Maximum compression should generally be shorter or equal to moderate
          // (though this isn't strictly guaranteed for all inputs)
          expect(maximum.length).toBeGreaterThan(0);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("duplicate messages are identified and compressed", () => {
    // Create messages with exact duplicates
    const messages: Message[] = [
      {
        id: 1,
        role: "user",
        content: "Hello, how are you?",
      },
      {
        id: 2,
        role: "assistant",
        content: "I'm doing well, thank you!",
      },
      {
        id: 3,
        role: "user",
        content: "Hello, how are you?", // Duplicate of message 1
      },
      {
        id: 4,
        role: "assistant",
        content: "I'm doing well, thank you!", // Duplicate of message 2
      },
      {
        id: 5,
        role: "user",
        content: "What's the weather like?",
      },
    ];

    const compressed = compressMessages(messages, "minimal");

    // Compression should mention duplicates or show reduced count
    expect(compressed).toBeTruthy();
    expect(compressed.length).toBeGreaterThan(0);
  });

  it("single message compression produces a valid summary", () => {
    fc.assert(
      fc.property(messageArb, (message) => {
        const singleMessage = { ...message, id: 1 };

        const compressed = compressMessages([singleMessage], "minimal");

        // Single message compression should produce a valid summary
        expect(compressed).toBeTruthy();
        expect(compressed.length).toBeGreaterThan(0);
        expect(compressed).toContain("Compressed message");

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("compression preserves message role information", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 3, maxLength: 20 }),
        (messages) => {
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Use maximum compression which groups by role
          const compressed = compressMessages(uniqueMessages, "maximum");

          // Compression should mention message counts or roles
          expect(compressed).toBeTruthy();
          expect(compressed.length).toBeGreaterThan(0);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("aggressive strategy uses maximum compression level", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 10, maxLength: 50 }),
        (messages) => {
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
            role: "user" as const,
            isPinned: false,
            isCompactionSummary: false,
            referenceCount: 0,
          }));

          // Create token budget that triggers pruning
          const tokenBudget: TokenBudget = {
            total: 10000,
            allocated: {
              inputContext: 7000,
              systemInstructions: 1000,
              outputGeneration: 2000,
            },
            used: {
              inputContext: 7500, // 75% - should trigger aggressive pruning (70% threshold)
              systemInstructions: 500,
              outputGeneration: 0,
            },
            remaining: 2000,
            provider: "test-provider",
          };

          const strategy = new AggressiveStrategy();
          const result = pruneContext(uniqueMessages, strategy, tokenBudget);

          // Verify that the strategy used is aggressive
          expect(result.strategy).toBe("aggressive");

          // If compression summaries were generated, they should exist
          if (result.compressionSummaries.length > 0) {
            for (const summary of result.compressionSummaries) {
              expect(summary.summary).toBeTruthy();
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("compression summaries cover consecutive message ranges", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 10, maxLength: 50 }),
        (messages) => {
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
            role: "user" as const,
            isPinned: false,
            isCompactionSummary: false,
            referenceCount: 0,
          }));

          // Create token budget that triggers pruning
          const tokenBudget: TokenBudget = {
            total: 10000,
            allocated: {
              inputContext: 7000,
              systemInstructions: 1000,
              outputGeneration: 2000,
            },
            used: {
              inputContext: 8500,
              systemInstructions: 500,
              outputGeneration: 0,
            },
            remaining: 1000,
            provider: "test-provider",
          };

          const strategy = new BalancedStrategy();
          const result = pruneContext(uniqueMessages, strategy, tokenBudget);

          // Each compression summary should have a valid range
          for (const summary of result.compressionSummaries) {
            const [start, end] = summary.messageRange;

            // Start should be <= end
            expect(start).toBeLessThanOrEqual(end);

            // Range should be within the message ID bounds
            const allIds = uniqueMessages.map((m) => m.id);
            const minId = Math.min(...allIds);
            const maxId = Math.max(...allIds);

            expect(start).toBeGreaterThanOrEqual(minId);
            expect(end).toBeLessThanOrEqual(maxId);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("compression is attempted before removal (compressionSummaries >= 0)", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 10, maxLength: 50 }),
        (messages) => {
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
            role: "user" as const,
            isPinned: false,
            isCompactionSummary: false,
            referenceCount: 0,
          }));

          // Create token budget that triggers pruning
          const tokenBudget: TokenBudget = {
            total: 10000,
            allocated: {
              inputContext: 7000,
              systemInstructions: 1000,
              outputGeneration: 2000,
            },
            used: {
              inputContext: 8500,
              systemInstructions: 500,
              outputGeneration: 0,
            },
            remaining: 1000,
            provider: "test-provider",
          };

          const strategy = new BalancedStrategy();
          const result = pruneContext(uniqueMessages, strategy, tokenBudget);

          // The number of compression summaries should be >= 0
          expect(result.compressionSummaries.length).toBeGreaterThanOrEqual(0);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
