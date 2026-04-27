/**
 * Codegen Configuration Loader
 *
 * Handles loading and merging configuration from codegen.config.json.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface CodegenConfig {
  templatesDirectory?: string;
  outputDirectories?: {
    ipc?: string;
    components?: string;
    db?: string;
    tests?: string;
  };
  formatting?: {
    enabled?: boolean;
    lint?: boolean;
  };
}

const DEFAULT_CONFIG: CodegenConfig = {
  templatesDirectory: "src/codegen/templates",
  outputDirectories: {
    ipc: "src/ipc",
    components: "src/components",
    db: "src/db",
    tests: "e2e-tests",
  },
  formatting: {
    enabled: true,
    lint: false,
  },
};

export class ConfigLoader {
  constructor(private projectRoot: string) {}

  /**
   * Loads configuration from file
   */
  async loadConfig(): Promise<CodegenConfig> {
    const configPath = path.join(this.projectRoot, "codegen.config.json");
    try {
      const content = await fs.readFile(configPath, "utf-8");
      const userConfig = JSON.parse(content);
      return this.mergeConfigs(DEFAULT_CONFIG, userConfig);
    } catch (error) {
      // Return default if file doesn't exist or is invalid
      return DEFAULT_CONFIG;
    }
  }

  private mergeConfigs(base: CodegenConfig, user: any): CodegenConfig {
    return {
      ...base,
      ...user,
      outputDirectories: {
        ...base.outputDirectories,
        ...user.outputDirectories,
      },
      formatting: {
        ...base.formatting,
        ...user.formatting,
      },
    };
  }
}