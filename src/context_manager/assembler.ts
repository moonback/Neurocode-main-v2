import type {
  AssembledContext,
  AssemblerOptions,
  IncludedFileRecord,
  ScoredFile,
} from "./types";

// Strategy configuration: [minScore, budgetCapPercent]
const STRATEGY_CONFIG = {
  conservative: { minScore: 0.7, budgetCap: 0.25 },
  balanced: { minScore: 0.4, budgetCap: 0.5 },
  deep: { minScore: 0.1, budgetCap: 0.8 },
} as const;

// Score below which files are truncated to top-level declarations
const TRUNCATION_SCORE_THRESHOLD = 0.3;

// Regex patterns for top-level declaration lines
const TOP_LEVEL_DECLARATION_RE =
  /^(?:export\s+(?:default\s+)?(?:async\s+)?(?:function|class|abstract\s+class|interface|type|enum|const)|(?:async\s+)?function|class|interface|type|enum)\b/;

/**
 * Estimates token count from string content.
 * Approximation: 1 token ≈ 4 characters.
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

/**
 * Extracts top-level declarations from file content.
 * Returns the filtered content with omission markers inserted for removed sections.
 */
function extractTopLevelDeclarations(content: string): string {
  const lines = content.split("\n");
  const resultLines: string[] = [];
  let omittedCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Keep top-level declarations
    if (
      TOP_LEVEL_DECLARATION_RE.test(trimmed) ||
      trimmed === "}" ||
      trimmed === "};"
    ) {
      if (omittedCount > 0) {
        resultLines.push(`// [dyad: content omitted — ${omittedCount} lines]`);
        omittedCount = 0;
      }
      resultLines.push(line);
    } else {
      omittedCount++;
    }
  }

  // Flush any trailing omitted lines
  if (omittedCount > 0) {
    resultLines.push(`// [dyad: content omitted — ${omittedCount} lines]`);
  }

  return resultLines.join("\n");
}

/**
 * Truncates file content to fit within a token budget.
 * Keeps as many lines as possible from the top, then inserts an omission marker.
 */
function truncateToTokenBudget(content: string, maxTokens: number): string {
  if (estimateTokens(content) <= maxTokens) return content;

  const lines = content.split("\n");
  const resultLines: string[] = [];
  let tokensUsed = 0;

  for (const line of lines) {
    const lineTokens = estimateTokens(line + "\n");
    if (tokensUsed + lineTokens > maxTokens) {
      const remaining = lines.length - resultLines.length;
      if (remaining > 0) {
        resultLines.push(`// [dyad: content omitted — ${remaining} lines]`);
      }
      break;
    }
    resultLines.push(line);
    tokensUsed += lineTokens;
  }

  return resultLines.join("\n");
}

/**
 * Formats a single file for inclusion in the assembled context.
 */
function formatFile(path: string, content: string): string {
  return `<dyad-file path="${path}">\n${content}\n</dyad-file>\n\n`;
}

/**
 * Assembles context from scored files according to the given strategy.
 *
 * Pure function — no I/O or side effects.
 */
export function assembleContext(options: AssemblerOptions): AssembledContext {
  const { scoredFiles, strategy, tokenBudget, activeFilePath } = options;

  const config = STRATEGY_CONFIG[strategy] ?? STRATEGY_CONFIG.balanced;
  const effectiveBudget = Math.floor(tokenBudget * config.budgetCap);

  // Filter by strategy threshold; conservative always includes the active file.
  // deep uses strict > 0.1; conservative and balanced use >= threshold.
  const filtered: ScoredFile[] = scoredFiles.filter((f) => {
    if (strategy === "conservative" && f.path === activeFilePath) return true;
    if (strategy === "deep") return f.relevanceScore > config.minScore;
    return f.relevanceScore >= config.minScore;
  });

  // Sort descending by score, ties broken by mtime descending
  const sorted = [...filtered].sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return b.mtime - a.mtime;
  });

  const includedFiles: IncludedFileRecord[] = [];
  const formattedParts: string[] = [];
  let totalTokensUsed = 0;

  for (const file of sorted) {
    if (totalTokensUsed >= effectiveBudget) break;

    const remainingBudget = effectiveBudget - totalTokensUsed;

    // Determine if this file needs score-based truncation
    const needsScoreTruncation =
      file.relevanceScore < TRUNCATION_SCORE_THRESHOLD;

    let content = needsScoreTruncation
      ? extractTopLevelDeclarations(file.content)
      : file.content;

    // Check if content fits in remaining budget; if not, truncate to fit
    const contentTokens = estimateTokens(content);
    let wasTruncated = needsScoreTruncation;

    if (contentTokens > remainingBudget) {
      content = truncateToTokenBudget(content, remainingBudget);
      wasTruncated = true;
    }

    const tokensUsed = estimateTokens(content);

    // Skip if we can't fit even a minimal representation
    if (tokensUsed > effectiveBudget) break;

    const formatted = formatFile(file.path, content);
    const formattedTokens = estimateTokens(formatted);

    // Re-check with wrapper overhead
    if (totalTokensUsed + formattedTokens > effectiveBudget) {
      // Try to fit with tighter truncation
      const wrapperOverhead = formattedTokens - tokensUsed;
      const tighterBudget = remainingBudget - wrapperOverhead;
      if (tighterBudget <= 0) break;

      content = truncateToTokenBudget(content, tighterBudget);
      wasTruncated = true;
      const finalFormatted = formatFile(file.path, content);
      const finalTokens = estimateTokens(finalFormatted);

      if (totalTokensUsed + finalTokens > effectiveBudget) break;

      formattedParts.push(finalFormatted);
      totalTokensUsed += finalTokens;
    } else {
      formattedParts.push(formatted);
      totalTokensUsed += formattedTokens;
    }

    includedFiles.push({
      path: file.path,
      relevanceScore: file.relevanceScore,
      tokensUsed: estimateTokens(content),
      wasTruncated,
    });
  }

  return {
    formattedOutput: formattedParts.join(""),
    includedFiles,
    totalTokensUsed,
  };
}
