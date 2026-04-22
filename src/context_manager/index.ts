import { v4 as uuidv4 } from "uuid";
import log from "electron-log";
import * as path from "path";
import { readSettings } from "@/main/settings";
import { readFileWithCache } from "../utils/codebase";
import { selectCandidateFiles } from "./file_selector";
import { scoreFile } from "./scorer";
import { assembleContext } from "./assembler";
import { ObservabilityStore } from "./observability_store";
import type {
  FileSelectorOptions,
  AssembledContext,
  ScoredFile,
  CandidateFile,
} from "./types";
import type {
  SmartContextMode,
  ContextObservabilityRecord,
} from "../lib/schemas";

const logger = log.scope("context_manager");

/**
 * Singleton ObservabilityStore instance for the main process.
 */
let observabilityStoreInstance: ObservabilityStore | null = null;

/**
 * Gets or creates the singleton ObservabilityStore instance.
 */
export function getObservabilityStore(): ObservabilityStore {
  if (!observabilityStoreInstance) {
    observabilityStoreInstance = new ObservabilityStore();
  }
  return observabilityStoreInstance;
}

/**
 * Parse static import/require statements from file content.
 * Returns an array of raw specifier strings (may be relative or absolute).
 */
function parseImportSpecifiers(content: string): string[] {
  const specifiers: string[] = [];

  // ES module: import ... from '...' or import '...'
  const importRegex = /import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    specifiers.push(match[1]);
  }

  // CommonJS: require('...')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

/**
 * Resolve an import specifier relative to the importing file's directory.
 * Returns the resolved absolute path (without extension) or null if not relative.
 */
function resolveRelativeSpecifier(
  specifier: string,
  importingFileDir: string,
): string | null {
  if (!specifier.startsWith(".")) return null;
  return path.resolve(importingFileDir, specifier);
}

/**
 * Given a resolved path (possibly without extension), find the matching
 * absolute path from the workspace file list.
 */
function findMatchingFile(
  resolvedBase: string,
  allFiles: string[],
): string | null {
  // Exact match first
  if (allFiles.includes(resolvedBase)) return resolvedBase;

  // Try common extensions
  const extensions = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".mts",
    ".cts",
  ];
  for (const ext of extensions) {
    const candidate = resolvedBase + ext;
    if (allFiles.includes(candidate)) return candidate;
  }

  // Try index files
  for (const ext of extensions) {
    const candidate = path.join(resolvedBase, `index${ext}`);
    if (allFiles.includes(candidate)) return candidate;
  }

  return null;
}

/**
 * Build import relationship sets for the active file.
 * Returns { importedPaths, importingPaths } where paths are relative to appPath.
 */
async function buildImportRelationships(
  appPath: string,
  activeFilePath: string | null,
  candidates: CandidateFile[],
): Promise<{ importedPaths: Set<string>; importingPaths: Set<string> }> {
  const importedPaths = new Set<string>();
  const importingPaths = new Set<string>();

  if (!activeFilePath) {
    return { importedPaths, importingPaths };
  }

  const absoluteActiveFile = path.isAbsolute(activeFilePath)
    ? activeFilePath
    : path.resolve(appPath, activeFilePath);

  // Build a map of absolute paths for quick lookup
  const absolutePathMap = new Map<string, string>();
  for (const candidate of candidates) {
    const absolutePath = path.resolve(appPath, candidate.path);
    absolutePathMap.set(absolutePath, candidate.path);
  }

  const allAbsolutePaths = Array.from(absolutePathMap.keys());

  // Find files imported by the active file
  try {
    const activeContent = await readFileWithCache(absoluteActiveFile);
    if (activeContent) {
      const specifiers = parseImportSpecifiers(activeContent);
      const activeDir = path.dirname(absoluteActiveFile);

      for (const specifier of specifiers) {
        const resolvedBase = resolveRelativeSpecifier(specifier, activeDir);
        if (resolvedBase) {
          const matched = findMatchingFile(resolvedBase, allAbsolutePaths);
          if (matched) {
            const relativePath = absolutePathMap.get(matched);
            if (relativePath) {
              importedPaths.add(relativePath);
            }
          }
        }
      }
    }
  } catch (error) {
    logger.warn(
      `Could not read active file for import analysis: ${absoluteActiveFile}`,
      error,
    );
  }

  // Find files that import the active file
  for (const candidate of candidates) {
    try {
      const specifiers = parseImportSpecifiers(candidate.content);
      const candidateAbsolutePath = path.resolve(appPath, candidate.path);
      const candidateDir = path.dirname(candidateAbsolutePath);

      for (const specifier of specifiers) {
        const resolvedBase = resolveRelativeSpecifier(specifier, candidateDir);
        if (resolvedBase) {
          const matched = findMatchingFile(resolvedBase, allAbsolutePaths);
          if (matched === absoluteActiveFile) {
            importingPaths.add(candidate.path);
            break;
          }
        }
      }
    } catch {
      // Skip files we can't parse
      continue;
    }
  }

  return { importedPaths, importingPaths };
}

