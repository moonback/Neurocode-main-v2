// Property-Based Tests for Message Retention Guarantees
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import {
  selectMessagesToRemove,
  BalancedStrategy,
  pruneContext,
} from "../context_pruner";
import type { Message } from "../message_history_manager";
import type { MessagePriority, TokenBudget } from "../types";

describe("Property 2: Message Retention Guarantees", () => {
  /**
   * **Validates: Requirements 1.3, 2.5**
   *
   * Property: For any message array and pruning operation, the following messages
   * SHALL always be retained: system messages, the most recent user message,
   * the most recent assistant message, compaction summary messages, and any
   * user-pinned messages.
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

  it("system messages are always retained", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 3, maxLength: 50 }),
        (messages) => {
          // Ensure unique message IDs and at least one system message
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Add a system message
          uniqueMessages[0] = { ...uniqueMessages[0], role: "system" };

          // Create priorities
          const priorities: MessagePriority[] = uniqueMessages.map(
            (msg, idx) => ({
              messageId: msg.id,
              score:
                ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
              factors: {
                recency:
                  ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
                userInteraction: 0,
                semanticRelevance: 50,
                referenceCount: msg.referenceCount || 0,
              },
              isPinned: msg.isPinned || false,
              isProtected: msg.role === "system",
            }),
          );

          // Select messages to remove
          const toRemove = selectMessagesToRemove(
            uniqueMessages,
            priorities,
            1000,
          );

          // System message should NOT be in the removal list
          const systemMessageId = uniqueMessages[0].id;
          expect(toRemove).not.toContain(systemMessageId);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("most recent user message is always retained", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 3, maxLength: 50 }),
        (messages) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Ensure we have at least one user message at the end
          uniqueMessages[uniqueMessages.length - 2] = {
            ...uniqueMessages[uniqueMessages.length - 2],
            role: "user",
          };

          // Find the most recent user message
          const mostRecentUserMessage = [...uniqueMessages]
            .reverse()
            .find((m) => m.role === "user");

          if (!mostRecentUserMessage) {
            return true; // Skip if no user message
          }

          // Create priorities
          const priorities: MessagePriority[] = uniqueMessages.map(
            (msg, idx) => ({
              messageId: msg.id,
              score:
                ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
              factors: {
                recency:
                  ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
                userInteraction: 0,
                semanticRelevance: 50,
                referenceCount: msg.referenceCount || 0,
              },
              isPinned: msg.isPinned || false,
              isProtected: msg.id === mostRecentUserMessage.id,
            }),
          );

          // Select messages to remove
          const toRemove = selectMessagesToRemove(
            uniqueMessages,
            priorities,
            1000,
          );

          // Most recent user message should NOT be in the removal list
          expect(toRemove).not.toContain(mostRecentUserMessage.id);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("most recent assistant message is always retained", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 3, maxLength: 50 }),
        (messages) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Ensure we have at least one assistant message at the end
          uniqueMessages[uniqueMessages.length - 1] = {
            ...uniqueMessages[uniqueMessages.length - 1],
            role: "assistant",
          };

          // Find the most recent assistant message
          const mostRecentAssistantMessage = [...uniqueMessages]
            .reverse()
            .find((m) => m.role === "assistant");

          if (!mostRecentAssistantMessage) {
            return true; // Skip if no assistant message
          }

          // Create priorities
          const priorities: MessagePriority[] = uniqueMessages.map(
            (msg, idx) => ({
              messageId: msg.id,
              score:
                ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
              factors: {
                recency:
                  ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
                userInteraction: 0,
                semanticRelevance: 50,
                referenceCount: msg.referenceCount || 0,
              },
              isPinned: msg.isPinned || false,
              isProtected: msg.id === mostRecentAssistantMessage.id,
            }),
          );

          // Select messages to remove
          const toRemove = selectMessagesToRemove(
            uniqueMessages,
            priorities,
            1000,
          );

          // Most recent assistant message should NOT be in the removal list
          expect(toRemove).not.toContain(mostRecentAssistantMessage.id);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("compaction summary messages are always retained", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 3, maxLength: 50 }),
        fc.integer({ min: 0, max: 10 }), // Number of compaction summaries
        (messages, summaryCount) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
            isCompactionSummary: false,
          }));

          // Mark some messages as compaction summaries
          const summaryIndices = new Set<number>();
          for (
            let i = 0;
            i < Math.min(summaryCount, uniqueMessages.length);
            i++
          ) {
            const idx = i % uniqueMessages.length;
            uniqueMessages[idx] = {
              ...uniqueMessages[idx],
              isCompactionSummary: true,
            };
            summaryIndices.add(uniqueMessages[idx].id);
          }

          // Create priorities
          const priorities: MessagePriority[] = uniqueMessages.map(
            (msg, idx) => ({
              messageId: msg.id,
              score:
                ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
              factors: {
                recency:
                  ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
                userInteraction: 0,
                semanticRelevance: 50,
                referenceCount: msg.referenceCount || 0,
              },
              isPinned: msg.isPinned || false,
              isProtected: msg.isCompactionSummary || false,
            }),
          );

          // Select messages to remove
          const toRemove = selectMessagesToRemove(
            uniqueMessages,
            priorities,
            1000,
          );

          // Compaction summary messages should NOT be in the removal list
          for (const summaryId of summaryIndices) {
            expect(toRemove).not.toContain(summaryId);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("pinned messages are always retained", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 3, maxLength: 50 }),
        fc.integer({ min: 0, max: 10 }), // Number of pinned messages
        (messages, pinnedCount) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
            isPinned: false,
          }));

          // Mark some messages as pinned
          const pinnedIndices = new Set<number>();
          for (
            let i = 0;
            i < Math.min(pinnedCount, uniqueMessages.length);
            i++
          ) {
            const idx = i % uniqueMessages.length;
            uniqueMessages[idx] = {
              ...uniqueMessages[idx],
              isPinned: true,
            };
            pinnedIndices.add(uniqueMessages[idx].id);
          }

          // Create priorities
          const priorities: MessagePriority[] = uniqueMessages.map(
            (msg, idx) => ({
              messageId: msg.id,
              score:
                ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
              factors: {
                recency:
                  ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
                userInteraction: 0,
                semanticRelevance: 50,
                referenceCount: msg.referenceCount || 0,
              },
              isPinned: msg.isPinned || false,
              isProtected: false,
            }),
          );

          // Select messages to remove
          const toRemove = selectMessagesToRemove(
            uniqueMessages,
            priorities,
            1000,
          );

          // Pinned messages should NOT be in the removal list
          for (const pinnedId of pinnedIndices) {
            expect(toRemove).not.toContain(pinnedId);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("all protected message types are retained together", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 10, maxLength: 50 }),
        (messages) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Set up protected messages
          uniqueMessages[0] = { ...uniqueMessages[0], role: "system" }; // System message
          uniqueMessages[1] = {
            ...uniqueMessages[1],
            isCompactionSummary: true,
          }; // Compaction summary
          uniqueMessages[2] = { ...uniqueMessages[2], isPinned: true }; // Pinned message
          uniqueMessages[uniqueMessages.length - 2] = {
            ...uniqueMessages[uniqueMessages.length - 2],
            role: "user",
          }; // Recent user
          uniqueMessages[uniqueMessages.length - 1] = {
            ...uniqueMessages[uniqueMessages.length - 1],
            role: "assistant",
          }; // Recent assistant

          const protectedIds = new Set([
            uniqueMessages[0].id, // system
            uniqueMessages[1].id, // compaction summary
            uniqueMessages[2].id, // pinned
            uniqueMessages[uniqueMessages.length - 2].id, // recent user
            uniqueMessages[uniqueMessages.length - 1].id, // recent assistant
          ]);

          // Create priorities
          const priorities: MessagePriority[] = uniqueMessages.map(
            (msg, idx) => ({
              messageId: msg.id,
              score:
                ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
              factors: {
                recency:
                  ((uniqueMessages.length - idx) / uniqueMessages.length) * 100,
                userInteraction: 0,
                semanticRelevance: 50,
                referenceCount: msg.referenceCount || 0,
              },
              isPinned: msg.isPinned || false,
              isProtected: protectedIds.has(msg.id),
            }),
          );

          // Select messages to remove
          const toRemove = selectMessagesToRemove(
            uniqueMessages,
            priorities,
            1000,
          );

          // All protected messages should NOT be in the removal list
          for (const protectedId of protectedIds) {
            expect(toRemove).not.toContain(protectedId);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("pruneContext preserves all protected messages", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 10, maxLength: 50 }),
        (messages) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Set up protected messages
          uniqueMessages[0] = { ...uniqueMessages[0], role: "system" };
          uniqueMessages[1] = {
            ...uniqueMessages[1],
            isCompactionSummary: true,
          };
          uniqueMessages[2] = { ...uniqueMessages[2], isPinned: true };
          uniqueMessages[uniqueMessages.length - 2] = {
            ...uniqueMessages[uniqueMessages.length - 2],
            role: "user",
          };
          uniqueMessages[uniqueMessages.length - 1] = {
            ...uniqueMessages[uniqueMessages.length - 1],
            role: "assistant",
          };

          const protectedIds = new Set([
            uniqueMessages[0].id,
            uniqueMessages[1].id,
            uniqueMessages[2].id,
            uniqueMessages[uniqueMessages.length - 2].id,
            uniqueMessages[uniqueMessages.length - 1].id,
          ]);

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

          // All protected messages should be in the preserved list
          for (const protectedId of protectedIds) {
            expect(result.preservedMessages).toContain(protectedId);
            expect(result.removedMessages).not.toContain(protectedId);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
