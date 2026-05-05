/**
 * Template Engine with Variable Substitution and Conditional Rendering
 *
 * This module provides template rendering with variable substitution,
 * transformation filters, conditional sections, loops, and proper escaping
 * for TypeScript code generation.
 *
 * Requirements:
 * - 5.3: Support variable substitution with proper escaping for component names, types, and paths
 * - 5.4: Support conditional sections in templates based on generation options
 *
 * Syntax:
 * - Variable substitution: {{variableName}}
 * - With transformation: {{variableName | pascalCase}}
 * - Multiple filters: {{variableName | camelCase | uppercase}}
 * - Conditional sections: {{#if condition}}...{{/if}}
 * - Loops: {{#each items}}...{{/each}}
 * - Nested conditionals and loops are supported
 */

/**
 * Context object for template rendering
 */
export interface TemplateContext {
  [key: string]: unknown;
}

/**
 * Transformation filter function
 */
export type TransformFilter = (value: string) => string;

/**
 * Template engine for rendering templates with variable substitution
 */
export class TemplateEngine {
  private filters: Map<string, TransformFilter>;

  constructor() {
    this.filters = new Map();
    this.registerDefaultFilters();
  }

  /**
   * Renders a template with the given context
   *
   * @param template - Template string with {{variable}} placeholders, conditionals, and loops
   * @param context - Context object with variable values
   * @returns Rendered template string
   */
  render(template: string, context: TemplateContext): string {
    // Process blocks (conditionals and loops) recursively
    // This also processes variables within each block with the correct context
    const processed = this.processBlocks(template, context);

    // Then, replace any remaining variables at the top level
    return this.processVariables(processed, context);
  }

