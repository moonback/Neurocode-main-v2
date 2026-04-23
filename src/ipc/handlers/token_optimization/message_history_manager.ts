// Message History Manager Subsystem
// Feature: token-optimization
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5

import { db } from "@/db";
import { messages, messagePriorities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type { MessagePriority } from "./types";

/**
 * Message interface for priority calculation
 * Extends the base Message type with optimization metadata
 */
export interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date | string;
  isPinned?: boolean;
  isCompactionSummary?: boolean;
  referenceCount?: number;
  lastPriorityScore?: number;
}

/**
 * User Interaction interface
 * Tracks user actions on messages (edits, approvals, etc.)
 */
export interface UserInteraction {
  messageId: number;
  type: "edit" | "approval" | "reference";
  timestamp: Date;
}

/**
 * Calculate Message Priority
 * Validates: Requirements 2.1, 2.2
 *
 * Calculates a priority score for a message using a weighted combination
 * of four factors:
 * - Recency (40% weight): More recent messages get higher scores
 * - User Interaction (30% weight): Messages with edits/approvals get higher scores
 * - Semantic Relevance (20% weight): Messages similar to recent context get higher scores
 * - Reference Count (10% weight): Messages referenced by later messages get higher scores
 *
 * @param message - The message to calculate priority for
 * @param allMessages - All messages in the conversation
 * @param userInteractions - User interactions with messages
 * @returns MessagePriority object with score and factor breakdown
 */
export function calculateMessagePriority(
  message: Message,
  allMessages: Message[],
  userInteractions: UserInteraction[],
): MessagePriority {
  // Factor 1: Recency (40% weight)
  const recencyScore = calculateRecencyScore(message, allMessages);

  // Factor 2: User Interaction (30% weight)
  const interactionScore = calculateInteractionScore(message, userInteractions);

  // Factor 3: Semantic Relevance (20% weight)
  const relevanceScore = calculateSemanticRelevance(message, allMessages);

  // Factor 4: Reference Count (10% weight)
  const referenceScore = calculateReferenceScore(message, allMessages);

  // Calculate weighted total score
  const totalScore =
    recencyScore * 0.4 +
    interactionScore * 0.3 +
    relevanceScore * 0.2 +
    referenceScore * 0.1;

  // Ensure score is in valid range [0, 100]
  const clampedScore = Math.max(0, Math.min(100, totalScore));

  return {
    messageId: message.id,
    score: clampedScore,
    factors: {
      recency: recencyScore,
      userInteraction: interactionScore,
      semanticRelevance: relevanceScore,
      referenceCount: message.referenceCount || 0,
    },
    isPinned: message.isPinned || false,
    isProtected: isProtectedMessage(message, allMessages),
  };
}

/**
 * Calculate Recency Score
 * Validates: Requirements 2.1
 *
 * Calculates a score based on how recent a message is.
 * More recent messages get higher scores using exponential decay.
 *
 * @param message - The message to score
 * @param allMessages - All messages in the conversation
 * @returns Recency score (0-100)
 */
