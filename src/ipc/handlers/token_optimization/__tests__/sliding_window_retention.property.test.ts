// Property-Based Tests for Sliding Window High-Priority Retention
// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import {
  selectMessagesForSlidingWindow,
  type Message,
} from "../message_history_manager";
import type { MessagePriority } from "../types";

describe("Property 7: Sliding Window High-Priority Retention", () => {
  /**
   * **Validates: Requirements 2.3**
   *
   * Property: For any message array with a sliding window size N, if a message
   * has a priority score in the top N messages, it SHALL be retained even if it
   * falls outside the standard retention window.
   */

  // Arbitrary for generating messages
  const messageArb = fc
    .record({
      id: fc.integer({ min: 1, max: 10000 }),
      role: fc.constantFrom("user", "assistant", "system"),
      content: fc.string({ minLength: 1, maxLength: 100 }),
      isPinned: fc.boolean(),
      isCompactionSummary: fc.boolean(),
      referenceCount: fc.integer({ min: 0, max: 100 }),
    })
    .map((record) => record as Message);

  it("top N messages by priority score are always retained", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 20 }),
        (messages, windowSize) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Generate priorities for all messages
          const priorities: MessagePriority[] = uniqueMessages.map((msg) => ({
            messageId: msg.id,
            score: Math.random() * 100, // Random score for testing
            factors: {
              recency: 50,
              userInteraction: 50,
              semanticRelevance: 50,
              referenceCount: 0,
            },
            isPinned: msg.isPinned || false,
            isProtected: false, // No protected messages for this test
          }));

          // Sort priorities by score to find top N
          const sortedPriorities = [...priorities].sort(
            (a, b) => b.score - a.score,
          );
          const topNMessageIds = sortedPriorities
            .slice(0, Math.min(windowSize, priorities.length))
            .map((p) => p.messageId);

          // Select messages using sliding window
          const retainedMessageIds = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            windowSize,
          );

          // Verify that all top N messages are retained
          for (const messageId of topNMessageIds) {
            expect(retainedMessageIds).toContain(messageId);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("protected messages are always retained regardless of priority score", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 2, maxLength: 50 }),
        fc.integer({ min: 1, max: 20 }),
        fc.array(fc.integer({ min: 0, max: 49 }), {
          minLength: 1,
          maxLength: 5,
        }),
        (messages, windowSize, protectedIndices) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Mark some messages as protected
          const protectedMessageIds = new Set(
            protectedIndices
              .filter((idx) => idx < uniqueMessages.length)
              .map((idx) => uniqueMessages[idx].id),
          );

          // Generate priorities for all messages
          const priorities: MessagePriority[] = uniqueMessages.map((msg) => ({
            messageId: msg.id,
            score: Math.random() * 100,
            factors: {
              recency: 50,
              userInteraction: 50,
              semanticRelevance: 50,
              referenceCount: 0,
            },
            isPinned: msg.isPinned || false,
            isProtected: protectedMessageIds.has(msg.id),
          }));

          // Select messages using sliding window
          const retainedMessageIds = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            windowSize,
          );

          // Verify that all protected messages are retained
          for (const messageId of protectedMessageIds) {
            expect(retainedMessageIds).toContain(messageId);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("retained messages count equals protected count plus min(windowSize, non-protected count)", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 20 }),
        fc.array(fc.integer({ min: 0, max: 49 }), {
          minLength: 0,
          maxLength: 5,
        }),
        (messages, windowSize, protectedIndices) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Mark some messages as protected
          const protectedMessageIds = new Set(
            protectedIndices
              .filter((idx) => idx < uniqueMessages.length)
              .map((idx) => uniqueMessages[idx].id),
          );

          // Generate priorities for all messages
          const priorities: MessagePriority[] = uniqueMessages.map((msg) => ({
            messageId: msg.id,
            score: Math.random() * 100,
            factors: {
              recency: 50,
              userInteraction: 50,
              semanticRelevance: 50,
              referenceCount: 0,
            },
            isPinned: msg.isPinned || false,
            isProtected: protectedMessageIds.has(msg.id),
          }));

          // Count protected and non-protected messages
          const protectedCount = protectedMessageIds.size;
          const nonProtectedCount = uniqueMessages.length - protectedCount;

          // Select messages using sliding window
          const retainedMessageIds = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            windowSize,
          );

          // Expected count: protected + min(windowSize, non-protected)
          const expectedCount =
            protectedCount + Math.min(windowSize, nonProtectedCount);

          // Verify retained count matches expected
          expect(retainedMessageIds.length).toBe(expectedCount);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("messages with higher priority scores are preferred over lower scores", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 3, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (messages, windowSize) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Generate priorities with distinct scores for easier testing
          const priorities: MessagePriority[] = uniqueMessages.map(
            (msg, idx) => ({
              messageId: msg.id,
              score: idx * 10, // Distinct scores: 0, 10, 20, 30, ...
              factors: {
                recency: 50,
                userInteraction: 50,
                semanticRelevance: 50,
                referenceCount: 0,
              },
              isPinned: false,
              isProtected: false,
            }),
          );

          // Select messages using sliding window
          const retainedMessageIds = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            windowSize,
          );

          // Get the retained priorities
          const retainedPriorities = priorities.filter((p) =>
            retainedMessageIds.includes(p.messageId),
          );

          // Get the non-retained priorities
          const nonRetainedPriorities = priorities.filter(
            (p) => !retainedMessageIds.includes(p.messageId),
          );

          // If there are both retained and non-retained messages,
          // verify that the minimum retained score >= maximum non-retained score
          if (
            retainedPriorities.length > 0 &&
            nonRetainedPriorities.length > 0
          ) {
            const minRetainedScore = Math.min(
              ...retainedPriorities.map((p) => p.score),
            );
            const maxNonRetainedScore = Math.max(
              ...nonRetainedPriorities.map((p) => p.score),
            );

            expect(minRetainedScore).toBeGreaterThanOrEqual(
              maxNonRetainedScore,
            );
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("sliding window size of 0 retains only protected messages", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 1, maxLength: 50 }),
        fc.array(fc.integer({ min: 0, max: 49 }), {
          minLength: 0,
          maxLength: 5,
        }),
        (messages, protectedIndices) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Mark some messages as protected
          const protectedMessageIds = new Set(
            protectedIndices
              .filter((idx) => idx < uniqueMessages.length)
              .map((idx) => uniqueMessages[idx].id),
          );

          // Generate priorities for all messages
          const priorities: MessagePriority[] = uniqueMessages.map((msg) => ({
            messageId: msg.id,
            score: Math.random() * 100,
            factors: {
              recency: 50,
              userInteraction: 50,
              semanticRelevance: 50,
              referenceCount: 0,
            },
            isPinned: msg.isPinned || false,
            isProtected: protectedMessageIds.has(msg.id),
          }));

          // Select messages with window size 0
          const retainedMessageIds = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            0,
          );

          // Verify only protected messages are retained
          expect(retainedMessageIds.length).toBe(protectedMessageIds.size);
          for (const messageId of protectedMessageIds) {
            expect(retainedMessageIds).toContain(messageId);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("sliding window size larger than message count retains all messages", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 1, maxLength: 20 }),
        (messages) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Generate priorities for all messages (none protected)
          const priorities: MessagePriority[] = uniqueMessages.map((msg) => ({
            messageId: msg.id,
            score: Math.random() * 100,
            factors: {
              recency: 50,
              userInteraction: 50,
              semanticRelevance: 50,
              referenceCount: 0,
            },
            isPinned: false,
            isProtected: false,
          }));

          // Use window size larger than message count
          const windowSize = uniqueMessages.length + 10;

          // Select messages using sliding window
          const retainedMessageIds = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            windowSize,
          );

          // Verify all messages are retained
          expect(retainedMessageIds.length).toBe(uniqueMessages.length);
          for (const msg of uniqueMessages) {
            expect(retainedMessageIds).toContain(msg.id);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("messages without priorities are not retained", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 2, maxLength: 50 }),
        fc.integer({ min: 1, max: 20 }),
        fc.array(fc.integer({ min: 0, max: 49 }), {
          minLength: 1,
          maxLength: 5,
        }),
        (messages, windowSize, missingPriorityIndices) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Create priorities for only some messages
          const messagesWithPriorities = new Set(
            uniqueMessages
              .filter((_, idx) => !missingPriorityIndices.includes(idx))
              .map((m) => m.id),
          );

          const priorities: MessagePriority[] = uniqueMessages
            .filter((msg) => messagesWithPriorities.has(msg.id))
            .map((msg) => ({
              messageId: msg.id,
              score: Math.random() * 100,
              factors: {
                recency: 50,
                userInteraction: 50,
                semanticRelevance: 50,
                referenceCount: 0,
              },
              isPinned: false,
              isProtected: false,
            }));

          // Select messages using sliding window
          const retainedMessageIds = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            windowSize,
          );

          // Verify that only messages with priorities are retained
          for (const messageId of retainedMessageIds) {
            expect(messagesWithPriorities.has(messageId)).toBe(true);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("function is deterministic for same inputs", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (messages, windowSize) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Generate priorities with fixed scores for determinism
          const priorities: MessagePriority[] = uniqueMessages.map(
            (msg, idx) => ({
              messageId: msg.id,
              score: idx * 5, // Fixed scores
              factors: {
                recency: 50,
                userInteraction: 50,
                semanticRelevance: 50,
                referenceCount: 0,
              },
              isPinned: false,
              isProtected: false,
            }),
          );

          // Call function multiple times with same inputs
          const result1 = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            windowSize,
          );
          const result2 = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            windowSize,
          );
          const result3 = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            windowSize,
          );

          // Sort results for comparison (order doesn't matter)
          const sorted1 = [...result1].sort((a, b) => a - b);
          const sorted2 = [...result2].sort((a, b) => a - b);
          const sorted3 = [...result3].sort((a, b) => a - b);

          // All results should be identical
          expect(sorted1).toEqual(sorted2);
          expect(sorted2).toEqual(sorted3);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("retained messages are independent of message position in array", () => {
    fc.assert(
      fc.property(
        fc.array(messageArb, { minLength: 3, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (messages, windowSize) => {
          // Ensure unique message IDs
          const uniqueMessages = messages.map((msg, idx) => ({
            ...msg,
            id: idx + 1,
          }));

          // Generate priorities with fixed scores
          const priorities: MessagePriority[] = uniqueMessages.map(
            (msg, idx) => ({
              messageId: msg.id,
              score: idx * 5,
              factors: {
                recency: 50,
                userInteraction: 50,
                semanticRelevance: 50,
                referenceCount: 0,
              },
              isPinned: false,
              isProtected: false,
            }),
          );

          // Select messages with original order
          const retained1 = selectMessagesForSlidingWindow(
            uniqueMessages,
            priorities,
            windowSize,
          );

          // Reverse the message array order
          const reversedMessages = [...uniqueMessages].reverse();

          // Select messages with reversed order
          const retained2 = selectMessagesForSlidingWindow(
            reversedMessages,
            priorities,
            windowSize,
          );

          // Sort results for comparison
          const sorted1 = [...retained1].sort((a, b) => a - b);
          const sorted2 = [...retained2].sort((a, b) => a - b);

          // Results should be identical regardless of message order
          expect(sorted1).toEqual(sorted2);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
