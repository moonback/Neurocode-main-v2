/**
 * File System Operations with Safety Checks
 *
 * This module provides safe file operations for the code generation system,
 * including atomic writes, automatic backups, and path validation.
 *
 * Requirements:
 * - 6.4: Implement file existence checking and conflict detection
 * - 5.6: Create backup copies before modifying existing files; implement rollback support
 * - 6.6: Validate all file paths to prevent path traversal and ensure writes stay within project
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { DyadError, DyadErrorKind } from "../errors/dyad_error";

/**
 * Strategy for handling existing file conflicts
 */
export type ConflictStrategy =
  | "overwrite"
  | "skip"
  | "rename"
  | "abort"
  | "append";

/**
 * Result of a file operation
 */
export interface FileOperationResult {
  path: string;
  action: "create" | "update" | "skip" | "rename" | "backup";
  success: boolean;
  size?: number;
  error?: string;
  backupPath?: string;
}

/**
 * File system manager for safe code generation
 */
export class FileSystemManager {
  private projectRoot: string;
  private dryRun: boolean;

  constructor(projectRoot: string, dryRun: boolean = false) {
    this.projectRoot = path.resolve(projectRoot);
    this.dryRun = dryRun;
  }

  /**
   * Writes content to a file safely.
   *
   * @param targetPath - Relative or absolute path to the target file
   * @param content - Content to write
   * @param strategy - Conflict resolution strategy
   * @returns Result of the operation
   */
  async writeFile(
    targetPath: string,
    content: string,
    strategy: ConflictStrategy = "abort",
  ): Promise<FileOperationResult> {
    const absolutePath = this.resolveAndValidatePath(targetPath);
    const exists = await this.exists(absolutePath);

    if (this.dryRun) {
      return {
        path: targetPath,
        action: exists ? "update" : "create",
        success: true,
        size: Buffer.byteLength(content),
      };
    }

    if (exists) {
      switch (strategy) {
        case "skip":
          return { path: targetPath, action: "skip", success: true };
        case "abort":
          throw new DyadError(
            `File already exists: ${targetPath}`,
            DyadErrorKind.ValidationFailed,
          );
        case "rename":
          // Not implemented for now, but could append .1, .2, etc.
          throw new Error("Rename strategy not yet implemented");
        case "overwrite":
          // Create backup before overwriting
          const backupPath = await this.createBackup(absolutePath);
          await this.atomicWrite(absolutePath, content);
          return {
            path: targetPath,
            action: "update",
            success: true,
            size: Buffer.byteLength(content),
            backupPath,
          };
        case "append":
          const existingContent = await fs.readFile(absolutePath, "utf-8");
          const newContent = existingContent + "\n" + content;
          await this.createBackup(absolutePath);
          await this.atomicWrite(absolutePath, newContent);
          return {
            path: targetPath,
            action: "update",
            success: true,
            size: Buffer.byteLength(newContent),
          };
      }
    }

    // Create directories if they don't exist
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });

    // File doesn't exist, create it
    await this.atomicWrite(absolutePath, content);
    return {
      path: targetPath,
      action: "create",
      success: true,
      size: Buffer.byteLength(content),
    };
  }

  /**
   * Deletes a file safely
   */
  async deleteFile(targetPath: string): Promise<boolean> {
    const absolutePath = this.resolveAndValidatePath(targetPath);
    if (this.dryRun) return true;

    try {
      await fs.unlink(absolutePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Resolves a path relative to the project root and validates it.
   * Prevents path traversal outside the project root.
   */
  private resolveAndValidatePath(targetPath: string): string {
    const absolutePath = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(this.projectRoot, targetPath);

    if (!absolutePath.startsWith(this.projectRoot)) {
      throw new DyadError(
        `Security Error: Attempted to write outside project root: ${targetPath}`,
        DyadErrorKind.Forbidden,
      );
    }

    return absolutePath;
  }

  /**
   * Writes content atomically by writing to a temporary file then renaming.
   */
  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.${Date.now()}.tmp`;
    try {
      await fs.writeFile(tempPath, content, "utf-8");
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {}
      throw error;
    }
  }

  /**
   * Creates a backup of an existing file.
   */
  private async createBackup(filePath: string): Promise<string> {
    const backupPath = `${filePath}.bak`;
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  }

  /**
   * Checks if a file or directory exists.
   */
  private async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Rolls back a file from its backup.
   */
  async rollback(targetPath: string): Promise<void> {
    const absolutePath = this.resolveAndValidatePath(targetPath);
    const backupPath = `${absolutePath}.bak`;
    if (await this.exists(backupPath)) {
      await fs.rename(backupPath, absolutePath);
    }
  }
}

/**
 * Creates a file system manager instance.
 */
export function createFileSystemManager(
  projectRoot: string,
  dryRun: boolean = false,
): FileSystemManager {
  return new FileSystemManager(projectRoot, dryRun);
}