export function calculateRecencyScore(
  message: Message,
  allMessages: Message[],
): number {
  if (allMessages.length === 0) {
    return 100;
  }

  // Find the index of this message in the conversation
  const messageIndex = allMessages.findIndex((m) => m.id === message.id);
  if (messageIndex === -1) {
    return 0;
  }

  // Calculate position from the end (0 = most recent)
  const positionFromEnd = allMessages.length - 1 - messageIndex;

  // Use exponential decay: score = 100 * e^(-k * position)
  // k = 0.05 gives a good decay curve (50% at ~14 messages back)
  const decayFactor = 0.05;
  const score = 100 * Math.exp(-decayFactor * positionFromEnd);

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate Interaction Score
 * Validates: Requirements 2.2
 *
 * Calculates a score based on user interactions with the message.
 * Messages that were edited, approved, or explicitly referenced get higher scores.
 *
 * @param message - The message to score
 * @param userInteractions - User interactions with messages
 * @returns Interaction score (0-100)
 */
export function calculateInteractionScore(
  message: Message,
  userInteractions: UserInteraction[],
): number {
  // Filter interactions for this message
  const messageInteractions = userInteractions.filter(
    (interaction) => interaction.messageId === message.id,
  );

  if (messageInteractions.length === 0) {
    return 0;
  }

  // Score weights for different interaction types
  const interactionWeights = {
    edit: 40, // Edits indicate important content
    approval: 30, // Approvals indicate quality
    reference: 30, // References indicate relevance
  };

  // Calculate total score from all interactions
  let totalScore = 0;
  for (const interaction of messageInteractions) {
    totalScore += interactionWeights[interaction.type] || 0;
  }

  // Cap at 100
  return Math.min(100, totalScore);
}

/**
 * Calculate Semantic Relevance
 * Validates: Requirements 2.2
 *
 * Calculates a score based on semantic similarity to recent context.
 * For now, uses a simple heuristic based on keyword overlap with recent messages.
 * In the future, this could be enhanced with embeddings-based similarity.
 *
 * @param message - The message to score
 * @param allMessages - All messages in the conversation
 * @returns Semantic relevance score (0-100)
 */
export function calculateSemanticRelevance(
  message: Message,
  allMessages: Message[],
): number {
  if (allMessages.length === 0) {
    return 50; // Neutral score for empty context
  }

  // Get the last 5 messages as "recent context"
  const recentMessages = allMessages.slice(-5);

  // If this message is in the recent context, it's highly relevant
  if (recentMessages.some((m) => m.id === message.id)) {
    return 100;
  }

  // Simple keyword-based similarity
  // Extract words from message content (lowercase, remove punctuation)
  const extractKeywords = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 3), // Only words longer than 3 chars
    );
  };

  const messageKeywords = extractKeywords(message.content);
  const recentKeywords = new Set<string>();

  for (const recentMsg of recentMessages) {
    const keywords = extractKeywords(recentMsg.content);
    keywords.forEach((kw) => recentKeywords.add(kw));
  }

  // Calculate Jaccard similarity (intersection / union)
  const intersection = new Set(
    [...messageKeywords].filter((kw) => recentKeywords.has(kw)),
  );
  const union = new Set([...messageKeywords, ...recentKeywords]);

  if (union.size === 0) {
    return 0;
  }

  const similarity = intersection.size / union.size;

  // Scale to 0-100
  return Math.round(similarity * 100);
}

/**
 * Calculate Reference Score
 * Validates: Requirements 2.4
 *
 * Calculates a score based on how many times this message is referenced
 * by later messages in the conversation.
 *
 * @param message - The message to score
 * @param _allMessages - All messages in the conversation (unused, kept for API consistency)
 * @returns Reference score (0-100)
 */
export function calculateReferenceScore(
  message: Message,
  _allMessages: Message[],
): number {
  const referenceCount = message.referenceCount || 0;

  // Scale reference count to 0-100
  // Use logarithmic scaling: score = 100 * log(1 + count) / log(11)
  // This gives: 0 refs = 0, 1 ref = 30, 5 refs = 70, 10 refs = 100
  if (referenceCount === 0) {
    return 0;
  }

  const score = (100 * Math.log(1 + referenceCount)) / Math.log(11);
  return Math.min(100, Math.round(score));
}

/**
 * Is Protected Message
 * Validates: Requirements 1.3, 2.5
 *
 * Determines if a message should be protected from pruning.
 * Protected messages include:
 * - System messages
 * - Most recent user message
 * - Most recent assistant message
 * - Compaction summaries
 * - Pinned messages
 *
 * @param message - The message to check
 * @param allMessages - All messages in the conversation
 * @returns True if the message is protected
 */
