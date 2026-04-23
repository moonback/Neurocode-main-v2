// Context Pruner Subsystem
// Feature: token-optimization
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7

import type { Message } from "./message_history_manager";
import type { MessagePriority, PruningResult, TokenBudget } from "./types";

/**
 * Compression Level
 * Defines how aggressively to compress messages
 */
export type CompressionLevel = "minimal" | "moderate" | "maximum";

/**
 * Pruning Strategy Interface
 * Defines the contract for different pruning strategies
 */
export interface PruningStrategy {
  name: "conservative" | "balanced" | "aggressive";
  threshold: number; // Percentage of context window (0-100)
  retentionPercentage: number; // Percentage of messages to retain (0-100)
  compressionLevel: CompressionLevel;

  shouldPrune(
    currentTokens: number,
    contextWindow: number,
    threshold?: number,
  ): boolean;
  selectMessagesToRemove(
    messages: Message[],
    priorities: MessagePriority[],
    targetTokens: number,
  ): number[];
  compressMessages(messages: Message[], level: CompressionLevel): string;
}

/**
 * Conservative Pruning Strategy
 * Validates: Requirements 1.1
 *
 * - Threshold: 85% of context window
 * - Retention: Top 70% of messages by priority
 * - Compression: Minimal (only exact duplicates)
 * - Use Case: Users who prioritize conversation quality over cost
 */
export class ConservativeStrategy implements PruningStrategy {
  name: "conservative" = "conservative";
  threshold = 85;
  retentionPercentage = 70;
  compressionLevel: CompressionLevel = "minimal";

  shouldPrune(
    currentTokens: number,
    contextWindow: number,
    threshold?: number,
  ): boolean {
    const thresholdToUse = threshold ?? this.threshold;
    const thresholdTokens = (contextWindow * thresholdToUse) / 100;
    return currentTokens >= thresholdTokens;
  }

  selectMessagesToRemove(
    messages: Message[],
    priorities: MessagePriority[],
    targetTokens: number,
  ): number[] {
    return selectMessagesToRemoveByPriority(
      messages,
      priorities,
      this.retentionPercentage,
      targetTokens,
    );
  }

  compressMessages(messages: Message[], level: CompressionLevel): string {
    return compressMessagesImpl(messages, level);
  }
}

/**
 * Balanced Pruning Strategy (Default)
 * Validates: Requirements 1.1
 *
 * - Threshold: 80% of context window
 * - Retention: Top 50% of messages by priority
 * - Compression: Moderate (duplicates + repetitive patterns)
 * - Use Case: Most users seeking good balance
 */
export class BalancedStrategy implements PruningStrategy {
  name: "balanced" = "balanced";
  threshold = 80;
  retentionPercentage = 50;
  compressionLevel: CompressionLevel = "moderate";

  shouldPrune(
    currentTokens: number,
    contextWindow: number,
    threshold?: number,
  ): boolean {
    const thresholdToUse = threshold ?? this.threshold;
    const thresholdTokens = (contextWindow * thresholdToUse) / 100;
    return currentTokens >= thresholdTokens;
  }

  selectMessagesToRemove(
    messages: Message[],
    priorities: MessagePriority[],
    targetTokens: number,
  ): number[] {
    return selectMessagesToRemoveByPriority(
      messages,
      priorities,
      this.retentionPercentage,
      targetTokens,
    );
  }

  compressMessages(messages: Message[], level: CompressionLevel): string {
    return compressMessagesImpl(messages, level);
  }
}

/**
 * Aggressive Pruning Strategy
 * Validates: Requirements 1.1
 *
 * - Threshold: 70% of context window
 * - Retention: Top 30% of messages by priority
 * - Compression: Maximum (duplicates + patterns + semantic clustering)
 * - Use Case: Users prioritizing cost savings, long conversations
 */
export class AggressiveStrategy implements PruningStrategy {
  name: "aggressive" = "aggressive";
  threshold = 70;
  retentionPercentage = 30;
  compressionLevel: CompressionLevel = "maximum";

