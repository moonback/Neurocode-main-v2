import { AppChatContext, SmartContextMode } from "../lib/schemas";

export interface CandidateFile {
  path: string; // relative path from appPath
  content: string; // raw file content
  mtime: number; // last modification timestamp (ms)
  sizeTokens: number; // estimated token count for full content
}

export interface ScoredFile extends CandidateFile {
  relevanceScore: number; // 0.0–1.0
}

export interface ScorerInput {
  candidate: CandidateFile;
  activeFilePath: string | null;
  requestText: string;
  importedPaths: Set<string>; // paths directly imported by active file
  importingPaths: Set<string>; // paths that import the active file
  now: number; // current timestamp for recency calculation
}

export interface AssemblerOptions {
  scoredFiles: ScoredFile[];
  strategy: SmartContextMode; // "conservative" | "balanced" | "deep"
  tokenBudget: number;
  activeFilePath: string | null;
}

export interface AssembledContext {
  formattedOutput: string;
  includedFiles: IncludedFileRecord[];
  totalTokensUsed: number;
}

export interface IncludedFileRecord {
  path: string;
  relevanceScore: number;
  tokensUsed: number;
  wasTruncated: boolean;
}

export interface FileSelectorOptions {
  appPath: string;
  activeFilePath: string | null;
  requestText: string;
  chatContext: AppChatContext;
}
