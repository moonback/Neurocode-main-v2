/**
 * PruningEngine - Removes redundant information from context
 *
 * This class is responsible for:
 * - Removing duplicate code blocks using content hashing
 * - Removing logging statements (console.log, logger.*, etc.)
 * - Removing non-semantic comments
 * - Prioritizing recent conversation turns over older ones
 *
 * Requirements: 1.3, 1.4, 1.5, 1.6
 */

import crypto from "crypto";
import type {
  Context,
  ConversationTurn,
  FileContext,
} from "./ContextOptimizer";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Metrics about pruning operations
 */
export interface PruningMetrics {
  duplicatesRemoved: number;
  loggingStatementsRemoved: number;
  commentsRemoved: number;
  turnsRemoved: number;
  tokensSaved: number;
}

// =============================================================================
// PruningEngine Class
// =============================================================================

export class PruningEngine {
  /**
   * Estimate token count using 4-characters-per-token heuristic
   * This matches the existing pattern in the codebase
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate SHA-256 hash of content for duplicate detection
   */
  private hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Remove duplicate code blocks from context using content hashing
   *
   * This method:
   * - Hashes each file's content
   * - Keeps only the first occurrence of each unique content
   * - Preserves user-provided files (never removes them)
   * - Tracks how many duplicates were removed
   *
   * @param context - The context to deduplicate
   * @returns Context with duplicates removed and metrics
   *
   * Requirements: 1.3
   */
  removeDuplicates(context: Context): Context {
    const seenHashes = new Set<string>();
    const uniqueFiles: FileContext[] = [];

    for (const file of context.files) {
      // Always preserve user-provided files
      if (file.isUserProvided) {
        uniqueFiles.push(file);
        continue;
      }

      const hash = this.hashContent(file.content);

      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        uniqueFiles.push(file);
      }
      // else: duplicate file, skip it
    }

