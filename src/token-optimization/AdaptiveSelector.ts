/**
 * AdaptiveSelector - Selects most relevant context based on task and budget
 *
 * This class is responsible for:
 * - Ranking files by relevance to the current task using semantic similarity
 * - Implementing differential inclusion (full files vs summaries)
 * - Selecting relevant conversation turns using semantic similarity
 * - Prioritizing user-provided content over automatically discovered content
 *
 * Uses a keyword-based TF-IDF approach for semantic similarity to keep dependencies minimal.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import type {
  Context,
  ConversationTurn,
  FileContext,
} from "./ContextOptimizer";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Relevance score for a context item
 */
interface RelevanceScore {
  score: number;
  keywords: string[];
}

/**
 * TF-IDF document representation
 */
interface TFIDFDocument {
  terms: Map<string, number>; // term -> frequency
  totalTerms: number;
}

/**
 * Selection strategy for context items
 */
type SelectionStrategy = "full" | "summary" | "exclude";

// =============================================================================
// AdaptiveSelector Class
// =============================================================================

export class AdaptiveSelector {
  // Relevance thresholds for differential inclusion
  private static readonly HIGH_RELEVANCE_THRESHOLD = 0.6;
  private static readonly LOW_RELEVANCE_THRESHOLD = 0.3;

  // Token estimation heuristic (4 characters per token)
  private static readonly CHARS_PER_TOKEN = 4;

  /**
   * Estimate token count using 4-characters-per-token heuristic
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / AdaptiveSelector.CHARS_PER_TOKEN);
  }

  /**
   * Tokenize text into terms for TF-IDF analysis
   * Converts to lowercase, removes punctuation, filters stop words
   */
  private tokenize(text: string): string[] {
    // Convert to lowercase and split on non-alphanumeric characters
    const words = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 0);