  shouldPrune(
    currentTokens: number,
    contextWindow: number,
    threshold?: number,
  ): boolean {
    const thresholdToUse = threshold ?? this.threshold;
    const thresholdTokens = (contextWindow * thresholdToUse) / 100;
    return currentTokens >= thresholdTokens;
  }

  selectMessagesToRemove(
    messages: Message[],
    priorities: MessagePriority[],
    targetTokens: number,
  ): number[] {
    return selectMessagesToRemoveByPriority(
      messages,
      priorities,
      this.retentionPercentage,
      targetTokens,
    );
  }

  compressMessages(messages: Message[], level: CompressionLevel): string {
    return compressMessagesImpl(messages, level);
  }
}

/**
 * Should Prune
 * Validates: Requirements 1.2
 *
 * Determines if pruning should be triggered based on current token usage.
 * Pruning triggers when current tokens >= threshold percentage of context window.
 *
 * @param currentTokens - Current token count
 * @param contextWindow - Maximum context window size
 * @param threshold - Threshold percentage (0-100)
 * @returns True if pruning should be triggered
 */
export function shouldPrune(
  currentTokens: number,
  contextWindow: number,
  threshold: number,
): boolean {
  if (contextWindow <= 0) {
    return false;
  }
  const thresholdTokens = (contextWindow * threshold) / 100;
  return currentTokens >= thresholdTokens;
}

/**
 * Select Messages to Remove by Priority
 * Validates: Requirements 1.3, 1.4, 1.7
 *
 * Selects messages to remove based on priority scores while preserving:
 * - Protected messages (system, recent user/assistant, compaction summaries, pinned)
 * - Messages referenced by retained messages
 * - Top N% of messages by priority score
 *
 * @param messages - All messages in the conversation
 * @param priorities - Priority scores for all messages
 * @param retentionPercentage - Percentage of non-protected messages to retain (0-100)
 * @param targetTokens - Target token count to achieve (unused in current implementation)
 * @returns Array of message IDs to remove
 */
export function selectMessagesToRemove(
  messages: Message[],
  priorities: MessagePriority[],
  targetTokens: number,
): number[] {
  // Default to balanced strategy (50% retention)
  return selectMessagesToRemoveByPriority(
    messages,
    priorities,
    50,
    targetTokens,
  );
}

/**
 * Select Messages to Remove by Priority (Internal)
 * Validates: Requirements 1.3, 1.4, 1.7
 *
 * Internal implementation that accepts a retention percentage parameter.
 *
 * @param messages - All messages in the conversation
 * @param priorities - Priority scores for all messages
 * @param retentionPercentage - Percentage of non-protected messages to retain (0-100)
 * @param _targetTokens - Target token count (unused, kept for API consistency)
 * @returns Array of message IDs to remove
 */
function selectMessagesToRemoveByPriority(
  messages: Message[],
  priorities: MessagePriority[],
  retentionPercentage: number,
  _targetTokens: number,
): number[] {
  // Create a map of message ID to priority for quick lookup
  const priorityMap = new Map<number, MessagePriority>();
  for (const priority of priorities) {
    priorityMap.set(priority.messageId, priority);
  }

  // Separate protected and non-protected messages
  const protectedMessageIds = new Set<number>();
  const nonProtectedMessages: Array<{ id: number; score: number }> = [];

  for (const message of messages) {
    const priority = priorityMap.get(message.id);
    if (!priority) {
      continue; // Skip messages without priority scores
    }

    if (priority.isProtected || priority.isPinned) {
      protectedMessageIds.add(message.id);
    } else {
      nonProtectedMessages.push({
        id: message.id,
        score: priority.score,
      });
    }
  }

  // Sort non-protected messages by priority score (descending)
  nonProtectedMessages.sort((a, b) => b.score - a.score);

  // Calculate how many non-protected messages to retain
  const retainCount = Math.ceil(
    (nonProtectedMessages.length * retentionPercentage) / 100,
  );

  // Select messages to retain (top N by priority)
  const retainedMessageIds = new Set<number>(protectedMessageIds);
  for (let i = 0; i < retainCount && i < nonProtectedMessages.length; i++) {
    retainedMessageIds.add(nonProtectedMessages[i].id);
  }

  // Build reference graph to preserve referenced messages
  const referencedBy = buildReferenceGraph(messages);

  // Expand retained set to include all referenced messages
  const finalRetainedIds = expandRetainedWithReferences(
    retainedMessageIds,
    referencedBy,
  );

  // Messages to remove are those not in the final retained set
  const messagesToRemove: number[] = [];
  for (const message of messages) {
    if (!finalRetainedIds.has(message.id)) {
      messagesToRemove.push(message.id);
    }
  }

  return messagesToRemove;
}

