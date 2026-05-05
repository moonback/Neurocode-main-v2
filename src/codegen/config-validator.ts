/**
 * Configuration Validator
 *
 * Validates configuration files against schema before parsing.
 * Checks for required fields and valid values.
 * Provides helpful error messages for validation failures.
 *
 * Requirements: 11.6
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ZodError } from "zod";
import { Configuration, ConfigurationSchema } from "./config-schema";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export class ConfigurationValidator {
  /**
   * Validate a configuration object
   */
  validate(config: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Validate against Zod schema
      ConfigurationSchema.parse(config);

      // Additional custom validations
      if (typeof config === "object" && config !== null) {
        this.validatePaths(config as Configuration, warnings);
        this.validateNaming(config as Configuration, warnings);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        for (const err of error.issues) {
          errors.push({
            field: err.path.map(String).join("."),
            message: err.message,
            value:
              err.path.length > 0
                ? this.getNestedValue(config, err.path.map(String))
                : undefined,
          });
        }
      } else {
        errors.push({
          field: "unknown",
          message: `Validation error: ${(error as Error).message}`,
        });
      }

      return {
        valid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Validate configuration file before parsing
   */
  async validateFile(filePath: string): Promise<ValidationResult> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(content);
      return this.validate(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          valid: false,
          errors: [
            {
              field: "file",
              message: `Configuration file not found: ${filePath}`,
            },
          ],
          warnings: [],
        };
      }
      if (error instanceof SyntaxError) {
        return {
          valid: false,
          errors: [
            {
              field: "syntax",
              message: `Invalid JSON syntax: ${error.message}`,
            },
          ],
          warnings: [],
        };
      }
      return {
        valid: false,
        errors: [
          {
            field: "file",
            message: `Failed to read configuration: ${(error as Error).message}`,
          },
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate path configuration
   */
  private validatePaths(config: Configuration, warnings: string[]): void {
    // Check if paths are reasonable (not absolute, not outside project)
    const paths = [
      config.paths.ipc.contracts,
      config.paths.ipc.handlers,
      config.paths.ipc.hooks,
      config.paths.components,
      config.paths.schemas,
      config.paths.tests.e2e,
      config.paths.tests.unit,
    ];

    for (const p of paths) {
      if (path.isAbsolute(p)) {
        warnings.push(
          `Path "${p}" is absolute. Consider using relative paths.`,
        );
      }
      if (p.includes("..")) {
        warnings.push(
          `Path "${p}" contains ".." which may point outside the project.`,
        );
      }
    }
  }

  /**
   * Validate naming configuration
   */
  private validateNaming(config: Configuration, warnings: string[]): void {
    // Check for reasonable naming conventions
    if (
      config.naming.ipc.hookPrefix &&
      !config.naming.ipc.hookPrefix.match(/^[a-z]+$/)
    ) {
      warnings.push(
        `Hook prefix "${config.naming.ipc.hookPrefix}" should be lowercase letters only.`,
      );
    }

    if (
      config.naming.ipc.contractSuffix &&
      !config.naming.ipc.contractSuffix.match(/^[A-Z][a-zA-Z]*$/)
    ) {
      warnings.push(
        `Contract suffix "${config.naming.ipc.contractSuffix}" should start with uppercase letter.`,
      );
    }

    if (
      config.naming.ipc.handlerSuffix &&
      !config.naming.ipc.handlerSuffix.match(/^[A-Z][a-zA-Z]*$/)
    ) {
      warnings.push(
        `Handler suffix "${config.naming.ipc.handlerSuffix}" should start with uppercase letter.`,
      );
    }
  }

  /**
   * Get nested value from object by path
   */
  private getNestedValue(obj: unknown, path: (string | number)[]): unknown {
    let current: any = obj;
    for (const key of path) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    return current;
  }

  /**
   * Format validation errors for display
   */
  formatErrors(result: ValidationResult): string {
    const lines: string[] = [];

    if (result.errors.length > 0) {
      lines.push("[ERROR] Configuration Validation Failed\n");
      for (const error of result.errors) {
        lines.push(`  Field: ${error.field}`);
        lines.push(`  Error: ${error.message}`);
        if (error.value !== undefined) {
          lines.push(`  Value: ${JSON.stringify(error.value)}`);
        }
        lines.push("");
      }
    }

    if (result.warnings.length > 0) {
      lines.push("[WARNING] Configuration Warnings\n");
      for (const warning of result.warnings) {
        lines.push(`  ${warning}`);
      }
      lines.push("");
    }

    if (result.errors.length > 0) {
      lines.push(
        "Suggestion: Fix the validation errors above and ensure all required fields are present with valid values.",
      );
    }

    return lines.join("\n");
  }
}