  /**
   * Processes all block-level constructs (conditionals and loops) recursively
   *
   * @param template - Template string
   * @param context - Context object
   * @returns Template with blocks processed and variables replaced
   */
  private processBlocks(template: string, context: TemplateContext): string {
    let result = "";
    let pos = 0;

    while (pos < template.length) {
      // Look for the next block start
      const ifMatch = template.substring(pos).match(/^\{\{#if\s+([^}]+)\}\}/);
      const eachMatch = template
        .substring(pos)
        .match(/^\{\{#each\s+([^}]+)\}\}/);

      // Find which comes first (if any)
      let nextBlockType: "if" | "each" | null = null;
      let nextBlockMatch: RegExpMatchArray | null = null;

      if (ifMatch && eachMatch) {
        // Both found, use whichever comes first (they're both at pos, so just pick one)
        nextBlockType = "if";
        nextBlockMatch = ifMatch;
      } else if (ifMatch) {
        nextBlockType = "if";
        nextBlockMatch = ifMatch;
      } else if (eachMatch) {
        nextBlockType = "each";
        nextBlockMatch = eachMatch;
      }

      if (nextBlockType && nextBlockMatch) {
        // Found a block start
        const blockHeaderEnd = pos + nextBlockMatch[0].length;
        const blockType = nextBlockType;
        const blockParam = nextBlockMatch[1].trim();

        // Find the matching closing tag
        const closingTag = blockType === "if" ? "{{/if}}" : "{{/each}}";
        const openingPattern =
          blockType === "if"
            ? /\{\{#if\s+[^}]+\}\}/g
            : /\{\{#each\s+[^}]+\}\}/g;

        let depth = 1;
        let searchPos = blockHeaderEnd;
        let blockContentEnd = -1;

        while (searchPos < template.length && depth > 0) {
          // Look for opening or closing tags
          const remainingTemplate = template.substring(searchPos);

          // Find next opening tag of same type
          openingPattern.lastIndex = 0;
          const nextOpening = openingPattern.exec(remainingTemplate);
          const nextOpeningPos = nextOpening
            ? searchPos + nextOpening.index
            : Infinity;

          // Find next closing tag
          const nextClosingPos = template.indexOf(closingTag, searchPos);

          if (nextClosingPos === -1) {
            // No closing tag found - this is an error, but we'll just break
            break;
          }

          // Check which comes first
          if (nextOpeningPos < nextClosingPos) {
            // Another opening tag before the closing tag - increase depth
            depth++;
            searchPos = nextOpeningPos + nextOpening![0].length;
          } else {
            // Closing tag comes first
            depth--;
            if (depth === 0) {
              blockContentEnd = nextClosingPos;
            } else {
              searchPos = nextClosingPos + closingTag.length;
            }
          }
        }

        if (blockContentEnd === -1) {
          // Couldn't find matching closing tag, just add the text and continue
          result += template.substring(pos, blockHeaderEnd);
          pos = blockHeaderEnd;
          continue;
        }

        // Extract the block content
        const blockContent = template.substring(
          blockHeaderEnd,
          blockContentEnd,
        );
        const blockEnd = blockContentEnd + closingTag.length;

        // Process the block
        if (blockType === "if") {
          const conditionValue = this.evaluateCondition(blockParam, context);
          if (conditionValue) {
            // Recursively process the content (blocks first, then variables)
            const processedBlocks = this.processBlocks(blockContent, context);
            const processedVars = this.processVariables(
              processedBlocks,
              context,
            );
            result += processedVars;
          }
        } else if (blockType === "each") {
          const arrayValue = this.getVariableValue(blockParam, context);
          if (Array.isArray(arrayValue)) {
            // Render the content for each item
            for (let i = 0; i < arrayValue.length; i++) {
              const item = arrayValue[i];
              const itemContext: TemplateContext = {
                ...context,
                this: item,
                "@index": i,
                "@first": i === 0,
                "@last": i === arrayValue.length - 1,
              };

              // If item is an object, merge its properties
              if (
                typeof item === "object" &&
                item !== null &&
                !Array.isArray(item)
              ) {
                Object.assign(itemContext, item);
              }

              // Recursively process the content (blocks first, then variables with item context)
              const processedBlocks = this.processBlocks(
                blockContent,
                itemContext,
              );
              const processedVars = this.processVariables(
                processedBlocks,
                itemContext,
              );
              result += processedVars;
            }
          }
        }

        pos = blockEnd;
      } else {
        // No block found, just add the next character
        result += template[pos];
        pos++;
      }
    }

    return result;
  }

  /**
   * Processes variables in a template (no blocks)
   *
   * @param template - Template string with only variables (no blocks)
   * @param context - Context object
   * @returns Template with variables replaced
   */
  private processVariables(template: string, context: TemplateContext): string {
    return template.replace(
      /\{\{([^}#/]+)\}\}/g,
      (match, expression: string) => {
        return this.evaluateExpression(expression.trim(), context);
      },
    );
  }

  /**
   * Evaluates a condition for {{#if}} blocks
   *
   * @param condition - Condition expression (variable name or path)
   * @param context - Context object
   * @returns true if condition is truthy, false otherwise
   */
  private evaluateCondition(
    condition: string,
    context: TemplateContext,
  ): boolean {
    let targetCondition = condition.trim();
    let isNegated = false;

    if (targetCondition.startsWith("!")) {
      isNegated = true;
      targetCondition = targetCondition.substring(1).trim();
    }

    const value = this.getVariableValue(targetCondition, context);

    // Treat as truthy/falsy
    let truthy = true;
    if (
      value === null ||
      value === undefined ||
      value === false ||
      value === ""
    ) {
      truthy = false;
    } else if (typeof value === "number" && value === 0) {
      truthy = false;
    } else if (Array.isArray(value) && value.length === 0) {
      truthy = false;
    }

    return isNegated ? !truthy : truthy;
  }

  /**
   * Evaluates a template expression (variable with optional filters)
   *
   * @param expression - Expression like "variableName" or "variableName | filter1 | filter2"
   * @param context - Context object with variable values
   * @returns Evaluated and transformed value
   */
  private evaluateExpression(
    expression: string,
    context: TemplateContext,
  ): string {
    // Split by pipe to get variable name and filters
    const parts = expression.split("|").map((part) => part.trim());
    const variableName = parts[0];
    const filterNames = parts.slice(1);

    // Get the variable value from context
    let value = this.getVariableValue(variableName, context);

    // Convert value to string
    let stringValue = this.valueToString(value);

    // Apply filters in sequence
    for (const filterName of filterNames) {
      const filter = this.filters.get(filterName);
      if (!filter) {
        throw new Error(
          `Unknown filter: ${filterName} in expression: ${expression}`,
        );
      }
      stringValue = filter(stringValue);
    }

    // Escape the final value for TypeScript strings
    return this.escapeForTypeScript(stringValue);
  }

  /**
   * Gets a variable value from the context, supporting nested paths
   *
   * @param variableName - Variable name (supports dot notation like "user.name")
   * @param context - Context object
   * @returns Variable value or empty string if not found
   */
  private getVariableValue(
    variableName: string,
    context: TemplateContext,
  ): unknown {
    // Support dot notation for nested properties
    const parts = variableName.split(".");
    let value: unknown = context;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return "";
      }
      if (typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return "";
      }
    }

    return value;
  }

  /**
   * Converts a value to string representation
   *
   * @param value - Value to convert
   * @returns String representation
   */
  private valueToString(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Escapes special characters for use in TypeScript strings
   *
   * This ensures that generated code is syntactically valid by escaping:
   * - Backslashes (\)
   * - Double quotes (")
   * - Single quotes (')
   * - Newlines (\n)
   * - Carriage returns (\r)
   * - Tabs (\t)
   * - Backticks (`)
   *
   * @param value - String value to escape
   * @returns Escaped string safe for TypeScript code
   */
  private escapeForTypeScript(value: string): string {
    return value
      .replace(/\\/g, "\\\\") // Backslash must be first
      .replace(/"/g, '\\"') // Double quotes
      .replace(/'/g, "\\'") // Single quotes
      .replace(/`/g, "\\`") // Backticks
      .replace(/\n/g, "\\n") // Newlines
      .replace(/\r/g, "\\r") // Carriage returns
      .replace(/\t/g, "\\t"); // Tabs
  }

  /**
   * Registers a custom transformation filter
   *
   * @param name - Filter name
   * @param filter - Filter function
   */
  registerFilter(name: string, filter: TransformFilter): void {
    this.filters.set(name, filter);
  }

  /**
   * Registers default transformation filters
   */
  private registerDefaultFilters(): void {
    // PascalCase: converts "hello-world" or "hello_world" to "HelloWorld"
    this.registerFilter("pascalCase", (value: string) => {
      return value
        .split(/[-_\s]+/)
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        )
        .join("");
    });

    // camelCase: converts "hello-world" or "hello_world" to "helloWorld"
    this.registerFilter("camelCase", (value: string) => {
      const pascalCase = this.filters.get("pascalCase")!(value);
      return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
    });

    // kebab-case: converts "HelloWorld" or "hello_world" to "hello-world"
    this.registerFilter("kebab-case", (value: string) => {
      return value
        .replace(/([a-z])([A-Z])/g, "$1-$2") // Insert hyphen between lowercase and uppercase
        .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
        .toLowerCase();
    });

    // snake_case: converts "HelloWorld" or "hello-world" to "hello_world"
    this.registerFilter("snake_case", (value: string) => {
      return value
        .replace(/([a-z])([A-Z])/g, "$1_$2") // Insert underscore between lowercase and uppercase
        .replace(/[\s-]+/g, "_") // Replace spaces and hyphens with underscores
        .toLowerCase();
    });

    // UPPER_CASE: converts any string to UPPER_CASE
    this.registerFilter("uppercase", (value: string) => {
      return value.toUpperCase();
    });

    // lowercase: converts any string to lowercase
    this.registerFilter("lowercase", (value: string) => {
      return value.toLowerCase();
    });

    // capitalize: capitalizes first letter
    this.registerFilter("capitalize", (value: string) => {
      if (value.length === 0) return value;
      return value.charAt(0).toUpperCase() + value.slice(1);
    });

    // trim: removes leading and trailing whitespace
    this.registerFilter("trim", (value: string) => {
      return value.trim();
    });
  }

  /**
   * Gets all registered filter names
   *
   * @returns Array of filter names
   */
  getFilterNames(): string[] {
    return Array.from(this.filters.keys());
  }

  /**
   * Checks if a filter is registered
   *
   * @param name - Filter name
   * @returns true if filter exists
   */
  hasFilter(name: string): boolean {
    return this.filters.has(name);
  }
}

/**
 * Creates a template engine instance
 *
 * @returns TemplateEngine instance
 */
export function createTemplateEngine(): TemplateEngine {
  return new TemplateEngine();
}
