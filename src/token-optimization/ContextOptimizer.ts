/**
 * ContextOptimizer - Coordinates context optimization through pruning, compression, and selection
 *
 * This class is responsible for:
 * - Coordinating the optimization pipeline (prune -> compress -> select)
 * - Checking if optimization should be triggered based on thresholds
 * - Preserving user-provided content during optimization
 * - Tracking optimization metrics and applied techniques
 *
 * Requirements: 1.1, 3.2
 */

import { TokenBudget } from "./TokenManager";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Represents a turn in the conversation history
 */
export interface ConversationTurn {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  tokenCount?: number;
}

/**
 * Represents a file included in the context
 */
export interface FileContext {
  path: string;
  content: string;
  language?: string;
  relevanceScore?: number;
  tokenCount?: number;
  isUserProvided?: boolean;
}

/**
 * Represents a skill included in the context
 */
export interface SkillContext {
  name: string;
  content: string;
  tokenCount?: number;
}

/**
 * Metadata about the context
 */
export interface ContextMetadata {
  totalTokens: number;
  timestamp: number;
  requestId?: string;
  conversationId?: string;
}

/**
 * Debug information about optimization process
 */
export interface OptimizationDebugInfo {
  pruningDetails?: {
    duplicatesRemoved: number;
    loggingStatementsRemoved: number;
    commentsRemoved: number;
    turnsRemoved: number;
  };
  compressionDetails?: {
    filesCompressed: number;
    signaturesExtracted: number;
    patternsReplaced: number;
  };
  selectionDetails?: {
    filesIncluded: number;
    filesExcluded: number;
    turnsIncluded: number;
    turnsExcluded: number;
  };
}

/**
 * Input context containing all information to be optimized
 */
export interface Context {
  userInstructions: string[];
  conversationHistory: ConversationTurn[];
  files: FileContext[];
  skills: SkillContext[];
  metadata: ContextMetadata;
}

/**
 * Optimized context with metrics about the optimization
 */
export interface OptimizedContext extends Context {
  originalTokenCount: number;
  optimizedTokenCount: number;
  compressionRatio: number;
  optimizationsApplied: string[];
  debugInfo?: OptimizationDebugInfo;
}

/**
 * Context after pruning redundant information
 */
export interface PrunedContext extends Context {
  pruningMetrics: {
    duplicatesRemoved: number;
    loggingStatementsRemoved: number;
    commentsRemoved: number;
    turnsRemoved: number;
    tokensSaved: number;
  };
}

/**
 * Context after compression
 */
export interface CompressedContext extends Context {
  compressionMetrics: {
    filesCompressed: number;
    signaturesExtracted: number;
    patternsReplaced: number;
    tokensSaved: number;
  };
}

// =============================================================================
// ContextOptimizer Class
// =============================================================================

export class ContextOptimizer {
  /**
   * Check if optimization should be triggered based on token budget thresholds
   *
   * @param context - The context to check
   * @param budget - The token budget with thresholds
   * @returns Object indicating if optimization should occur and at what level
   *
   * Requirements: 1.1, 3.2
   */
  shouldOptimize(
    context: Context,
    budget: TokenBudget,
  ): { shouldOptimize: boolean; level: "warning" | "critical" | "none" } {
    const currentTokens = context.metadata.totalTokens;

    // Check critical threshold (90%)
    if (currentTokens >= budget.criticalThreshold) {
      return {
        shouldOptimize: true,
        level: "critical",
      };
    }

    // Check warning threshold (80%)
    if (currentTokens >= budget.warningThreshold) {
      return {
        shouldOptimize: true,
        level: "warning",
      };
    }

    // No optimization needed
    return {
      shouldOptimize: false,
      level: "none",
    };
  }