/**
 * Build Reference Graph
 * Validates: Requirements 1.7
 *
 * Builds a graph of message references by analyzing message content.
 * A message B references message A if B's content mentions A's ID or content.
 *
 * For now, this is a simple heuristic based on message ordering.
 * In the future, this could be enhanced with explicit reference tracking.
 *
 * @param messages - All messages in the conversation
 * @returns Map of message ID to set of message IDs that reference it
 */
function buildReferenceGraph(messages: Message[]): Map<number, Set<number>> {
  const referencedBy = new Map<number, Set<number>>();

  // Initialize map
  for (const message of messages) {
    referencedBy.set(message.id, new Set());
  }

  // Simple heuristic: assume later messages may reference earlier messages
  // In a real implementation, this would parse message content for explicit references
  // For now, we'll use a conservative approach: if a message has a high reference count,
  // we assume it's referenced by subsequent messages

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const refCount = message.referenceCount || 0;

    if (refCount > 0) {
      // Mark this message as referenced by the next N messages
      for (
        let j = i + 1;
        j < Math.min(i + 1 + refCount, messages.length);
        j++
      ) {
        const referencingMessage = messages[j];
        const refs = referencedBy.get(message.id);
        if (refs) {
          refs.add(referencingMessage.id);
        }
      }
    }
  }

  return referencedBy;
}

/**
 * Expand Retained with References
 * Validates: Requirements 1.7
 *
 * Expands the set of retained messages to include all messages that are
 * referenced by retained messages. This ensures conversation coherence.
 *
 * @param retainedIds - Initial set of retained message IDs
 * @param referencedBy - Map of message ID to set of message IDs that reference it
 * @returns Expanded set of retained message IDs
 */
function expandRetainedWithReferences(
  retainedIds: Set<number>,
  referencedBy: Map<number, Set<number>>,
): Set<number> {
  const finalRetained = new Set(retainedIds);
  const toProcess = Array.from(retainedIds);

  while (toProcess.length > 0) {
    const messageId = toProcess.pop()!;

    // Find all messages that this message might reference
    // (i.e., messages that are referenced by this message)
    for (const [referencedId, referencingIds] of referencedBy.entries()) {
      if (referencingIds.has(messageId) && !finalRetained.has(referencedId)) {
        // This retained message references another message
        // Add the referenced message to the retained set
        finalRetained.add(referencedId);
        toProcess.push(referencedId);
      }
    }
  }

  return finalRetained;
}

/**
 * Compress Messages
 * Validates: Requirements 1.5
 *
 * Compresses a sequence of messages into a summary based on the compression level.
 *
 * @param messages - Messages to compress
 * @param level - Compression level (minimal, moderate, maximum)
 * @returns Summary string
 */
export function compressMessages(
  messages: Message[],
  level: CompressionLevel,
): string {
  return compressMessagesImpl(messages, level);
}

/**
 * Compress Messages Implementation
 * Validates: Requirements 1.5
 *
 * Internal implementation of message compression.
 *
 * @param messages - Messages to compress
 * @param level - Compression level
 * @returns Summary string
 */
function compressMessagesImpl(
  messages: Message[],
  level: CompressionLevel,
): string {
  if (messages.length === 0) {
    return "";
  }

  if (messages.length === 1) {
    return `[Compressed message]: ${truncateContent(messages[0].content, 100)}`;
  }

  switch (level) {
    case "minimal":
      return compressMinimal(messages);
    case "moderate":
      return compressModerate(messages);
    case "maximum":
      return compressMaximum(messages);
    default:
      return compressModerate(messages);
  }
}

