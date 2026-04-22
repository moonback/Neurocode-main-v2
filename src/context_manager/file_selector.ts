import fsAsync from "node:fs/promises";
import * as path from "path";
import log from "electron-log";
import { readSettings } from "@/main/settings";
import {
  collectFilesNativeGit,
  collectFilesIsoGit,
  readFileWithCache,
} from "../utils/codebase";
import type { CandidateFile, FileSelectorOptions } from "./types";

const logger = log.scope("context_manager/file_selector");

/**
 * Estimate token count for a string (rough approximation: 1 token ≈ 4 chars).
 */
function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
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
 * Tokenize text into a set of lowercase words (length >= 2).
 */
function tokenizeText(text: string): Set<string> {
  const tokens = text
    .split(/\W+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 2);
  return new Set(tokens);
}

/**
 * Extract exported symbol names from file content.
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
 * Determines whether a file matches a set of keywords by checking:
 * 1. Whether any keyword appears in the file's path (basename or directory segments)
 * 2. Whether any keyword matches an exported symbol in the file's content
 *
 * Exported for testability (used in property tests).
 */
export function matchesByKeyword(
  filePath: string,
  content: string,
  keywords: Set<string>,
): boolean {
  if (keywords.size === 0) return false;

  // Check file path segments (basename without extension, directory names)
  const basename = path
    .basename(filePath, path.extname(filePath))
    .toLowerCase();
  const dirSegments = path
    .dirname(filePath)
    .split(/[/\\]/)
    .map((s) => s.toLowerCase())
    .filter((s) => s.length >= 2);

  const pathTokens = new Set([basename, ...dirSegments]);

  for (const keyword of keywords) {
    if (pathTokens.has(keyword)) return true;
    // Also check if keyword is a substring of the basename
    if (basename.includes(keyword)) return true;
  }

  // Check exported symbols
  const symbols = extractExportedSymbols(content);
  for (const keyword of keywords) {
    if (symbols.has(keyword)) return true;
  }

  return false;
}

/**
 * Selects candidate files from the workspace for context assembly.
 *
 * Strategy:
 * 1. Collect all workspace files via git utilities.
 * 2. If activeFilePath is set, parse its imports to find directly related files.
 * 3. If no activeFilePath, use keyword/symbol matching against requestText.
 * 4. Return all files as CandidateFile[] (scoring happens in the Scorer).
 * 5. Skip unreadable files silently.
 */
export async function selectCandidateFiles(
  options: FileSelectorOptions,
): Promise<CandidateFile[]> {
  const { appPath, activeFilePath, requestText } = options;

  // Step 1: Collect all workspace files
  const settings = readSettings();
  let absolutePaths: string[];
  try {
    absolutePaths = settings.enableNativeGit
      ? await collectFilesNativeGit(appPath)
      : await collectFilesIsoGit(appPath, appPath);
  } catch (error) {
    logger.error("Failed to collect workspace files:", error);
    absolutePaths = [];
  }

  // Step 2: Determine import-related paths if activeFilePath is set
  const importedAbsolutePaths = new Set<string>();

  if (activeFilePath) {
    const absoluteActiveFile = path.isAbsolute(activeFilePath)
      ? activeFilePath
      : path.resolve(appPath, activeFilePath);

    try {
      const activeContent = await readFileWithCache(absoluteActiveFile);
      if (activeContent) {
        const specifiers = parseImportSpecifiers(activeContent);
        const activeDir = path.dirname(absoluteActiveFile);

        for (const specifier of specifiers) {
          const resolvedBase = resolveRelativeSpecifier(specifier, activeDir);
          if (resolvedBase) {
            const matched = findMatchingFile(resolvedBase, absolutePaths);
            if (matched) {
              importedAbsolutePaths.add(matched);
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
  }

  // Step 3: Build keyword set for fallback matching (no active file)
  const keywords = activeFilePath
    ? new Set<string>()
    : tokenizeText(requestText);

  // Step 4: Read all files and build CandidateFile[]
  const candidates: CandidateFile[] = [];

  await Promise.all(
    absolutePaths.map(async (absolutePath) => {
      try {
        const stats = await fsAsync.stat(absolutePath);
        const mtime = stats.mtimeMs;

        const content = await readFileWithCache(absolutePath);
        if (content === undefined) {
          // Unreadable — skip silently
          return;
        }

        const relativePath = path
          .relative(appPath, absolutePath)
          .split(path.sep)
          .join("/");

        const sizeTokens = estimateTokens(content);

        // When no active file, filter by keyword matching
        if (!activeFilePath && keywords.size > 0) {
          if (!matchesByKeyword(relativePath, content, keywords)) {
            return;
          }
        }

        candidates.push({
          path: relativePath,
          content,
          mtime,
          sizeTokens,
        });
      } catch (error) {
        // Skip unreadable files (binary, permission denied, etc.)
        logger.warn(`Skipping unreadable file: ${absolutePath}`, error);
      }
    }),
  );

  return candidates;
}