/**
 * Options for the Context Manager.
 */
export interface ContextManagerOptions extends FileSelectorOptions {
  strategy?: SmartContextMode;
  tokenBudget: number;
}

/**
 * Result from the Context Manager, including the assembled context and interaction ID.
 */
export interface ContextManagerResult extends AssembledContext {
  interactionId: string;
}

/**
 * Main Context Manager orchestrator.
 * Composes File_Selector → Scorer → Assembler → ObservabilityStore.
 *
 * @param options - Configuration including file selector options, strategy, and token budget
 * @returns AssembledContext with interactionId, and records observability data
 */
export async function runContextManager(
  options: ContextManagerOptions,
): Promise<ContextManagerResult> {
  const startTime = Date.now();
  const interactionId = uuidv4();

  // Read settings to get the active strategy if not provided
  const settings = readSettings();
  const strategy =
    options.strategy ?? settings.proSmartContextOption ?? "balanced";

  logger.info(
    `Context Manager starting for interaction ${interactionId} with strategy: ${strategy}`,
  );

  try {
    // Step 1: File Selection
    logger.debug("Step 1: Selecting candidate files");
    const candidates = await selectCandidateFiles(options);
    logger.debug(`Selected ${candidates.length} candidate files`);

    if (candidates.length === 0) {
      logger.warn("No candidate files selected");
      const emptyResult: ContextManagerResult = {
        interactionId,
        formattedOutput: "",
        includedFiles: [],
        totalTokensUsed: 0,
      };

      // Record empty result
      const observabilityRecord: ContextObservabilityRecord = {
        interactionId,
        timestamp: Date.now(),
        includedFiles: [],
        totalTokensUsed: 0,
        strategy,
      };
      getObservabilityStore().record(observabilityRecord);

      return emptyResult;
    }

    // Step 2: Build import relationships for scoring
    logger.debug("Step 2: Building import relationships");
    const { importedPaths, importingPaths } = await buildImportRelationships(
      options.appPath,
      options.activeFilePath,
      candidates,
    );
    logger.debug(
      `Found ${importedPaths.size} imported paths, ${importingPaths.size} importing paths`,
    );

    // Step 3: Score all candidate files
    logger.debug("Step 3: Scoring candidate files");
    const now = Date.now();
    const scoredFiles: ScoredFile[] = candidates.map((candidate) =>
      scoreFile({
        candidate,
        activeFilePath: options.activeFilePath,
        requestText: options.requestText,
        importedPaths,
        importingPaths,
        now,
      }),
    );
    logger.debug(`Scored ${scoredFiles.length} files`);

    // Step 4: Assemble context
    logger.debug("Step 4: Assembling context");
    const assembled = assembleContext({
      scoredFiles,
      strategy,
      tokenBudget: options.tokenBudget,
      activeFilePath: options.activeFilePath,
    });
    logger.debug(
      `Assembled context with ${assembled.includedFiles.length} files, ${assembled.totalTokensUsed} tokens`,
    );

    // Step 5: Record observability data
    const observabilityRecord: ContextObservabilityRecord = {
      interactionId,
      timestamp: now,
      includedFiles: assembled.includedFiles,
      totalTokensUsed: assembled.totalTokensUsed,
      strategy,
    };
    getObservabilityStore().record(observabilityRecord);

    const duration = Date.now() - startTime;
    logger.info(
      `Context Manager completed in ${duration}ms: ${assembled.includedFiles.length} files, ${assembled.totalTokensUsed} tokens`,
    );

    return {
      ...assembled,
      interactionId,
    };
  } catch (error) {
    logger.error(
      `Context Manager failed for interaction ${interactionId}:`,
      error,
    );

    // Record error state
    const errorRecord: ContextObservabilityRecord = {
      interactionId,
      timestamp: Date.now(),
      includedFiles: [],
      totalTokensUsed: 0,
      strategy,
    };
    getObservabilityStore().record(errorRecord);

    // Return empty context on error
    return {
      interactionId,
      formattedOutput: "",
      includedFiles: [],
      totalTokensUsed: 0,
    };
  }
}
