/**
 * SkillParser - Parse and format skill files programmatically
 *
 * This class is responsible for:
 * - Parsing skill files into structured objects
 * - Formatting skill objects back to files
 * - Validating skill files against schema
 * - Providing descriptive error reporting with location info
 * - Ensuring round-trip consistency
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import type {
  ParsedSkill,
  ValidationResult,
  ValidationError,
} from "@/skills/types";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Parse result with success/error information
 */
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: ParseError;
}

/**
 * Parse error with location information
 */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  code: string;
}

/**
 * Skill frontmatter metadata
 */
export interface SkillFrontmatter {
  name: string;
  description: string;
}

/**
 * Format options for pretty printing
 */
export interface FormatOptions {
  indentSize?: number;
  lineWidth?: number;
  preserveWhitespace?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const FRONTMATTER_DELIMITER = "---";
const SKILL_NAME_PATTERN = /^[a-z0-9-]+(:[a-z0-9-]+)?$/;

// =============================================================================
// SkillParser Class
// =============================================================================

export class SkillParser {
  /**
   * Parse a skill file into a structured object
   *
   * @param content - Raw skill file content
   * @returns Parse result with skill data or error
   *
   * Requirements: 12.1
   */
  parseSkill(content: string): ParseResult<ParsedSkill> {
    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: {
            message: "Skill file is empty",
            line: 1,
            code: "EMPTY_FILE",
          },
        };
      }

      // Split content into lines for error reporting
      const lines = content.split("\n");

      // Check for frontmatter
      if (!lines[0]?.trim().startsWith(FRONTMATTER_DELIMITER)) {
        return {
          success: false,
          error: {
            message: "Skill file must start with frontmatter delimiter (---)",
            line: 1,
            code: "MISSING_FRONTMATTER_START",
          },
        };
      }

