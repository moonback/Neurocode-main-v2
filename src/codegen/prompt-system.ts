/**
 * Interactive Prompt System for Code Generation CLI
 *
 * This module provides interactive parameter collection for missing arguments,
 * validation for user inputs, and support for both interactive and non-interactive modes.
 *
 * Requirements:
 * - 6.2: Prompt for required parameters interactively
 * - 6.3: Support non-interactive mode with all parameters provided as command-line arguments
 * - 6.6: Validate parameters before generation and reject invalid inputs
 */

import { input, confirm, select } from "@inquirer/prompts";

/**
 * Parameter definition for interactive prompts
 */
export interface ParameterDefinition {
  name: string;
  description: string;
  type: "string" | "boolean" | "select";
  required: boolean;
  default?: unknown;
  choices?: Array<{ value: string; name: string; description?: string }>;
  validate?: (value: unknown) => boolean | string;
}

/**
 * Options for parameter collection
 */
export interface PromptOptions {
  interactive: boolean; // Whether to prompt for missing parameters
  dryRun?: boolean; // Whether this is a dry-run (affects messaging)
}

/**
 * Result of parameter collection
 */
export interface ParameterCollectionResult {
  success: boolean;
  parameters: Record<string, unknown>;
  errors: string[];
}

/**
 * Collects parameters either from provided values or by prompting the user interactively.
 *
 * In non-interactive mode, validates that all required parameters are provided.
 * In interactive mode, prompts for any missing required parameters.
 *
 * @param definitions - Parameter definitions describing what to collect
 * @param providedValues - Values already provided via command-line arguments
 * @param options - Options controlling interactive behavior
 * @returns Result containing collected parameters or errors
 */
export async function collectParameters(
  definitions: ParameterDefinition[],
  providedValues: Record<string, unknown>,
  options: PromptOptions,
): Promise<ParameterCollectionResult> {
  const parameters: Record<string, unknown> = { ...providedValues };
  const errors: string[] = [];

  // Process each parameter definition
  for (const def of definitions) {
    const hasValue =
      def.name in parameters && parameters[def.name] !== undefined;

    // If value already provided, validate it
    if (hasValue) {
      const validationResult = validateParameter(def, parameters[def.name]);
      if (validationResult !== true) {
        errors.push(`Invalid value for ${def.name}: ${validationResult}`);
        continue;
      }
    }

    // If no value and required, either prompt or error
    if (!hasValue && def.required) {
      if (options.interactive) {
        // Prompt for the missing parameter
        try {
          const value = await promptForParameter(def);
          parameters[def.name] = value;
        } catch (error) {
          // User cancelled or error occurred
          errors.push(`Failed to collect parameter ${def.name}: ${error}`);
          return { success: false, parameters, errors };
        }
      } else {
        // Non-interactive mode: missing required parameter is an error
        errors.push(
          `Missing required parameter: ${def.name} (${def.description})`,
        );
      }
    }

    // If no value and not required, use default if available
    if (!hasValue && !def.required && def.default !== undefined) {
      parameters[def.name] = def.default;
    }
  }

  return {
    success: errors.length === 0,
    parameters,
    errors,
  };
}

/**
 * Prompts the user for a single parameter value based on its definition.
 *
 * @param def - Parameter definition
 * @returns The collected value
 */
async function promptForParameter(def: ParameterDefinition): Promise<unknown> {
  const message = def.required
    ? `${def.description} (required)`
    : `${def.description} (optional)`;

  switch (def.type) {
    case "string": {
      return await input({
        message,
        default: def.default as string | undefined,
        validate: (value: string) => {
          if (!value && def.required) {
            return "This parameter is required";
          }
          if (def.validate) {
            const result = def.validate(value);
            return result === true ? true : result;
          }
          return true;
        },
      });
    }

    case "boolean": {
      return await confirm({
        message,
        default: (def.default as boolean | undefined) ?? false,
      });
    }

    case "select": {
      if (!def.choices || def.choices.length === 0) {
        throw new Error(`Select parameter ${def.name} has no choices defined`);
      }
      return await select({
        message,
        choices: def.choices,
        default: def.default as string | undefined,
      });
    }

    default:
      throw new Error(`Unsupported parameter type: ${def.type}`);
  }
}

/**
 * Validates a parameter value against its definition.
 *
 * @param def - Parameter definition
 * @param value - Value to validate
 * @returns true if valid, error message string if invalid
 */
function validateParameter(
  def: ParameterDefinition,
  value: unknown,
): boolean | string {
  // Check required
  if (def.required && (value === undefined || value === null || value === "")) {
    return `${def.name} is required`;
  }

  // Run custom validation if provided
  if (def.validate) {
    return def.validate(value);
  }

  return true;
}

/**
 * Common validators for parameter values
 */
export const validators = {
  /**
   * Validates that a string is a valid identifier (letters, numbers, underscores, hyphens)
   */
  identifier: (value: unknown): boolean | string => {
    if (typeof value !== "string") {
      return "Must be a string";
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
      return "Must start with a letter and contain only letters, numbers, underscores, and hyphens";
    }
    return true;
  },

  /**
   * Validates that a string is a valid PascalCase identifier
   */
  pascalCase: (value: unknown): boolean | string => {
    if (typeof value !== "string") {
      return "Must be a string";
    }
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
      return "Must be PascalCase (start with uppercase letter, no spaces or special characters)";
    }
    return true;
  },

  /**
   * Validates that a string is a valid camelCase identifier
   */
  camelCase: (value: unknown): boolean | string => {
    if (typeof value !== "string") {
      return "Must be a string";
    }
    if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
      return "Must be camelCase (start with lowercase letter, no spaces or special characters)";
    }
    return true;
  },

  /**
   * Validates that a string is a valid kebab-case identifier
   */
  kebabCase: (value: unknown): boolean | string => {
    if (typeof value !== "string") {
      return "Must be a string";
    }
    if (!/^[a-z][a-z0-9-]*$/.test(value)) {
      return "Must be kebab-case (lowercase letters, numbers, and hyphens only)";
    }
    return true;
  },

  /**
   * Validates that a string is not empty
   */
  notEmpty: (value: unknown): boolean | string => {
    if (typeof value !== "string") {
      return "Must be a string";
    }
    if (value.trim().length === 0) {
      return "Cannot be empty";
    }
    return true;
  },

  /**
   * Creates a validator that checks minimum length
   */
  minLength:
    (min: number) =>
    (value: unknown): boolean | string => {
      if (typeof value !== "string") {
        return "Must be a string";
      }
      if (value.length < min) {
        return `Must be at least ${min} characters long`;
      }
      return true;
    },

  /**
   * Creates a validator that checks maximum length
   */
  maxLength:
    (max: number) =>
    (value: unknown): boolean | string => {
      if (typeof value !== "string") {
        return "Must be a string";
      }
      if (value.length > max) {
        return `Must be at most ${max} characters long`;
      }
      return true;
    },

  /**
   * Combines multiple validators (all must pass)
   */
  combine:
    (...validators: Array<(value: unknown) => boolean | string>) =>
    (value: unknown): boolean | string => {
      for (const validator of validators) {
        const result = validator(value);
        if (result !== true) {
          return result;
        }
      }
      return true;
    },
};
