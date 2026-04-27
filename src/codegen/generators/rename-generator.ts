/**
 * Rename Generator
 *
 * Safely renames entities and associated files.
 */

import { FileSystemManager, FileOperationResult } from "../file-system";
import * as path from "node:path";
import * as fs from "node:fs/promises";

export interface RenameGeneratorOptions {
  type: "ipc" | "component";
  oldName: string;
  newName: string;
  domain?: string; // for IPC
}

export class RenameGenerator {
  constructor(private fsManager: FileSystemManager) {}

  /**
   * Performs the rename operation
   */
  async generate(
    options: RenameGeneratorOptions,
  ): Promise<FileOperationResult[]> {
    if (options.type === "ipc") {
      return this.renameIpc(options);
    } else {
      return this.renameComponent(options);
    }
  }

  /**
   * Renames IPC endpoint files and contents
   */
  private async renameIpc(
    options: RenameGeneratorOptions,
  ): Promise<FileOperationResult[]> {
    const results: FileOperationResult[] = [];
    const domain = options.domain || "app";
    const oldPascal = this.pascalCase(options.oldName);
    const newPascal = this.pascalCase(options.newName);
    const oldKebab = this.kebabCase(options.oldName);
    const newKebab = this.kebabCase(options.newName);

    const mappings = [
      {
        old: `src/ipc/types/${domain}/${oldPascal}Contract.ts`,
        new: `src/ipc/types/${domain}/${newPascal}Contract.ts`,
      },
      {
        old: `src/ipc/handlers/${domain}/${oldPascal}Handler.ts`,
        new: `src/ipc/handlers/${domain}/${newPascal}Handler.ts`,
      },
      {
        old: `src/hooks/use${oldPascal}.ts`,
        new: `src/hooks/use${newPascal}.ts`,
      },
      {
        old: `e2e-tests/${domain}-${oldKebab}.spec.ts`,
        new: `e2e-tests/${domain}-${newKebab}.spec.ts`,
      },
    ];

    for (const mapping of mappings) {
      const absoluteOld = path.resolve(this.fsManager.projectRoot, mapping.old);
      try {
        await fs.access(absoluteOld);

        // Read and update content
        let content = await fs.readFile(absoluteOld, "utf-8");
        content = content.replace(new RegExp(oldPascal, "g"), newPascal);
        content = content.replace(
          new RegExp(this.camelCase(options.oldName), "g"),
          this.camelCase(options.newName),
        );

        // Rename file
        results.push(
          await this.fsManager.writeFile(mapping.new, content, "overwrite"),
        );

        // Delete the old file
        await this.fsManager.deleteFile(mapping.old);
        results.push({
          path: mapping.old,
          action: "delete",
          success: true,
          size: 0,
        });
      } catch (e) {
        // File doesn't exist, skip
      }
    }

    return results;
  }

  /**
   * Renames Component directory and files
   */
  private async renameComponent(
    options: RenameGeneratorOptions,
  ): Promise<FileOperationResult[]> {
    const results: FileOperationResult[] = [];
    const oldPascal = this.pascalCase(options.oldName);
    const newPascal = this.pascalCase(options.newName);

    const oldDir = `src/components/${oldPascal}`;
    const newDir = `src/components/${newPascal}`;

    const files = [
      `${oldPascal}.tsx`,
      `${oldPascal}.test.tsx`,
      `${oldPascal}.stories.tsx`,
    ];

    for (const file of files) {
      const oldPath = path.join(oldDir, file);
      const newFile = file.replace(oldPascal, newPascal);
      const newPath = path.join(newDir, newFile);

      const absoluteOld = path.resolve(this.fsManager.projectRoot, oldPath);
      try {
        await fs.access(absoluteOld);

        let content = await fs.readFile(absoluteOld, "utf-8");
        content = content.replace(new RegExp(oldPascal, "g"), newPascal);

        results.push(
          await this.fsManager.writeFile(newPath, content, "overwrite"),
        );

        await this.fsManager.deleteFile(oldPath);
        results.push({
          path: oldPath,
          action: "delete",
          success: true,
          size: 0,
        });
      } catch (e) {
        // Skip
      }
    }

    return results;
  }

  private pascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/[\s-_]+/g, "");
  }

  private camelCase(str: string): string {
    const pascal = this.pascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private kebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  }
}

/**
 * Creates a rename generator instance
 */
export function createRenameGenerator(
  fsManager: FileSystemManager,
): RenameGenerator {
  return new RenameGenerator(fsManager);
}
