/**
 * Codegen Orchestrator
 *
 * Coordinates multiple generators to perform complex workflows.
 */

import { IpcGenerator } from "./generators/ipc-generator";
import { ComponentGenerator } from "./generators/component-generator";
import { DbGenerator } from "./generators/db-generator";
import { TestGenerator } from "./generators/test-generator";
import { FileOperationResult } from "./file-system";

export interface WorkflowOptions {
  name: string;
  domain?: string;
  withIpc?: boolean;
  withComponent?: boolean;
  withDb?: boolean;
}

export class Orchestrator {
  constructor(
    private ipcGen: IpcGenerator,
    private componentGen: ComponentGenerator,
    private dbGen: DbGenerator,
    private testGen: TestGenerator,
  ) {}

  /**
   * Executes a complex workflow
   */
  async executeWorkflow(
    options: WorkflowOptions,
  ): Promise<FileOperationResult[]> {
    const results: FileOperationResult[] = [];

    // 1. Database Table
    if (options.withDb) {
      results.push(
        ...(await this.dbGen.generate({
          name: options.name,
          append: true,
        })),
      );
    }

    // 2. IPC Endpoint
    if (options.withIpc) {
      results.push(
        ...(await this.ipcGen.generate({
          name: options.name,
          domain: options.domain || "app",
          mutation: true,
        })),
      );
    }

    // 3. UI Component
    if (options.withComponent) {
      results.push(
        ...(await this.componentGen.generate({
          name: options.name,
          directory: `src/components/${options.domain || "features"}`,
        })),
      );
    }

    return results;
  }
}