      // Find end of frontmatter
      let frontmatterEndLine = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i]?.trim() === FRONTMATTER_DELIMITER) {
          frontmatterEndLine = i;
          break;
        }
      }

      if (frontmatterEndLine === -1) {
        return {
          success: false,
          error: {
            message: "Frontmatter is not properly closed with ---",
            line: lines.length,
            code: "MISSING_FRONTMATTER_END",
          },
        };
      }

      // Extract frontmatter content
      const frontmatterLines = lines.slice(1, frontmatterEndLine);
      const frontmatterResult = this.parseFrontmatter(frontmatterLines);

      if (!frontmatterResult.success) {
        return {
          success: false,
          error: frontmatterResult.error,
        };
      }

      const frontmatter = frontmatterResult.data!;

      // Extract content after frontmatter
      const contentLines = lines.slice(frontmatterEndLine + 1);
      const skillContent = contentLines.join("\n").trim();

      if (!skillContent) {
        return {
          success: false,
          error: {
            message: "Skill content is empty",
            line: frontmatterEndLine + 1,
            code: "EMPTY_CONTENT",
          },
        };
      }

      return {
        success: true,
        data: {
          name: frontmatter.name,
          description: frontmatter.description,
          content: skillContent,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Unknown parsing error",
          code: "PARSE_ERROR",
        },
      };
    }
  }

  /**
   * Parse frontmatter YAML-like content
   *
   * @param lines - Frontmatter lines (without delimiters)
   * @returns Parse result with frontmatter data or error
   *
   * @private
   */
  private parseFrontmatter(lines: string[]): ParseResult<SkillFrontmatter> {
    const frontmatter: Partial<SkillFrontmatter> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim().length === 0) continue;

      // Parse key: value format
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) {
        return {
          success: false,
          error: {
            message: `Invalid frontmatter format: expected "key: value" but got "${line}"`,
            line: i + 2, // +2 because frontmatter starts at line 2 (after first ---)
            code: "INVALID_FRONTMATTER_FORMAT",
          },
        };
      }

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      if (!value) {
        return {
          success: false,
          error: {
            message: `Frontmatter field "${key}" has no value`,
            line: i + 2,
            code: "MISSING_FRONTMATTER_VALUE",
          },
        };
      }

      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, "");

      if (key === "name") {
        frontmatter.name = cleanValue;
      } else if (key === "description") {
        frontmatter.description = cleanValue;
      }
      // Ignore unknown fields for forward compatibility
    }

    // Validate required fields
    if (!frontmatter.name) {
      return {
        success: false,
        error: {
          message: "Frontmatter is missing required field: name",
          line: 2,
          code: "MISSING_REQUIRED_FIELD",
        },
      };
    }

    if (!frontmatter.description) {
      return {
        success: false,
        error: {
          message: "Frontmatter is missing required field: description",
          line: 2,
          code: "MISSING_REQUIRED_FIELD",
        },
      };
    }

    return {
      success: true,
      data: frontmatter as SkillFrontmatter,
    };
  }

  /**
   * Format a skill object back to a file string
   *
   * @param skill - Parsed skill object
   * @param options - Formatting options
   * @returns Formatted skill file content
   *
   * Requirements: 12.3, 12.4, 12.5
   */
  formatSkill(skill: ParsedSkill, _options: FormatOptions = {}): string {
    // Build frontmatter
    const frontmatter = [
      FRONTMATTER_DELIMITER,
      `name: ${skill.name}`,
      `description: ${skill.description}`,
      FRONTMATTER_DELIMITER,
    ].join("\n");

    // Combine frontmatter and content
    const formatted = `${frontmatter}\n\n${skill.content}\n`;

    return formatted;
  }

  /**
   * Validate a skill against schema
   *
   * @param skill - Parsed skill object
   * @returns Validation result with errors and warnings
   *
   * Requirements: 12.6
   */
  validateSkill(skill: ParsedSkill): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate name format
    if (!SKILL_NAME_PATTERN.test(skill.name)) {
      errors.push({
        code: "INVALID_NAME_FORMAT",
        message: `Skill name "${skill.name}" must match pattern: ${SKILL_NAME_PATTERN.source}`,
      });
    }

    // Validate name length
    if (skill.name.length > 50) {
      errors.push({
        code: "NAME_TOO_LONG",
        message: `Skill name "${skill.name}" exceeds maximum length of 50 characters`,
      });
    }

    // Validate description
    if (!skill.description || skill.description.trim().length === 0) {
      errors.push({
        code: "EMPTY_DESCRIPTION",
        message: "Skill description cannot be empty",
      });
    }

    if (skill.description && skill.description.length > 200) {
      errors.push({
        code: "DESCRIPTION_TOO_LONG",
        message: `Skill description exceeds maximum length of 200 characters (current: ${skill.description.length})`,
      });
    }

    // Validate content
    if (!skill.content || skill.content.trim().length === 0) {
      errors.push({
        code: "EMPTY_CONTENT",
        message: "Skill content cannot be empty",
      });
    }

    if (skill.content && skill.content.length < 10) {
      errors.push({
        code: "CONTENT_TOO_SHORT",
        message: "Skill content is too short (minimum 10 characters)",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validate a skill file before parsing
   *
   * @param content - Raw skill file content
   * @returns Validation result with errors
   *
   * Requirements: 12.6
   */
  validateSkillFile(content: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Basic file validation
    if (!content || content.trim().length === 0) {
      errors.push({
        code: "EMPTY_FILE",
        message: "Skill file is empty",
        line: 1,
      });
      return { valid: false, errors, warnings: [] };
    }

    // Try to parse and validate
    const parseResult = this.parseSkill(content);
    if (!parseResult.success) {
      errors.push({
        code: parseResult.error!.code,
        message: parseResult.error!.message,
        line: parseResult.error!.line,
      });
      return { valid: false, errors, warnings: [] };
    }

    // Validate parsed skill
    return this.validateSkill(parseResult.data!);
  }

  /**
   * Test round-trip consistency: parse → format → parse
   *
   * @param content - Original skill file content
   * @returns True if round-trip produces equivalent result
   *
   * Requirements: 12.3, 12.4, 12.5
   */
  testRoundTrip(content: string): boolean {
    try {
      // First parse
      const parseResult1 = this.parseSkill(content);
      if (!parseResult1.success) return false;

      const skill1 = parseResult1.data!;

      // Format
      const formatted = this.formatSkill(skill1);

      // Second parse
      const parseResult2 = this.parseSkill(formatted);
      if (!parseResult2.success) return false;

      const skill2 = parseResult2.data!;

      // Compare
      return (
        skill1.name === skill2.name &&
        skill1.description === skill2.description &&
        skill1.content.trim() === skill2.content.trim()
      );
    } catch {
      return false;
    }
  }

  /**
   * Get descriptive error message with location
   *
   * @param error - Parse error
   * @param content - Original content for context
   * @returns Formatted error message
   *
   * Requirements: 12.2
   */
  formatError(error: ParseError, content: string): string {
    const lines = content.split("\n");
    let message = `Error: ${error.message}\n`;

    if (
      error.line !== undefined &&
      error.line > 0 &&
      error.line <= lines.length
    ) {
      const line = lines[error.line - 1];
      message += `  at line ${error.line}: ${line}\n`;

      if (error.column !== undefined) {
        const pointer = " ".repeat(error.column + 2) + "^";
        message += `${pointer}\n`;
      }
    }

    message += `  (${error.code})`;

    return message;
  }
}
