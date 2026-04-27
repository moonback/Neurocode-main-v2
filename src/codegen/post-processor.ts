/**
 * Post-Processing System
 *
 * Handles formatting, linting, and validation of generated code.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as path from "node:path";

const execAsync = promisify(exec);

export interface PostProcessorOptions {
  format?: boolean;
  lint?: boolean;
  projectRoot: string;
}

export class PostProcessor {
  constructor(private options: PostProcessorOptions) {}

  /**
   * Processes generated files (format, lint, etc.)
   */
  async processFiles(filePaths: string[]): Promise<void> {
    if (filePaths.length === 0) return;

    const absolutePaths = filePaths.map((p) =>
      path.isAbsolute(p) ? p : path.resolve(this.options.projectRoot, p),
    );

    if (this.options.format) {
      await this.formatFiles(absolutePaths);
    }

    if (this.options.lint) {
      await this.lintFiles(absolutePaths);
    }
  }

  /**
   * Formats files using oxfmt
   */
  private async formatFiles(paths: string[]): Promise<void> {
    try {
      // Run oxfmt on all files at once
      const command = `npx oxfmt ${paths.join(" ")}`;
      await execAsync(command, { cwd: this.options.projectRoot });
    } catch (error) {
      console.warn(
        "Formatting failed:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Lints and fixes files using oxlint
   */
  private async lintFiles(paths: string[]): Promise<void> {
    try {
      // Run oxlint with fix on all files
      const command = `npx oxlint --fix ${paths.join(" ")}`;
      await execAsync(command, { cwd: this.options.projectRoot });
    } catch (error) {
      // Linting errors are expected if code is not yet valid
      console.warn(
        "Linting/Fixing failed:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