    return {
      ...context,
      files: uniqueFiles,
    };
  }

  /**
   * Remove logging statements from code
   *
   * Removes common logging patterns:
   * - console.log, console.debug, console.info, console.warn, console.error
   * - logger.debug, logger.info, logger.warn, logger.error, logger.trace
   * - log.debug, log.info, log.warn, log.error
   *
   * Handles:
   * - Single-line statements: console.log('test');
   * - Multi-line statements: console.log(\n  'test'\n);
   * - Method chaining: console.log('test').log('test2');
   *
   * @param code - The code to process
   * @returns Code with logging statements removed
   *
   * Requirements: 1.4
   */
  removeLogging(code: string): string {
    // Pattern explanation:
    // - console\.(log|debug|info|warn|error) - console methods
    // - logger\.(debug|info|warn|error|trace) - logger methods
    // - log\.(debug|info|warn|error) - log methods
    // - \s* - optional whitespace
    // - \( - opening parenthesis
    // - (?:[^()]*|\([^()]*\))* - match content including nested parens (one level)
    // - \) - closing parenthesis
    // - \s*;? - optional semicolon and whitespace
    const loggingPattern =
      /(?:console|logger|log)\.(log|debug|info|warn|error|trace)\s*\((?:[^()]*|\([^()]*\))*\)\s*;?/g;

    return code.replace(loggingPattern, "");
  }

  /**
   * Remove non-semantic comments from code
   *
   * Removes comments that don't add semantic value:
   * - "// end of function", "// end of class", etc.
   * - "// TODO", "// FIXME", "// HACK", "// XXX"
   * - "// ===", "// ---", "// ***" (separator comments)
   * - Empty or whitespace-only comments
   *
   * Preserves:
   * - JSDoc comments (documentation blocks)
   * - License headers
   * - Comments with meaningful content
   *
   * @param code - The code to process
   * @param language - Programming language (for language-aware parsing)
   * @returns Code with non-semantic comments removed
   *
   * Requirements: 1.5
   */
  removeComments(code: string, language: string): string {
    let result = code;

    // Remove single-line non-semantic comments
    // Patterns to remove:
    // - // end of ...
    // - // TODO, FIXME, HACK, XXX, NOTE
    // - // ===, ---, ***, ___ (separators)
    // - // (empty or whitespace only)
    const nonSemanticSingleLine =
      /\/\/\s*(?:end of|TODO|FIXME|HACK|XXX|NOTE|[=\-*_]{3,}|\s*$).*/gm;
    result = result.replace(nonSemanticSingleLine, "");

    // Remove multi-line non-semantic comments (but preserve JSDoc)
    // Match block comments but not JSDoc comments
    if (language === "typescript" || language === "javascript") {
      // Remove block comments that are just separators or empty
      const nonSemanticBlockComment = /\/\*(?!\*)\s*(?:[=\-*_]{3,}|\s*)\*\//g;
      result = result.replace(nonSemanticBlockComment, "");
    }

    // Clean up multiple consecutive blank lines (left after comment removal)
    result = result.replace(/\n\s*\n\s*\n/g, "\n\n");

    return result;
  }

  /**
   * Prioritize recent conversation turns over older ones
   *
   * When pruning is necessary:
   * - Always keep the most recent turns
   * - Remove older turns first
   * - Preserve system messages (they often contain important context)
   * - Return turns in chronological order
   *
   * @param turns - Conversation history to prune
   * @param maxTurns - Maximum number of turns to keep
   * @returns Pruned conversation history with recent turns prioritized
   *
   * Requirements: 1.6
   */
  prioritizeRecent(
    turns: ConversationTurn[],
    maxTurns: number,
  ): ConversationTurn[] {
    if (turns.length <= maxTurns) {
      return turns;
    }

    // Separate system messages from user/assistant messages
    const systemMessages = turns.filter((turn) => turn.role === "system");
    const conversationMessages = turns.filter((turn) => turn.role !== "system");

    // Sort conversation messages by timestamp (most recent last)
    const sortedConversation = [...conversationMessages].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    // Calculate how many conversation turns we can keep
    // Reserve space for system messages
    const conversationTurnsToKeep = Math.max(
      0,
      maxTurns - systemMessages.length,
    );

    // Take the most recent conversation turns
    const recentConversation = sortedConversation.slice(
      -conversationTurnsToKeep,
    );

    // Combine system messages with recent conversation
    // System messages go first, then conversation in chronological order
    const result = [...systemMessages, ...recentConversation];

    // Sort final result by timestamp to maintain chronological order
    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Apply all pruning operations to a context
   *
   * This method coordinates all pruning operations:
   * 1. Remove duplicate files
   * 2. Remove logging statements from code files
   * 3. Remove non-semantic comments from code files
   * 4. Prioritize recent conversation turns if needed
   *
   * @param context - The context to prune
   * @param maxConversationTurns - Maximum conversation turns to keep (optional)
   * @returns Pruned context with metrics
   */
  prune(
    context: Context,
    maxConversationTurns?: number,
  ): { context: Context; metrics: PruningMetrics } {
    let currentContext = { ...context };
    const metrics: PruningMetrics = {
      duplicatesRemoved: 0,
      loggingStatementsRemoved: 0,
      commentsRemoved: 0,
      turnsRemoved: 0,
      tokensSaved: 0,
    };

    const originalTokens = context.metadata.totalTokens;

    // Step 1: Remove duplicate files
    const beforeDuplicates = currentContext.files.length;
    currentContext = this.removeDuplicates(currentContext);
    metrics.duplicatesRemoved = beforeDuplicates - currentContext.files.length;

    // Step 2: Remove logging statements and comments from files
    const processedFiles = currentContext.files.map((file) => {
      // Skip user-provided files
      if (file.isUserProvided) {
        return file;
      }

      let processedContent = file.content;
      const originalLength = processedContent.length;

      // Remove logging statements
      const afterLogging = this.removeLogging(processedContent);
      const loggingRemoved = originalLength - afterLogging.length;
      if (loggingRemoved > 0) {
        metrics.loggingStatementsRemoved++;
      }
      processedContent = afterLogging;

      // Remove non-semantic comments
      const language = file.language || "typescript";
      const afterComments = this.removeComments(processedContent, language);
      const commentsRemoved = afterLogging.length - afterComments.length;
      if (commentsRemoved > 0) {
        metrics.commentsRemoved++;
      }
      processedContent = afterComments;

      // Update token count if content changed
      const newTokenCount =
        processedContent !== file.content
          ? this.estimateTokens(processedContent)
          : file.tokenCount;

      return {
        ...file,
        content: processedContent,
        tokenCount: newTokenCount,
      };
    });

    currentContext = {
      ...currentContext,
      files: processedFiles,
    };

    // Step 3: Prioritize recent conversation turns if maxConversationTurns is specified
    if (
      maxConversationTurns !== undefined &&
      currentContext.conversationHistory.length > maxConversationTurns
    ) {
      const beforeTurns = currentContext.conversationHistory.length;
      currentContext = {
        ...currentContext,
        conversationHistory: this.prioritizeRecent(
          currentContext.conversationHistory,
          maxConversationTurns,
        ),
      };
      metrics.turnsRemoved =
        beforeTurns - currentContext.conversationHistory.length;
    }

    // Calculate total tokens saved
    const newTotalTokens = this.calculateTotalTokens(currentContext);
    metrics.tokensSaved = originalTokens - newTotalTokens;

    // Update metadata with new token count
    currentContext = {
      ...currentContext,
      metadata: {
        ...currentContext.metadata,
        totalTokens: newTotalTokens,
      },
    };

    return {
      context: currentContext,
      metrics,
    };
  }

  /**
   * Calculate total tokens in a context
   */
  private calculateTotalTokens(context: Context): number {
    let total = 0;

    // User instructions
    for (const instruction of context.userInstructions) {
      total += this.estimateTokens(instruction);
    }

    // Conversation history
    for (const turn of context.conversationHistory) {
      total += turn.tokenCount || this.estimateTokens(turn.content);
    }

    // Files
    for (const file of context.files) {
      total += file.tokenCount || this.estimateTokens(file.content);
    }

    // Skills
    for (const skill of context.skills) {
      total += skill.tokenCount || this.estimateTokens(skill.content);
    }

    return total;
  }
}
