import type { Skill, MatchedSkill } from "./types";

// ---------------------------------------------------------------------------
// Stop words
// ---------------------------------------------------------------------------

/**
 * Common English stop words excluded from keyword extraction.
 * Removing these improves matching signal-to-noise ratio significantly.
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
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
  "up",
  "about",
  "into",
  "through",
  "during",
  "is",
  "are",
  "was",
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
  "could",
  "should",
  "may",
  "might",
  "can",
  "that",
  "which",
  "who",
  "this",
  "these",
  "those",
  "it",
  "its",
  "i",
  "my",
  "me",
  "we",
  "our",
  "you",
  "your",
  "he",
  "she",
  "they",
  "them",
  "what",
  "when",
  "where",
  "how",
  "why",
  "all",
  "any",
  "some",
  "not",
  "so",
  "if",
  "then",
  "than",
  "also",
  "just",
  "only",
  "very",
  "more",
  "as",
  "use",
  "using",
  "used",
  "run",
  "running",
  "make",
  "making",
  "get",
  "getting",
  "need",
  "want",
  "please",
  "help",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Configuration for the context matching algorithm.
 */
export interface ContextMatcherOptions {
  /**
   * Minimum relevance score [0, 1] for a skill to be included in results.
   * @default 0.1
   */
  threshold?: number;
  /**
   * Maximum number of results to return. `0` means no limit.
   * @default 0
   */
  maxResults?: number;
  /**
   * Whether to boost skills whose name appears literally in the context.
   * @default true
   */
  boostNameMatch?: boolean;
}

// ---------------------------------------------------------------------------
// ContextMatcher
// ---------------------------------------------------------------------------

/**
 * Matches a user context string against a set of registered skills and
 * returns ranked, threshold-filtered suggestions.
 *
 * **Algorithm overview**
 *
 * 1. Extract meaningful tokens from the context (lower-case, stop-word filtered,
 *    de-duped).
 * 2. For each skill, extract tokens from its name and description.
 * 3. Compute a **term-frequency intersection score**:
 *    `score = overlapping_tokens / context_tokens`
 * 4. Apply a **name-match boost** (×1.5) when the skill name (or namespace)
 *    appears verbatim in the context.
 * 5. Clamp the final score to [0, 1].
 * 6. Filter by `threshold`, sort descending, cap at `maxResults`.
 *
 * @example
 * ```ts
 * const matcher = new ContextMatcher();
 * const matches = matcher.match("I need to run linting checks before committing", skills);
 * // → [{ skill: lintSkill, relevance: 0.67, reason: "Matched 2/3 keywords…" }]
 * ```
 */
export class ContextMatcher {
  private readonly threshold: number;
  private readonly maxResults: number;
  private readonly boostNameMatch: boolean;

  constructor(options: ContextMatcherOptions = {}) {
    this.threshold = options.threshold ?? 0.1;
    this.maxResults = options.maxResults ?? 0;
    this.boostNameMatch = options.boostNameMatch ?? true;
  }

  // ── public API ────────────────────────────────────────────────────────────

  /**
   * Match a user context string against a list of skills.
   *
   * @param context - The user's message or current task description.
   * @param skills  - The pool of skills to match against.
   * @returns Matched skills sorted by relevance (highest first), filtered by
   *          the configured threshold, and capped at `maxResults`.
   */
  match(context: string, skills: Skill[]): MatchedSkill[] {
    if (!context || !context.trim() || skills.length === 0) {
      return [];
    }

    const contextTokens = this.extractTokens(context);
    if (contextTokens.size === 0) {
      return [];
    }

    const contextLower = context.toLowerCase();
    const results: MatchedSkill[] = [];

    for (const skill of skills) {
      const scored = this.scoreSkill(skill, contextTokens, contextLower);
      if (scored.relevance >= this.threshold) {
        results.push(scored);
      }
    }

    // Sort by relevance descending, then alphabetically by name for stability
    results.sort((a, b) =>
      b.relevance !== a.relevance
        ? b.relevance - a.relevance
        : a.skill.name.localeCompare(b.skill.name),
    );

    return this.maxResults > 0 ? results.slice(0, this.maxResults) : results;
  }

  // ── private helpers ───────────────────────────────────────────────────────

  /**
   * Score a single skill against the pre-computed context tokens.
   */
  private scoreSkill(
    skill: Skill,
    contextTokens: Set<string>,
    contextLower: string,
  ): MatchedSkill {
    // Build a combined token set from name + description
    const skillSource = `${skill.name} ${skill.description}`;
    const skillTokens = this.extractTokens(skillSource);

    // Intersection: tokens present in both context and skill
    const matched: string[] = [];
    for (const token of contextTokens) {
      if (skillTokens.has(token)) {
        matched.push(token);
      }
    }

    // Base score: fraction of context tokens that appear in the skill
    let score =
      contextTokens.size > 0 ? matched.length / contextTokens.size : 0;

    // Name-match boost: literal skill name / namespace present in the context
    if (this.boostNameMatch) {
      const nameLower = skill.name.toLowerCase();
      const namespaceLower = skill.namespace?.toLowerCase();
      if (
        contextLower.includes(nameLower) ||
        (namespaceLower && contextLower.includes(namespaceLower))
      ) {
        score *= 1.5;
      }
    }

    // Clamp to [0, 1]
    const relevance = Math.min(1, score);

    const reason = this.buildReason(matched, contextTokens.size, skill.name);

    return { skill, relevance, reason };
  }

  /**
   * Extract a de-duplicated, stop-word-filtered token set from a string.
   * Tokens are lower-cased and must be at least 2 characters long.
   */
  extractTokens(text: string): Set<string> {
    const tokens = new Set<string>();
    // Split on whitespace and non-alphanumeric chars (keep hyphens inside words)
    const words = text
      .toLowerCase()
      .split(/[\s,.:;!?()[\]{}"'`|/\\@#$%^&*+=<>~]+/)
      .filter(Boolean);

    for (const word of words) {
      // Strip leading/trailing hyphens
      const clean = word.replace(/^-+|-+$/g, "");
      if (clean.length >= 2 && !STOP_WORDS.has(clean)) {
        tokens.add(clean);
      }
    }
    return tokens;
  }

  /**
   * Build a human-readable reason string for a match result.
   */
  private buildReason(
    matchedTokens: string[],
    contextSize: number,
    skillName: string,
  ): string {
    if (matchedTokens.length === 0) {
      return `Skill "${skillName}" matched via name boost`;
    }
    const preview =
      matchedTokens.length <= 3
        ? matchedTokens.join(", ")
        : `${matchedTokens.slice(0, 3).join(", ")} and ${matchedTokens.length - 3} more`;
    return `Matched ${matchedTokens.length}/${contextSize} keywords: ${preview}`;
  }
}

/**
 * Default singleton instance with standard configuration.
 */
export const contextMatcher = new ContextMatcher();