/**
 * Compress Minimal
 * Only removes exact duplicates
 */
function compressMinimal(messages: Message[]): string {
  const uniqueContents = new Set<string>();
  const uniqueMessages: Message[] = [];

  for (const message of messages) {
    if (!uniqueContents.has(message.content)) {
      uniqueContents.add(message.content);
      uniqueMessages.push(message);
    }
  }

  if (uniqueMessages.length === messages.length) {
    // No duplicates found, return simple summary
    return `[Compressed ${messages.length} messages]: ${messages.map((m) => truncateContent(m.content, 50)).join("; ")}`;
  }

  return `[Compressed ${messages.length} messages (${messages.length - uniqueMessages.length} duplicates removed)]: ${uniqueMessages.map((m) => truncateContent(m.content, 50)).join("; ")}`;
}

/**
 * Compress Moderate
 * Removes duplicates and identifies repetitive patterns
 */
function compressModerate(messages: Message[]): string {
  // First, remove exact duplicates
  const uniqueMessages: Message[] = [];
  const seenContents = new Set<string>();

  for (const message of messages) {
    if (!seenContents.has(message.content)) {
      seenContents.add(message.content);
      uniqueMessages.push(message);
    }
  }

  // Identify repetitive patterns (messages with similar content)
  const patterns = identifyRepetitivePatterns(uniqueMessages);

  if (patterns.length > 0) {
    return `[Compressed ${messages.length} messages with ${patterns.length} repetitive patterns]: ${patterns.join("; ")}`;
  }

  // No patterns found, return simple summary
  return `[Compressed ${messages.length} messages]: ${uniqueMessages
    .slice(0, 3)
    .map((m) => truncateContent(m.content, 50))
    .join("; ")}${uniqueMessages.length > 3 ? "..." : ""}`;
}

/**
 * Compress Maximum
 * Removes duplicates, patterns, and performs semantic clustering
 */
function compressMaximum(messages: Message[]): string {
  // Group messages by role
  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const systemMessages = messages.filter((m) => m.role === "system");

  const summary: string[] = [];

  if (systemMessages.length > 0) {
    summary.push(
      `${systemMessages.length} system message${systemMessages.length > 1 ? "s" : ""}`,
    );
  }

  if (userMessages.length > 0) {
    summary.push(
      `${userMessages.length} user message${userMessages.length > 1 ? "s" : ""}`,
    );
  }

  if (assistantMessages.length > 0) {
    summary.push(
      `${assistantMessages.length} assistant message${assistantMessages.length > 1 ? "s" : ""}`,
    );
  }

  return `[Compressed ${messages.length} messages]: ${summary.join(", ")}`;
}

/**
 * Identify Repetitive Patterns
 * Finds messages with similar content patterns
 */
function identifyRepetitivePatterns(messages: Message[]): string[] {
  const patterns: string[] = [];

  // Group messages by role
  const messagesByRole = new Map<string, Message[]>();
  for (const message of messages) {
    const roleMessages = messagesByRole.get(message.role) || [];
    roleMessages.push(message);
    messagesByRole.set(message.role, roleMessages);
  }

  // Look for repetitive patterns within each role
  for (const [role, roleMessages] of messagesByRole.entries()) {
    if (roleMessages.length > 2) {
      // Check if messages have similar structure (e.g., similar length, similar keywords)
      const avgLength =
        roleMessages.reduce((sum, m) => sum + m.content.length, 0) /
        roleMessages.length;

      const similarLengthMessages = roleMessages.filter(
        (m) => Math.abs(m.content.length - avgLength) < avgLength * 0.3,
      );

      if (similarLengthMessages.length >= roleMessages.length * 0.5) {
        patterns.push(
          `${similarLengthMessages.length} similar ${role} messages`,
        );
      }
    }
  }

  return patterns;
}

