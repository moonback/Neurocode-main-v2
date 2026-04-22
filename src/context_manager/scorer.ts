import * as path from "path";
import type { ScoredFile, ScorerInput } from "./types";

/**
 * Extracts exported symbol names from file content using regex.
 * Matches: export function/class/const/interface/type/enum <Name>
 */
function extractExportedSymbols(content: string): Set<string> {
  const symbols = new Set<string>();
  const regex =
    /export\s+(?:default\s+)?(?:function|class|const|interface|type|enum)\s+(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    symbols.add(match[1].toLowerCase());
  }
  return symbols;
}

/**
 * Tokenizes text by splitting on non-word characters and lowercasing.
 */
function tokenize(text: string): Set<string> {
  const tokens = text
    .split(/\W+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 0);
  return new Set(tokens);
}

/**
 * Computes Jaccard similarity between two sets.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

/**
 * Computes the import factor: 1.0 if the candidate is directly imported by
 * or imports the active file, else 0.0.
 */
function computeImportFactor(
  candidatePath: string,
  importedPaths: Set<string>,
  importingPaths: Set<string>,
): number {
  return importedPaths.has(candidatePath) || importingPaths.has(candidatePath)
    ? 1.0
    : 0.0;
}

/**
 * Computes the symbol overlap factor using Jaccard similarity between
 * exported symbols in the candidate and tokens in the request text.
 */
function computeSymbolFactor(content: string, requestText: string): number {
  const exportedSymbols = extractExportedSymbols(content);
  const requestTokens = tokenize(requestText);
  return jaccardSimilarity(exportedSymbols, requestTokens);
}

/**
 * Computes the path proximity factor:
 * - 1.0 if same directory
 * - 0.5 if sibling directory (same parent)
 * - 0.0 otherwise
 */
function computeProximityFactor(
  candidatePath: string,
  activeFilePath: string | null,
): number {
  if (!activeFilePath) return 0.0;

  const candidateDir = path.dirname(candidatePath);
  const activeDir = path.dirname(activeFilePath);

  if (candidateDir === activeDir) return 1.0;

  // Sibling: same parent directory
  const candidateParent = path.dirname(candidateDir);
  const activeParent = path.dirname(activeDir);
  if (candidateParent === activeParent && candidateParent !== ".") return 0.5;

  return 0.0;
}

/**
 * Computes the recency factor: 1 - (age_days / 30), clamped to [0, 1].
 */
function computeRecencyFactor(mtime: number, now: number): number {
  const ageDays = (now - mtime) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - ageDays / 30);
}

/**
 * Scores a candidate file based on four weighted factors:
 * - Import relationship (0.40)
 * - Symbol overlap (0.30)
 * - Path proximity (0.20)
 * - Recency (0.10)
 *
 * Returns a ScoredFile with relevanceScore clamped to [0.0, 1.0].
 * Pure function — no I/O or side effects.
 */
export function scoreFile(input: ScorerInput): ScoredFile {
  const {
    candidate,
    activeFilePath,
    requestText,
    importedPaths,
    importingPaths,
    now,
  } = input;

  const importFactor = activeFilePath
    ? computeImportFactor(candidate.path, importedPaths, importingPaths)
    : 0.0;

  const symbolFactor = computeSymbolFactor(candidate.content, requestText);

  const proximityFactor = computeProximityFactor(
    candidate.path,
    activeFilePath,
  );

  const recencyFactor = computeRecencyFactor(candidate.mtime, now);

  const rawScore =
    importFactor * 0.4 +
    symbolFactor * 0.3 +
    proximityFactor * 0.2 +
    recencyFactor * 0.1;

  const relevanceScore = Math.min(1.0, Math.max(0.0, rawScore));

  return {
    ...candidate,
    relevanceScore,
  };
}
