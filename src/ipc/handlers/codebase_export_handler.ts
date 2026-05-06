/**
 * Codebase Export Handler
 * Exports entire codebase to a single LLM-optimized Markdown file
 */

import { IpcMainInvokeEvent, ipcMain } from "electron";
import { z } from "zod";
import path from "node:path";
import fs from "node:fs/promises";
import { glob } from "glob";
import log from "electron-log";
import { db } from "@/db";
import { apps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDyadAppPath } from "@/paths/paths";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import type {
  CodebaseExportParams,
  CodebaseExportResult,
  FileEntry,
} from "../types/codebase_export";

const logger = log.scope("codebase_export");

// Default patterns to ignore
const DEFAULT_IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/coverage/**",
  "**/.cache/**",
  "**/.vscode/**",
  "**/.idea/**",
  "**/tmp/**",
  "**/temp/**",
  "**/*.log",
  "**/.DS_Store",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/pnpm-lock.yaml",
];

// File extensions to include (code files)
const CODE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".scala",
  ".r",
  ".m",
  ".sql",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".html",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".vue",
  ".svelte",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".md",
  ".mdx",
  ".txt",
  ".env.example",
  ".gitignore",
  ".dockerignore",
  "Dockerfile",
  "Makefile",
  ".editorconfig",
  ".prettierrc",
  ".eslintrc",
];

// Language mapping for syntax highlighting
const LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "jsx",
  ".py": "python",
  ".java": "java",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".php": "php",
  ".swift": "swift",
  ".kt": "kotlin",
  ".scala": "scala",
  ".r": "r",
  ".m": "objective-c",
  ".sql": "sql",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "zsh",
  ".fish": "fish",
  ".ps1": "powershell",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".vue": "vue",
  ".svelte": "svelte",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".md": "markdown",
  ".mdx": "markdown",
  ".txt": "text",
  Dockerfile: "dockerfile",
  Makefile: "makefile",
};

/**
 * Get language for syntax highlighting based on file extension
 */
function getLanguage(filePath: string): string {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Check for special files without extension
  if (LANGUAGE_MAP[basename]) {
    return LANGUAGE_MAP[basename];
  }

  return LANGUAGE_MAP[ext] || "text";
}

/**
 * Check if file should be included based on extension
 */
function shouldIncludeFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Include special files
  if (
    basename === "Dockerfile" ||
    basename === "Makefile" ||
    basename.startsWith(".env.example")
  ) {
    return true;
  }

  return CODE_EXTENSIONS.includes(ext);
}

/**
 * Collect all files from the codebase
 */
async function collectFiles(
  appPath: string,
  options: CodebaseExportParams,
): Promise<FileEntry[]> {
  logger.info("📂 Collecting files from codebase", { appPath });

  const ignorePatterns = [...DEFAULT_IGNORE_PATTERNS];

  // Add additional ignore patterns based on options
  if (!options.includeTests) {
    ignorePatterns.push(
      "**/__tests__/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.test.js",
      "**/*.test.jsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/*.spec.js",
      "**/*.spec.jsx",
      "**/tests/**",
      "**/test/**",
    );
  }

  if (!options.includeDotFiles) {
    ignorePatterns.push("**/.*");
  }

  // Find all files
  const files = await glob("**/*", {
    cwd: appPath,
    ignore: ignorePatterns,
    nodir: true,
    dot: options.includeDotFiles,
  });

  logger.info(`📊 Found ${files.length} files`);

  const fileEntries: FileEntry[] = [];
  const maxFileSize = options.maxFileSize || 1024 * 1024; // 1MB default

  for (const file of files) {
    const filePath = path.join(appPath, file);

    // Check if file should be included
    if (!shouldIncludeFile(file)) {
      continue;
    }

    try {
      const stats = await fs.stat(filePath);

      // Skip files that are too large
      if (stats.size > maxFileSize) {
        logger.warn(`⚠️ Skipping large file: ${file} (${stats.size} bytes)`);
        continue;
      }

      // Read file content
      const content = await fs.readFile(filePath, "utf-8");

      fileEntries.push({
        path: file,
        content,
        language: getLanguage(file),
        size: stats.size,
      });
    } catch (error) {
      logger.warn(`⚠️ Error reading file ${file}:`, error);
      // Skip files that can't be read
      continue;
    }
  }

  logger.info(`✅ Collected ${fileEntries.length} files`);

  return fileEntries;
}