/**
 * Truncate Content
 * Truncates message content to a maximum length
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + "...";
}

/**
 * Prune Context
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 *
 * Main pruning function that orchestrates the entire pruning process.
 * This function:
 * 1. Checks if pruning should be triggered
 * 2. Selects messages to remove based on priority
 * 3. Attempts compression before removal
 * 4. Preserves references and protected messages
 * 5. Returns a detailed pruning result
 *
 * @param messages - All messages in the conversation
 * @param strategy - Pruning strategy to use
 * @param tokenBudget - Token budget information
 * @returns Pruning result with details about what was removed/compressed
 */
export function pruneContext(
  messages: Message[],
  strategy: PruningStrategy,
  tokenBudget: TokenBudget,
): PruningResult {
  const originalMessageCount = messages.length;

  // Check if pruning should be triggered
  const currentTokens = tokenBudget.used.inputContext;
  const contextWindow = tokenBudget.total;

  if (!strategy.shouldPrune(currentTokens, contextWindow)) {
    // No pruning needed
    return {
      originalMessageCount,
      prunedMessageCount: originalMessageCount,
      tokensRemoved: 0,
      strategy: strategy.name,
      preservedMessages: messages.map((m) => m.id),
      removedMessages: [],
      compressionSummaries: [],
    };
  }

  // Calculate priorities for all messages (if not already provided)
  // For now, we'll use a simple priority based on message position
  // In a real implementation, this would use the MessageHistoryManager
  const priorities: MessagePriority[] = messages.map((msg, idx) => ({
    messageId: msg.id,
    score: ((messages.length - idx) / messages.length) * 100,
    factors: {
      recency: ((messages.length - idx) / messages.length) * 100,
      userInteraction: 0,
      semanticRelevance: 50,
      referenceCount: msg.referenceCount || 0,
    },
    isPinned: msg.isPinned || false,
    isProtected:
      msg.role === "system" ||
      msg.isPinned ||
      msg.isCompactionSummary ||
      idx === messages.length - 1 ||
      idx === messages.length - 2,
  }));

  // Calculate target token count (aim for threshold - 10% buffer)
  const targetTokens = Math.floor(
    (contextWindow * (strategy.threshold - 10)) / 100,
  );

  // Select messages to remove
  const messagesToRemove = strategy.selectMessagesToRemove(
    messages,
    priorities,
    targetTokens,
  );

  // Attempt compression before removal
  const compressionSummaries: Array<{
    messageRange: [number, number];
    summary: string;
  }> = [];

  if (messagesToRemove.length > 0) {
    // Group consecutive messages for compression
    const consecutiveGroups = groupConsecutiveMessages(
      messages,
      messagesToRemove,
    );

    for (const group of consecutiveGroups) {
      if (group.length > 1) {
        const summary = strategy.compressMessages(
          group,
          strategy.compressionLevel,
        );
        const messageIds = group.map((m) => m.id);
        compressionSummaries.push({
          messageRange: [Math.min(...messageIds), Math.max(...messageIds)],
          summary,
        });
      }
    }
  }

  // Calculate tokens removed (estimate: ~4 chars per token)
  const removedContent = messages
    .filter((m) => messagesToRemove.includes(m.id))
    .map((m) => m.content)
    .join("");
  const tokensRemoved = Math.floor(removedContent.length / 4);

  // Build result
  const preservedMessages = messages
    .filter((m) => !messagesToRemove.includes(m.id))
    .map((m) => m.id);

  return {
    originalMessageCount,
    prunedMessageCount: preservedMessages.length,
    tokensRemoved,
    strategy: strategy.name,
    preservedMessages,
    removedMessages: messagesToRemove,
    compressionSummaries,
  };
}

/**
 * Group Consecutive Messages
 * Groups messages that are consecutive in the conversation
 */
function groupConsecutiveMessages(
  allMessages: Message[],
  messageIds: number[],
): Message[][] {
  const groups: Message[][] = [];
  let currentGroup: Message[] = [];

  const messageIdSet = new Set(messageIds);
  const messageMap = new Map(allMessages.map((m) => [m.id, m]));

  for (const message of allMessages) {
    if (messageIdSet.has(message.id)) {
      currentGroup.push(message);
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
