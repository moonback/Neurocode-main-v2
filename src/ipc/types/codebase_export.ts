/**
 * Types for codebase export functionality
 */

export interface CodebaseExportParams {
  appId: number;
  includeTests?: boolean;
  includeNodeModules?: boolean;
  includeDotFiles?: boolean;
  maxFileSize?: number; // in bytes
  outputPath?: string; // optional custom output path
}

export interface CodebaseExportResult {
  success: boolean;
  filePath: string;
  fileSize: number;
  filesIncluded: number;
  error?: string;
}

export interface FileEntry {
  path: string;
  content: string;
  language: string;
  size: number;
}
