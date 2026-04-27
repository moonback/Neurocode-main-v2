/**
 * Unit tests for FileSystemManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createFileSystemManager, FileSystemManager } from "../file-system";
import { DyadError } from "../../errors/dyad_error";

describe("FileSystemManager", () => {
  const projectRoot = path.resolve("./test-project-root");
  let fsManager: FileSystemManager;

  beforeEach(async () => {
    // Create a mock project root for testing
    await fs.mkdir(projectRoot, { recursive: true });
    fsManager = createFileSystemManager(projectRoot);
  });

  afterEach(async () => {
    // Clean up mock project root
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  describe("resolveAndValidatePath", () => {
    it("should allow paths inside project root", async () => {
      const targetPath = "src/components/Test.tsx";
      const result = await fsManager.writeFile(targetPath, "content", "overwrite");
      expect(result.success).toBe(true);
    });

    it("should throw for paths outside project root (path traversal)", async () => {
      const targetPath = "../../outside.txt";
      await expect(fsManager.writeFile(targetPath, "content")).rejects.toThrow(
        /Security Error/
      );
    });
  });

  describe("writeFile", () => {
    it("should create a new file and its directories", async () => {
      const targetPath = "new/dir/file.ts";
      const content = "export const x = 1;";
      
      const result = await fsManager.writeFile(targetPath, content);
      
      expect(result.action).toBe("create");
      const savedContent = await fs.readFile(path.join(projectRoot, targetPath), "utf-8");
      expect(savedContent).toBe(content);
    });

    it("should throw if file exists and strategy is 'abort'", async () => {
      const targetPath = "exists.ts";
      await fs.writeFile(path.join(projectRoot, targetPath), "old");
      
      await expect(fsManager.writeFile(targetPath, "new", "abort")).rejects.toThrow(
        /File already exists/
      );
    });

    it("should create a backup and overwrite if strategy is 'overwrite'", async () => {
      const targetPath = "overwrite.ts";
      const oldContent = "old";
      const newContent = "new";
      const fullPath = path.join(projectRoot, targetPath);
      
      await fs.writeFile(fullPath, oldContent);
      
      const result = await fsManager.writeFile(targetPath, newContent, "overwrite");
      
      expect(result.action).toBe("update");
      expect(result.backupPath).toBe(`${fullPath}.bak`);
      
      const savedContent = await fs.readFile(fullPath, "utf-8");
      expect(savedContent).toBe(newContent);
      
      const backupContent = await fs.readFile(result.backupPath!, "utf-8");
      expect(backupContent).toBe(oldContent);
    });

    it("should skip if strategy is 'skip'", async () => {
      const targetPath = "skip.ts";
      await fs.writeFile(path.join(projectRoot, targetPath), "old");
      
      const result = await fsManager.writeFile(targetPath, "new", "skip");
      
      expect(result.action).toBe("skip");
      const savedContent = await fs.readFile(path.join(projectRoot, targetPath), "utf-8");
      expect(savedContent).toBe("old");
    });
  });

  describe("dryRun", () => {
    it("should not write any files in dry-run mode", async () => {
      const dryManager = createFileSystemManager(projectRoot, true);
      const targetPath = "dry-run.ts";
      
      const result = await dryManager.writeFile(targetPath, "content");
      
      expect(result.success).toBe(true);
      const exists = await fs.access(path.join(projectRoot, targetPath)).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });

  describe("rollback", () => {
    it("should restore from backup", async () => {
      const targetPath = "rollback.ts";
      const fullPath = path.join(projectRoot, targetPath);
      
      await fs.writeFile(fullPath, "new");
      await fs.writeFile(`${fullPath}.bak`, "old");
      
      await fsManager.rollback(targetPath);
      
      const restoredContent = await fs.readFile(fullPath, "utf-8");
      expect(restoredContent).toBe("old");
    });
  });
});
