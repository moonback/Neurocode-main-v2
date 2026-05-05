/**
 * Configuration Parser
 *
 * Parses configuration files (JSON or TypeScript) and validates them against the schema.
 * Provides descriptive errors for invalid configuration.
 *
 * Requirements: 11.1, 11.2
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ZodError } from "zod";
import {
  Configuration,
  ConfigurationSchema,
  DEFAULT_CONFIGURATION,
} from "./config-schema";

export interface ParseResult {
  success: boolean;
  config?: Configuration;
  errors?: ParseError[];
}

export interface ParseError {
  message: string;
  path?: string[];
  line?: number;
  column?: number;
}

export class ConfigurationParser {
  constructor(private projectRoot: string) {}

  /**
   * Parse configuration from a file path
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return this.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          success: false,
          errors: [
            {
              message: `Configuration file not found: ${filePath}`,
            },
          ],
        };
      }
      return {
        success: false,
        errors: [
          {
            message: `Failed to read configuration file: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  /**
   * Parse configuration from a string
   */
  parse(content: string): ParseResult {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      return this.validate(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Extract line and column from syntax error
        const match = error.message.match(/position (\d+)/);
        const position = match ? parseInt(match[1], 10) : undefined;
        const { line, column } = this.getLineColumn(content, position);

        return {
          success: false,
          errors: [
            {
              message: `Invalid JSON syntax: ${error.message}`,
              line,
              column,
            },
          ],
        };
      }
      return {
        success: false,
        errors: [
          {
            message: `Failed to parse configuration: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  /**
   * Validate parsed configuration against schema
   */
  validate(data: unknown): ParseResult {
    try {
      const config = ConfigurationSchema.parse(data);
      return {
        success: true,
        config,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ParseError[] = error.issues.map((err) => ({
          message: err.message,
          path: err.path.map(String),
        }));
        return {
          success: false,
          errors,
        };
      }
      return {
        success: false,
        errors: [
          {
            message: `Validation failed: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  /**
   * Load configuration from default location or return default config
   */
  async loadConfig(): Promise<Configuration> {
    const configPath = path.join(this.projectRoot, "codegen.config.json");
    const result = await this.parseFile(configPath);

    if (result.success && result.config) {
      return result.config;
    }

    // Return default configuration if file doesn't exist or is invalid
    return DEFAULT_CONFIGURATION;
  }

  /**
   * Load configuration with error reporting
   */
  async loadConfigWithErrors(): Promise<ParseResult> {
    const configPath = path.join(this.projectRoot, "codegen.config.json");
    const result = await this.parseFile(configPath);

    if (!result.success) {
      return result;
    }

    return result;
  }

  /**
   * Get line and column from character position in string
   */
  private getLineColumn(
    content: string,
    position?: number,
  ): { line?: number; column?: number } {
    if (position === undefined) {
      return {};
    }

    const lines = content.substring(0, position).split("\n");
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  }

  /**
   * Format parse errors for display
   */
  formatErrors(errors: ParseError[], filePath?: string): string {
    const lines: string[] = [];

    if (filePath) {
      lines.push(`[ERROR] Configuration Error in ${filePath}\n`);
    } else {
      lines.push(`[ERROR] Configuration Error\n`);
    }

    for (const error of errors) {
      if (error.path && error.path.length > 0) {
        lines.push(`  Path: ${error.path.join(".")}`);
      }
      if (error.line !== undefined) {
        lines.push(`  Line: ${error.line}, Column: ${error.column || "?"}`);
      }
      lines.push(`  ${error.message}\n`);
    }

    lines.push(
      "Suggestion: Check the configuration file syntax and ensure all required fields are present.",
    );

    return lines.join("\n");
  }
}