    // Filter out common stop words
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "should",
      "could",
      "may",
      "might",
      "can",
      "this",
      "that",
      "these",
      "those",
      "it",
      "its",
      "i",
      "you",
      "he",
      "she",
      "we",
      "they",
    ]);

    return words.filter((word) => !stopWords.has(word) && word.length > 2);
  }

  /**
   * Build TF-IDF document representation
   */
  private buildTFIDFDocument(text: string): TFIDFDocument {
    const terms = this.tokenize(text);
    const termFrequency = new Map<string, number>();

    for (const term of terms) {
      termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
    }

    return {
      terms: termFrequency,
      totalTerms: terms.length,
    };
  }

  /**
   * Calculate cosine similarity between two TF-IDF documents
   * Returns a score between 0 (no similarity) and 1 (identical)
   */
  private calculateCosineSimilarity(
    doc1: TFIDFDocument,
    doc2: TFIDFDocument,
  ): number {
    // Get all unique terms
    const allTerms = new Set([...doc1.terms.keys(), ...doc2.terms.keys()]);

    if (allTerms.size === 0) {
      return 0;
    }

    // Calculate TF for each term
    const getTF = (term: string, doc: TFIDFDocument): number => {
      const freq = doc.terms.get(term) || 0;
      return doc.totalTerms > 0 ? freq / doc.totalTerms : 0;
    };

    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const term of allTerms) {
      const tf1 = getTF(term, doc1);
      const tf2 = getTF(term, doc2);

      dotProduct += tf1 * tf2;
      magnitude1 += tf1 * tf1;
      magnitude2 += tf2 * tf2;
    }

    // Calculate cosine similarity
    const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Calculate relevance score for a text relative to a task
   *
   * @param text - The text to score
   * @param task - The task description
   * @returns Relevance score between 0 and 1
   */
  private calculateRelevance(text: string, task: string): RelevanceScore {
    const textDoc = this.buildTFIDFDocument(text);
    const taskDoc = this.buildTFIDFDocument(task);

    const score = this.calculateCosineSimilarity(textDoc, taskDoc);

    // Extract keywords (top terms from task that appear in text)
    const keywords: string[] = [];
    for (const [term, _freq] of taskDoc.terms) {
      if (textDoc.terms.has(term)) {
        keywords.push(term);
      }
    }

    return { score, keywords };
  }

  /**
   * Rank files by relevance to the current task
   *
   * Files are ranked by semantic similarity to the task description.
   * User-provided files are always ranked highest.
   *
   * @param files - Files to rank
   * @param task - Task description
   * @returns Files sorted by relevance (highest first)
   *
   * Requirements: 8.1, 8.5
   */
  rankFilesByRelevance(files: FileContext[], task: string): FileContext[] {
    // Calculate relevance scores for each file
    const filesWithScores = files.map((file) => {
      // User-provided files get maximum relevance
      if (file.isUserProvided) {
        return {
          file: { ...file, relevanceScore: 1.0 },
          score: 1.0,
        };
      }

      // Calculate relevance based on file content and path
      const contentRelevance = this.calculateRelevance(file.content, task);
      const pathRelevance = this.calculateRelevance(file.path, task);

      // Combine content and path relevance (weight content more heavily)
      const combinedScore =
        contentRelevance.score * 0.8 + pathRelevance.score * 0.2;

      return {
        file: { ...file, relevanceScore: combinedScore },
        score: combinedScore,
      };
    });

    // Sort by relevance score (highest first)
    filesWithScores.sort((a, b) => b.score - a.score);

    return filesWithScores.map((item) => item.file);
  }

  /**
   * Create a summary of a file's content
   *
   * Extracts:
   * - File path
   * - First few lines (up to 10 lines or 200 characters)
   * - Key exports and declarations
   *
   * @param file - File to summarize
   * @returns Summary string
   */
  private createFileSummary(file: FileContext): string {
    const lines = file.content.split("\n");
    const maxLines = 10;
    const maxChars = 200;

    // Take first few lines
    const preview = lines.slice(0, maxLines).join("\n");
    const truncated =
      preview.length > maxChars
        ? preview.substring(0, maxChars) + "..."
        : preview;

    // Extract key declarations (exports, classes, functions)
    const declarations: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("export ") ||
        trimmed.startsWith("class ") ||
        trimmed.startsWith("function ") ||
        trimmed.startsWith("interface ") ||
        trimmed.startsWith("type ")
      ) {
        declarations.push(trimmed);
        if (declarations.length >= 5) break;
      }
    }

    let summary = `File: ${file.path}\n\n${truncated}`;
    if (declarations.length > 0) {
      summary += `\n\nKey declarations:\n${declarations.join("\n")}`;
    }

    return summary;
  }

  /**
   * Apply differential inclusion strategy to files
   *
   * - High relevance (>= 0.6): Include full content
   * - Medium relevance (0.3 - 0.6): Include summary
   * - Low relevance (< 0.3): Exclude
   * - User-provided: Always include full content
   *
   * @param files - Ranked files with relevance scores
   * @param budget - Remaining token budget
   * @returns Files with differential inclusion applied
   *
   * Requirements: 8.2, 8.5
   */
  applyDifferentialInclusion(
    files: FileContext[],
    budget: number,
  ): FileContext[] {
    const result: FileContext[] = [];
    let remainingBudget = budget;

    for (const file of files) {
      const relevance = file.relevanceScore || 0;

      // User-provided files always included in full
      if (file.isUserProvided) {
        const tokens = file.tokenCount || this.estimateTokens(file.content);
        if (tokens <= remainingBudget) {
          result.push(file);
          remainingBudget -= tokens;
        }
        continue;
      }

      // Determine inclusion strategy based on relevance
      let strategy: SelectionStrategy;
      if (relevance >= AdaptiveSelector.HIGH_RELEVANCE_THRESHOLD) {
        strategy = "full";
      } else if (relevance >= AdaptiveSelector.LOW_RELEVANCE_THRESHOLD) {
        strategy = "summary";
      } else {
        strategy = "exclude";
      }

      // Apply strategy
      if (strategy === "full") {
        const tokens = file.tokenCount || this.estimateTokens(file.content);
        if (tokens <= remainingBudget) {
          result.push(file);
          remainingBudget -= tokens;
        } else if (relevance >= 0.5) {
          // If high relevance but doesn't fit, try summary instead
          strategy = "summary";
        }
      }

      if (strategy === "summary") {
        const summary = this.createFileSummary(file);
        const tokens = this.estimateTokens(summary);
        if (tokens <= remainingBudget) {
          result.push({
            ...file,
            content: summary,
            tokenCount: tokens,
          });
          remainingBudget -= tokens;
        }
      }

      // If strategy is "exclude", skip the file
    }

    return result;
  }

  /**
   * Select relevant conversation turns using semantic similarity
   *
   * Strategy:
   * - Always include recent turns (last N turns)
   * - Include older turns with high relevance to the task
   * - Preserve system messages
   *
   * @param turns - Conversation history
   * @param task - Task description
   * @param budget - Token budget for conversation history
   * @param minRecentTurns - Minimum number of recent turns to keep (default: 5)
   * @returns Selected conversation turns
   *
   * Requirements: 8.3, 8.4
   */
  selectRelevantTurns(
    turns: ConversationTurn[],
    task: string,
    budget: number,
    minRecentTurns: number = 5,
  ): ConversationTurn[] {
    if (turns.length === 0) {
      return [];
    }

    // Separate system messages from conversation
    const systemMessages = turns.filter((turn) => turn.role === "system");
    const conversationTurns = turns.filter((turn) => turn.role !== "system");

    // Sort conversation turns by timestamp (oldest first)
    const sortedTurns = [...conversationTurns].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    // Always include recent turns
    const recentCount = Math.min(minRecentTurns, sortedTurns.length);
    const recentTurns = sortedTurns.slice(-recentCount);
    const olderTurns = sortedTurns.slice(0, -recentCount);

    // Calculate budget used by system messages and recent turns
    let usedBudget = 0;
    for (const turn of [...systemMessages, ...recentTurns]) {
      usedBudget += turn.tokenCount || this.estimateTokens(turn.content);
    }

    let remainingBudget = budget - usedBudget;

    // Score older turns by relevance
    const scoredOlderTurns = olderTurns.map((turn) => {
      const relevance = this.calculateRelevance(turn.content, task);
      return { turn, score: relevance.score };
    });

    // Sort by relevance (highest first)
    scoredOlderTurns.sort((a, b) => b.score - a.score);

    // Include older turns that fit in budget and have sufficient relevance
    const selectedOlderTurns: ConversationTurn[] = [];
    for (const { turn, score } of scoredOlderTurns) {
      // Only include if relevance is above threshold
      if (score < AdaptiveSelector.LOW_RELEVANCE_THRESHOLD) {
        continue;
      }

      const tokens = turn.tokenCount || this.estimateTokens(turn.content);
      if (tokens <= remainingBudget) {
        selectedOlderTurns.push(turn);
        remainingBudget -= tokens;
      }
    }

    // Combine all selected turns and sort by timestamp
    const result = [...systemMessages, ...selectedOlderTurns, ...recentTurns];

    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Select most relevant context sections based on task and budget
   *
   * This is the main entry point that coordinates:
   * 1. File ranking and differential inclusion
   * 2. Conversation turn selection
   * 3. User content prioritization
   *
   * @param context - The context to select from
   * @param task - Description of the current task
   * @param budget - Maximum tokens allowed
   * @returns Context with only the most relevant sections
   *
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   */
  selectRelevant(context: Context, task: string, budget: number): Context {
    // Reserve budget for different sections
    // Priority: user instructions > files > conversation > skills
    const userInstructionsBudget = Math.floor(budget * 0.1); // 10%
    const filesBudget = Math.floor(budget * 0.5); // 50%
    const conversationBudget = Math.floor(budget * 0.3); // 30%
    const skillsBudget = Math.floor(budget * 0.1); // 10%

    // User instructions are always preserved (never modified)
    const selectedUserInstructions = context.userInstructions;

    // Calculate actual tokens used by user instructions
    let userInstructionsTokens = 0;
    for (const instruction of selectedUserInstructions) {
      userInstructionsTokens += this.estimateTokens(instruction);
    }

    // Adjust budgets if user instructions exceed their allocation
    let adjustedFilesBudget = filesBudget;
    let adjustedConversationBudget = conversationBudget;
    if (userInstructionsTokens > userInstructionsBudget) {
      const overflow = userInstructionsTokens - userInstructionsBudget;
      // Take from files and conversation proportionally
      adjustedFilesBudget = Math.max(0, filesBudget - overflow * 0.6);
      adjustedConversationBudget = Math.max(
        0,
        conversationBudget - overflow * 0.4,
      );
    }

    // Rank and select files
    const rankedFiles = this.rankFilesByRelevance(context.files, task);
    const selectedFiles = this.applyDifferentialInclusion(
      rankedFiles,
      adjustedFilesBudget,
    );

    // Select relevant conversation turns
    const selectedTurns = this.selectRelevantTurns(
      context.conversationHistory,
      task,
      adjustedConversationBudget,
    );

    // Select skills (simple: take as many as fit in budget)
    const selectedSkills = [];
    let skillsUsed = 0;
    for (const skill of context.skills) {
      const tokens = skill.tokenCount || this.estimateTokens(skill.content);
      if (skillsUsed + tokens <= skillsBudget) {
        selectedSkills.push(skill);
        skillsUsed += tokens;
      }
    }

    // Calculate total tokens
    let totalTokens = userInstructionsTokens;
    for (const file of selectedFiles) {
      totalTokens += file.tokenCount || this.estimateTokens(file.content);
    }
    for (const turn of selectedTurns) {
      totalTokens += turn.tokenCount || this.estimateTokens(turn.content);
    }
    for (const skill of selectedSkills) {
      totalTokens += skill.tokenCount || this.estimateTokens(skill.content);
    }

    return {
      userInstructions: selectedUserInstructions,
      conversationHistory: selectedTurns,
      files: selectedFiles,
      skills: selectedSkills,
      metadata: {
        ...context.metadata,
        totalTokens,
      },
    };
  }
}