/**
 * Generate Markdown content from file entries
 */
function generateMarkdown(
  fileEntries: FileEntry[],
  appName: string,
  appPath: string,
): string {
  const timestamp = new Date().toISOString();
  const totalSize = fileEntries.reduce((sum, file) => sum + file.size, 0);

  let markdown = `# Codebase Export: ${appName}

**Generated:** ${timestamp}  
**Path:** \`${appPath}\`  
**Files:** ${fileEntries.length}  
**Total Size:** ${(totalSize / 1024).toFixed(2)} KB

---

## Table of Contents

`;

  // Generate table of contents
  fileEntries.forEach((file, index) => {
    markdown += `${index + 1}. [${file.path}](#file-${index + 1})\n`;
  });

  markdown += "\n---\n\n";

  // Add each file
  fileEntries.forEach((file, index) => {
    markdown += `## File ${index + 1}: \`${file.path}\` {#file-${index + 1}}\n\n`;
    markdown += `**Language:** ${file.language}  \n`;
    markdown += `**Size:** ${file.size} bytes\n\n`;
    markdown += "```" + file.language + "\n";
    markdown += file.content;
    markdown += "\n```\n\n";
    markdown += "---\n\n";
  });

  // Add footer
  markdown += `## Export Summary

- **Total Files:** ${fileEntries.length}
- **Total Size:** ${(totalSize / 1024).toFixed(2)} KB
- **Generated:** ${timestamp}

---

*This file was automatically generated for LLM consumption. It contains the complete codebase in a single, structured Markdown document.*
`;

  return markdown;
}

/**
 * Export codebase to Markdown file
 */
export async function exportCodebase(
  event: IpcMainInvokeEvent,
  params: CodebaseExportParams,
): Promise<CodebaseExportResult> {
  logger.info("🚀 Starting codebase export", { appId: params.appId });

  try {
    // Get app from database
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, params.appId),
    });

    if (!app) {
      throw new DyadError(
        `App not found: ${params.appId}`,
        DyadErrorKind.NotFound,
      );
    }

    const appPath = getDyadAppPath(app.path);
    logger.info("📁 App path resolved", { appPath });

    // Collect files
    const fileEntries = await collectFiles(appPath, params);

    if (fileEntries.length === 0) {
      throw new DyadError("No files found to export", DyadErrorKind.Validation);
    }

    // Generate Markdown
    logger.info("📝 Generating Markdown");
    const markdown = generateMarkdown(fileEntries, app.name, appPath);

    // Determine output path
    const outputPath =
      params.outputPath ||
      path.join(appPath, `codebase-export-${Date.now()}.md`);

    // Write to file
    logger.info("💾 Writing to file", { outputPath });
    await fs.writeFile(outputPath, markdown, "utf-8");

    const stats = await fs.stat(outputPath);

    logger.info("✅ Codebase export completed", {
      outputPath,
      fileSize: stats.size,
      filesIncluded: fileEntries.length,
    });

    return {
      success: true,
      filePath: outputPath,
      fileSize: stats.size,
      filesIncluded: fileEntries.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Codebase export failed", { error: errorMessage });

    if (error instanceof DyadError) {
      throw error;
    }

    throw new DyadError(
      `Failed to export codebase: ${errorMessage}`,
      DyadErrorKind.External,
    );
  }
}

/**
 * Register codebase export handlers
 */
export function registerCodebaseExportHandlers() {
  ipcMain.handle(
    "codebase:export",
    async (event: IpcMainInvokeEvent, rawParams: unknown) => {
      // Validate params
      const paramsSchema = z.object({
        appId: z.number(),
        includeTests: z.boolean().optional(),
        includeNodeModules: z.boolean().optional(),
        includeDotFiles: z.boolean().optional(),
        maxFileSize: z.number().optional(),
        outputPath: z.string().optional(),
      });

      const parsed = paramsSchema.safeParse(rawParams);
      if (!parsed.success) {
        const errorMessage = parsed.error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ");
        throw new DyadError(
          `[codebase:export] Invalid input: ${errorMessage}`,
          DyadErrorKind.Validation,
        );
      }

      return exportCodebase(event, parsed.data);
    },
  );
  logger.info("✅ Codebase export handlers registered");
}
