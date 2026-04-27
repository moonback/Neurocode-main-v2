/**
 * Template Validation System
 *
 * This module provides template validation to ensure templates are syntactically
 * correct before rendering. It validates:
 * - Variable substitution syntax {{variableName}}
 * - Conditional blocks {{#if condition}}...{{/if}}
 * - Loop blocks {{#each items}}...{{/each}}
 * - Filter syntax {{variableName | filterName}}
 * - Proper nesting and matching of tags
 *
 * Requirements:
 * - 5.5: Validate template syntax on load, check for required variables,
 *        provide descriptive error messages for template errors
 */

/**
 * Validation error with location information
 */
export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  severity: "error" | "warning";
  context?: string; // Surrounding text for context
}

/**
 * Result of template validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  variables: Set<string>; // All variables found in template
}

/**
 * Template validator for checking syntax and structure
 */
export class TemplateValidator {
  // Known filters from the template engine
  private knownFilters = new Set([
    "pascalCase",
    "camelCase",
    "kebab-case",
    "snake_case",
    "uppercase",
    "lowercase",
    "capitalize",
    "trim",
  ]);

  /**
   * Validates a template string for syntax errors
   *
   * @param template - Template string to validate
   * @returns Validation result with errors and warnings
   */
  validate(template: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const variables = new Set<string>();

    // Split template into lines for error reporting
    const lines = template.split("\n");

    // Track block nesting
    const blockStack: Array<{
      type: "if" | "each";
      line: number;
      column: number;
      param: string;
    }> = [];

    // Process template character by character
    let pos = 0;
    let line = 1;
    let column = 1;

    while (pos < template.length) {
      // Check for opening braces
      if (template[pos] === "{" && template[pos + 1] === "{") {
        const tagStart = pos;
        const tagStartLine = line;
        const tagStartColumn = column;

        // Find the closing braces
        let tagEnd = template.indexOf("}}", pos + 2);
        if (tagEnd === -1) {
          errors.push({
            message: "Unclosed template tag - missing closing '}}'",
            line: tagStartLine,
            column: tagStartColumn,
            severity: "error",
            context: this.getContext(lines, tagStartLine, tagStartColumn),
          });
          break;
        }

        const tagContent = template.substring(pos + 2, tagEnd).trim();
        tagEnd += 2; // Include the closing braces

        // Determine tag type
        if (tagContent.startsWith("#if")) {
          // Opening if block
          const condition = tagContent.substring(3).trim();
          if (!condition) {
            errors.push({
              message: "Empty condition in {{#if}} block",
              line: tagStartLine,
              column: tagStartColumn,
              severity: "error",
              context: this.getContext(lines, tagStartLine, tagStartColumn),
            });
            // Still push to stack to track unclosed blocks
            blockStack.push({
              type: "if",
              line: tagStartLine,
              column: tagStartColumn,
              param: "",
            });
          } else {
            // Extract variable from condition (simple case - just the variable name)
            const varMatch = condition.match(/^([a-zA-Z_$][\w.$]*)/);
            if (varMatch) {
              variables.add(varMatch[1]);
            }
            blockStack.push({
              type: "if",
              line: tagStartLine,
              column: tagStartColumn,
              param: condition,
            });
          }
        } else if (tagContent.startsWith("#each")) {
          // Opening each block
          const arrayName = tagContent.substring(5).trim();
          if (!arrayName) {
            errors.push({
              message: "Empty array name in {{#each}} block",
              line: tagStartLine,
              column: tagStartColumn,
              severity: "error",
              context: this.getContext(lines, tagStartLine, tagStartColumn),
            });
            // Still push to stack to track unclosed blocks
            blockStack.push({
              type: "each",
              line: tagStartLine,
              column: tagStartColumn,
              param: "",
            });
          } else {
            // Validate array name is a valid identifier
            if (!this.isValidIdentifier(arrayName)) {
              errors.push({
                message: `Invalid array name in {{#each}}: ${arrayName}`,
                line: tagStartLine,
                column: tagStartColumn,
                severity: "error",
                context: this.getContext(lines, tagStartLine, tagStartColumn),
              });
            } else {
              variables.add(arrayName);
            }
            blockStack.push({
              type: "each",
              line: tagStartLine,
              column: tagStartColumn,
              param: arrayName,
            });
          }
        } else if (tagContent === "/if") {
          // Closing if block
          if (blockStack.length === 0) {
            errors.push({
              message: "Unexpected {{/if}} - no matching {{#if}}",
              line: tagStartLine,
              column: tagStartColumn,
              severity: "error",
              context: this.getContext(lines, tagStartLine, tagStartColumn),
            });
          } else {
            const lastBlock = blockStack.pop()!;
            if (lastBlock.type !== "if") {
              errors.push({
                message: `Mismatched closing tag - expected {{/${lastBlock.type}}} but found {{/if}}`,
                line: tagStartLine,
                column: tagStartColumn,
                severity: "error",
                context: this.getContext(lines, tagStartLine, tagStartColumn),
              });
              // Push it back since we didn't actually close it
              blockStack.push(lastBlock);
            }
          }
        } else if (tagContent === "/each") {
          // Closing each block
          if (blockStack.length === 0) {
            errors.push({
              message: "Unexpected {{/each}} - no matching {{#each}}",
              line: tagStartLine,
              column: tagStartColumn,
              severity: "error",
              context: this.getContext(lines, tagStartLine, tagStartColumn),
            });
          } else {
            const lastBlock = blockStack.pop()!;
            if (lastBlock.type !== "each") {
              errors.push({
                message: `Mismatched closing tag - expected {{/${lastBlock.type}}} but found {{/each}}`,
                line: tagStartLine,
                column: tagStartColumn,
                severity: "error",
                context: this.getContext(lines, tagStartLine, tagStartColumn),
              });
              // Push it back since we didn't actually close it
              blockStack.push(lastBlock);
            }
          }
        } else if (
          !tagContent.startsWith("!--") &&
          !tagContent.startsWith("#") &&
          !tagContent.startsWith("/")
        ) {
          // Variable substitution
          this.validateVariable(
            tagContent,
            tagStartLine,
            tagStartColumn,
            lines,
            errors,
            warnings,
            variables,
          );
        }

        // Update position
        const tagText = template.substring(tagStart, tagEnd);
        const newlines = (tagText.match(/\n/g) || []).length;
        if (newlines > 0) {
          line += newlines;
          column = tagText.length - tagText.lastIndexOf("\n");
        } else {
          column += tagText.length;
        }
        pos = tagEnd;
      } else {
        // Regular character
        if (template[pos] === "\n") {
          line++;
          column = 1;
        } else {
          column++;
        }
        pos++;
      }
    }

    // Check for unclosed blocks
    for (const block of blockStack) {
      errors.push({
        message: `Unclosed {{#${block.type}}} block - missing {{/${block.type}}}`,
        line: block.line,
        column: block.column,
        severity: "error",
        context: this.getContext(lines, block.line, block.column),
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      variables,
    };
  }

  /**
   * Validates a variable expression (with optional filters)
   *
   * @param expression - Variable expression like "name" or "name | filter"
   * @param line - Line number
   * @param column - Column number
   * @param lines - Template lines for context
   * @param errors - Array to add errors to
   * @param warnings - Array to add warnings to
   * @param variables - Set to add variable names to
   */
  private validateVariable(
    expression: string,
    line: number,
    column: number,
    lines: string[],
    errors: ValidationError[],
    warnings: ValidationError[],
    variables: Set<string>,
  ): void {
    if (!expression) {
      errors.push({
        message: "Empty variable expression in {{}}",
        line,
        column,
        severity: "error",
        context: this.getContext(lines, line, column),
      });
      return;
    }

    // Split by pipe to get variable and filters
    const parts = expression.split("|").map((p) => p.trim());
    const variableName = parts[0];
    const filters = parts.slice(1);

    // Validate variable name
    if (!this.isValidIdentifier(variableName)) {
      errors.push({
        message: `Invalid variable name: ${variableName}`,
        line,
        column,
        severity: "error",
        context: this.getContext(lines, line, column),
      });
    } else {
      variables.add(variableName);
    }

    // Validate filters
    for (const filter of filters) {
      if (!filter) {
        errors.push({
          message: "Empty filter name after '|'",
          line,
          column,
          severity: "error",
          context: this.getContext(lines, line, column),
        });
      } else if (!this.isValidFilterName(filter)) {
        warnings.push({
          message: `Unknown or invalid filter: ${filter}`,
          line,
          column,
          severity: "warning",
          context: this.getContext(lines, line, column),
        });
      }
    }
  }

  /**
   * Checks if a string is a valid identifier (variable or array name)
   * Supports dot notation for nested properties
   *
   * @param name - Identifier to check
   * @returns true if valid identifier
   */
  private isValidIdentifier(name: string): boolean {
    if (!name) return false;

    // Support dot notation for nested properties
    const parts = name.split(".");
    for (const part of parts) {
      // Each part must be a valid JavaScript identifier
      if (!/^[a-zA-Z_$][\w$]*$/.test(part)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Checks if a filter name is valid
   * Note: This checks both syntax and if the filter is known
   *
   * @param name - Filter name to check
   * @returns true if valid and known filter name
   */
  private isValidFilterName(name: string): boolean {
    // Filter names can include hyphens and underscores
    if (!/^[a-zA-Z_][\w-]*$/.test(name)) {
      return false;
    }
    // Check if it's a known filter
    return this.knownFilters.has(name);
  }

  /**
   * Gets context around an error location
   *
   * @param lines - Template lines
   * @param line - Line number (1-indexed)
   * @param column - Column number (1-indexed)
   * @returns Context string showing the error location
   */
  private getContext(lines: string[], line: number, column: number): string {
    if (line < 1 || line > lines.length) {
      return "";
    }

    const errorLine = lines[line - 1];
    const pointer = " ".repeat(Math.max(0, column - 1)) + "^";

    return `${errorLine}\n${pointer}`;
  }

  /**
   * Validates that all required variables are present in the context
   *
   * @param template - Template string
   * @param context - Context object with variable values
   * @returns Validation result with missing variables
   */
  validateContext(
    template: string,
    context: Record<string, unknown>,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // First validate the template syntax
    const syntaxResult = this.validate(template);
    if (!syntaxResult.valid) {
      return syntaxResult;
    }

    // Check for missing variables
    const contextKeys = new Set(Object.keys(context));
    const missingVars: string[] = [];

    for (const variable of syntaxResult.variables) {
      // For nested properties, only check the root
      const rootVar = variable.split(".")[0];
      if (!contextKeys.has(rootVar)) {
        missingVars.push(variable);
      }
    }

    if (missingVars.length > 0) {
      warnings.push({
        message: `Missing variables in context: ${missingVars.join(", ")}`,
        severity: "warning",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      variables: syntaxResult.variables,
    };
  }

  /**
   * Formats validation errors into a human-readable string
   *
   * @param result - Validation result
   * @returns Formatted error message
   */
  formatErrors(result: ValidationResult): string {
    if (result.valid && result.warnings.length === 0) {
      return "Template is valid";
    }

    const lines: string[] = [];

    if (result.errors.length > 0) {
      lines.push("Template Validation Errors:");
      for (const error of result.errors) {
        lines.push("");
        lines.push(`  [ERROR] ${error.message}`);
        if (error.line !== undefined) {
          lines.push(`    at line ${error.line}, column ${error.column}`);
        }
        if (error.context) {
          lines.push("");
          lines.push(
            error.context
              .split("\n")
              .map((l) => `    ${l}`)
              .join("\n"),
          );
        }
      }
    }

    if (result.warnings.length > 0) {
      if (lines.length > 0) lines.push("");
      lines.push("Template Validation Warnings:");
      for (const warning of result.warnings) {
        lines.push("");
        lines.push(`  [WARNING] ${warning.message}`);
        if (warning.line !== undefined) {
          lines.push(`    at line ${warning.line}, column ${warning.column}`);
        }
        if (warning.context) {
          lines.push("");
          lines.push(
            warning.context
              .split("\n")
              .map((l) => `    ${l}`)
              .join("\n"),
          );
        }
      }
    }

    return lines.join("\n");
  }
}

/**
 * Creates a template validator instance
 *
 * @returns TemplateValidator instance
 */
export function createTemplateValidator(): TemplateValidator {
  return new TemplateValidator();
}