export function isProtectedMessage(
  message: Message,
  allMessages: Message[],
): boolean {
  // System messages are always protected
  if (message.role === "system") {
    return true;
  }

  // Pinned messages are protected
  if (message.isPinned) {
    return true;
  }

  // Compaction summaries are protected
  if (message.isCompactionSummary) {
    return true;
  }

  // Most recent user message is protected
  const latestUserMessage = [...allMessages]
    .reverse()
    .find((m) => m.role === "user");
  if (latestUserMessage && message.id === latestUserMessage.id) {
    return true;
  }

  // Most recent assistant message is protected
  const latestAssistantMessage = [...allMessages]
    .reverse()
    .find((m) => m.role === "assistant");
  if (latestAssistantMessage && message.id === latestAssistantMessage.id) {
    return true;
  }

  return false;
}

/**
 * Update Message Priorities
 * Validates: Requirements 2.1, 2.2
 *
 * Calculates and persists priority scores for all messages in a chat.
 * This should be called periodically or when the conversation changes significantly.
 *
 * @param chatId - The chat ID to update priorities for
 * @param userInteractions - Optional user interactions to consider
 * @throws DyadError with DatabaseError kind if persistence fails
 */
export async function updateMessagePriorities(
  chatId: number,
  userInteractions: UserInteraction[] = [],
): Promise<void> {
  try {
    // Fetch all messages for this chat
    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);

    if (chatMessages.length === 0) {
      return; // No messages to update
    }

    // Convert database messages to Message interface
    const messageList: Message[] = chatMessages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
      createdAt: msg.createdAt,
      isPinned: msg.isPinned || false,
      isCompactionSummary: msg.isCompactionSummary || false,
      referenceCount: msg.referenceCount || 0,
      lastPriorityScore: msg.lastPriorityScore || undefined,
    }));

    // Calculate priorities for all messages
    const priorities: MessagePriority[] = messageList.map((msg) =>
      calculateMessagePriority(msg, messageList, userInteractions),
    );

    // Persist priorities to database
    for (const priority of priorities) {
      // Check if priority record already exists
      const existing = await db
        .select()
        .from(messagePriorities)
        .where(eq(messagePriorities.messageId, priority.messageId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(messagePriorities)
          .set({
            score: priority.score,
            recencyFactor: priority.factors.recency,
            interactionFactor: priority.factors.userInteraction,
            relevanceFactor: priority.factors.semanticRelevance,
            referenceCount: priority.factors.referenceCount,
            isPinned: priority.isPinned,
            calculatedAt: new Date(),
          })
          .where(eq(messagePriorities.messageId, priority.messageId));
      } else {
        // Insert new record
        await db.insert(messagePriorities).values({
          messageId: priority.messageId,
          score: priority.score,
          recencyFactor: priority.factors.recency,
          interactionFactor: priority.factors.userInteraction,
          relevanceFactor: priority.factors.semanticRelevance,
          referenceCount: priority.factors.referenceCount,
          isPinned: priority.isPinned,
          calculatedAt: new Date(),
        });
      }

      // Also update the cached score in the messages table
      await db
        .update(messages)
        .set({
          lastPriorityScore: priority.score,
        })
        .where(eq(messages.id, priority.messageId));
    }
  } catch (error) {
    throw new DyadError(
      `Failed to update message priorities for chat ${chatId}: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.Internal,
    );
  }
}

/**
 * Pin Message
 * Validates: Requirements 2.5
 *
 * Marks a message as pinned, protecting it from pruning.
 * Updates both the messages table and the message priorities.
 *
 * @param messageId - The message ID to pin
 * @throws DyadError with ValidationError kind if message not found
 * @throws DyadError with DatabaseError kind if persistence fails
 */
export async function pinMessage(messageId: number): Promise<void> {
  try {
    // Check if message exists
    const message = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (message.length === 0) {
      throw new DyadError(
        `Message ${messageId} not found`,
        DyadErrorKind.Validation,
      );
    }

    // Update messages table
    await db
      .update(messages)
      .set({
        isPinned: true,
      })
      .where(eq(messages.id, messageId));

    // Update message priorities table if record exists
    const priorityRecord = await db
      .select()
      .from(messagePriorities)
      .where(eq(messagePriorities.messageId, messageId))
      .limit(1);

    if (priorityRecord.length > 0) {
      await db
        .update(messagePriorities)
        .set({
          isPinned: true,
        })
        .where(eq(messagePriorities.messageId, messageId));
    }
  } catch (error) {
    if (error instanceof DyadError) {
      throw error;
    }
    throw new DyadError(
      `Failed to pin message ${messageId}: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.Internal,
    );
  }
}