  /**
   * Optimize context to fit within budget by coordinating pruning, compression, and selection
   *
   * This method applies optimization strategies in sequence:
   * 1. Prune redundant information (duplicates, logging, comments)
   * 2. Compress remaining content (signatures, summaries, patterns)
   * 3. Select most relevant content if still over budget
   *
   * User-provided content (userInstructions and user-provided files) is ALWAYS preserved
   * and never modified during any optimization step.
   *
   * @param context - The context to optimize
   * @param budget - The token budget to fit within
   * @returns Optimized context with metrics
   *
   * Requirements: 1.1, 1.2, 3.2
   */
  optimize(context: Context, budget: TokenBudget): OptimizedContext {
    const originalTokenCount = context.metadata.totalTokens;
    const optimizationsApplied: string[] = [];
    const debugInfo: OptimizationDebugInfo = {};

    // Mark user-provided content for preservation
    const preservedContext = this.markUserContent(context);

    // Check if optimization is needed
    const { shouldOptimize: needsOptimization, level } = this.shouldOptimize(
      preservedContext,
      budget,
    );

    if (!needsOptimization) {
      // No optimization needed, return context as OptimizedContext
      return {
        ...preservedContext,
        originalTokenCount,
        optimizedTokenCount: originalTokenCount,
        compressionRatio: 1.0,
        optimizationsApplied: [],
        debugInfo,
      };
    }

    let optimizedContext: Context = { ...preservedContext };

    // Step 1: Prune redundant information
    // TODO: Implement in Task 4.1
    // For now, this is a placeholder that will be implemented later
    const prunedContext = this.prune(optimizedContext);
    if (prunedContext.pruningMetrics.tokensSaved > 0) {
      optimizationsApplied.push("pruning");
      debugInfo.pruningDetails = {
        duplicatesRemoved: prunedContext.pruningMetrics.duplicatesRemoved,
        loggingStatementsRemoved:
          prunedContext.pruningMetrics.loggingStatementsRemoved,
        commentsRemoved: prunedContext.pruningMetrics.commentsRemoved,
        turnsRemoved: prunedContext.pruningMetrics.turnsRemoved,
      };
    }
    optimizedContext = prunedContext;

    // Step 2: Compress content if still needed
    // TODO: Implement in Task 5.1
    // For now, this is a placeholder that will be implemented later
    if (
      level === "critical" ||
      optimizedContext.metadata.totalTokens >= budget.warningThreshold
    ) {
      const compressedContext = this.compress(optimizedContext);
      if (compressedContext.compressionMetrics.tokensSaved > 0) {
        optimizationsApplied.push("compression");
        debugInfo.compressionDetails = {
          filesCompressed: compressedContext.compressionMetrics.filesCompressed,
          signaturesExtracted:
            compressedContext.compressionMetrics.signaturesExtracted,
          patternsReplaced:
            compressedContext.compressionMetrics.patternsReplaced,
        };
      }
      optimizedContext = compressedContext;
    }

    // Step 3: Select most relevant content if still over budget
    // TODO: Implement in Task 6.1
    // For now, this is a placeholder that will be implemented later
    if (optimizedContext.metadata.totalTokens > budget.total) {
      const selectedContext = this.selectRelevant(
        optimizedContext,
        "", // task description - will be passed from caller
        budget.total,
      );
      optimizationsApplied.push("adaptive-selection");
      optimizedContext = selectedContext;
    }

    const optimizedTokenCount = optimizedContext.metadata.totalTokens;
    const compressionRatio =
      originalTokenCount > 0 ? optimizedTokenCount / originalTokenCount : 1.0;

    return {
      ...optimizedContext,
      originalTokenCount,
      optimizedTokenCount,
      compressionRatio,
      optimizationsApplied,
      debugInfo,
    };
  }

  /**
   * Mark user-provided content for preservation during optimization
   *
   * This method ensures that:
   * - All userInstructions are marked as user-provided
   * - Files with isUserProvided flag are preserved
   * - User content is never modified during pruning, compression, or selection
   *
   * @param context - The context to mark
   * @returns Context with user content marked for preservation
   *
   * Requirements: 1.2
   */
  private markUserContent(context: Context): Context {
    // Mark all files that are user-provided
    const markedFiles = context.files.map((file) => ({
      ...file,
      // Preserve existing isUserProvided flag, default to false if not set
      isUserProvided: file.isUserProvided ?? false,
    }));

    return {
      ...context,
      files: markedFiles,
      // userInstructions are always preserved by design - they're never modified
      // in any optimization step (prune, compress, selectRelevant)
    };
  }

  /**
   * Check if a file is user-provided and should be preserved
   *
   * @param file - The file to check
   * @returns True if the file is user-provided and should be preserved
   *
   * Requirements: 1.2
   */
  isUserProvided(file: FileContext): boolean {
    return file.isUserProvided === true;
  }

  /**
   * Prune context by removing redundant information
   *
   * This method removes:
   * - Duplicate code blocks
   * - Verbose logging statements
   * - Non-semantic comments
   * - Older conversation turns (prioritizing recent ones)
   *
   * @param context - The context to prune
   * @returns Pruned context with metrics
   *
   * TODO: Implement in Task 4.1 (Pruning Engine)
   */
  prune(context: Context): PrunedContext {
    // Placeholder implementation - will be implemented in Task 4.1
    // For now, return context unchanged with zero metrics
    return {
      ...context,
      pruningMetrics: {
        duplicatesRemoved: 0,
        loggingStatementsRemoved: 0,
        commentsRemoved: 0,
        turnsRemoved: 0,
        tokensSaved: 0,
      },
    };
  }

  /**
   * Compress context using various techniques
   *
   * This method applies:
   * - Function signature extraction for large files (>500 lines)
   * - Documentation summarization
   * - Pattern deduplication with references
   *
   * @param context - The context to compress
   * @returns Compressed context with metrics
   *
   * TODO: Implement in Task 5.1 (Compression Engine)
   */
  compress(context: Context): CompressedContext {
    // Placeholder implementation - will be implemented in Task 5.1
    // For now, return context unchanged with zero metrics
    return {
      ...context,
      compressionMetrics: {
        filesCompressed: 0,
        signaturesExtracted: 0,
        patternsReplaced: 0,
        tokensSaved: 0,
      },
    };
  }

  /**
   * Select most relevant context sections based on task and budget
   *
   * This method:
   * - Ranks files by relevance to the current task
   * - Includes high-relevance files in full, low-relevance as summaries
   * - Selects relevant conversation turns using semantic similarity
   * - Prioritizes user-provided content
   *
   * @param context - The context to select from
   * @param _task - Description of the current task for relevance scoring
   * @param _budget - Maximum tokens allowed
   * @returns Context with only the most relevant sections
   *
   * TODO: Implement in Task 6.1 (Adaptive Selector)
   */
  selectRelevant(context: Context, _task: string, _budget: number): Context {
    // Placeholder implementation - will be implemented in Task 6.1
    // For now, return context unchanged
    // In the real implementation, this will use semantic similarity
    // to rank and select the most relevant content
    return context;
  }
}