/**
 * Unpin Message
 * Validates: Requirements 2.5
 *
 * Removes the pinned status from a message, allowing it to be pruned normally.
 * Updates both the messages table and the message priorities.
 *
 * @param messageId - The message ID to unpin
 * @throws DyadError with ValidationError kind if message not found
 * @throws DyadError with DatabaseError kind if persistence fails
 */
export async function unpinMessage(messageId: number): Promise<void> {
  try {
    // Check if message exists
    const message = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (message.length === 0) {
      throw new DyadError(
        `Message ${messageId} not found`,
        DyadErrorKind.Validation,
      );
    }

    // Update messages table
    await db
      .update(messages)
      .set({
        isPinned: false,
      })
      .where(eq(messages.id, messageId));

    // Update message priorities table if record exists
    const priorityRecord = await db
      .select()
      .from(messagePriorities)
      .where(eq(messagePriorities.messageId, messageId))
      .limit(1);

    if (priorityRecord.length > 0) {
      await db
        .update(messagePriorities)
        .set({
          isPinned: false,
        })
        .where(eq(messagePriorities.messageId, messageId));
    }
  } catch (error) {
    if (error instanceof DyadError) {
      throw error;
    }
    throw new DyadError(
      `Failed to unpin message ${messageId}: ${error instanceof Error ? error.message : String(error)}`,
      DyadErrorKind.Internal,
    );
  }
}

/**
 * Select Messages for Sliding Window Retention
 * Validates: Requirements 2.3
 *
 * Implements a sliding window algorithm that retains high-priority messages
 * beyond the standard retention window. Given a list of messages with their
 * priorities and a sliding window size N, this function returns the message IDs
 * that should be retained.
 *
 * The algorithm ensures that:
 * 1. Protected messages are always retained
 * 2. The top N messages by priority score are retained
 * 3. Messages are retained regardless of their position in the conversation
 *
 * @param messages - All messages in the conversation
 * @param priorities - Priority scores for all messages
 * @param slidingWindowSize - Number of high-priority messages to retain
 * @returns Array of message IDs that should be retained
 */
export function selectMessagesForSlidingWindow(
  messages: Message[],
  priorities: MessagePriority[],
  slidingWindowSize: number,
): number[] {
  // Create a map of message ID to priority for quick lookup
  const priorityMap = new Map<number, MessagePriority>();
  for (const priority of priorities) {
    priorityMap.set(priority.messageId, priority);
  }

  // Separate protected and non-protected messages
  const protectedMessageIds: number[] = [];
  const nonProtectedMessages: Array<{ id: number; score: number }> = [];

  for (const message of messages) {
    const priority = priorityMap.get(message.id);
    if (!priority) {
      continue; // Skip messages without priority scores
    }

    if (priority.isProtected) {
      protectedMessageIds.push(message.id);
    } else {
      nonProtectedMessages.push({
        id: message.id,
        score: priority.score,
      });
    }
  }

  // Sort non-protected messages by priority score (descending)
  nonProtectedMessages.sort((a, b) => b.score - a.score);

  // Select top N non-protected messages
  const topNMessageIds = nonProtectedMessages
    .slice(0, slidingWindowSize)
    .map((m) => m.id);

  // Combine protected and top N messages
  return [...protectedMessageIds, ...topNMessageIds];
}
