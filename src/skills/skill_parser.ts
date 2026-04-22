import type { ParsedSkill, ValidationError } from "./types";

/**
 * Error thrown when parsing a SKILL.md file fails.
 */
export class SkillParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
  ) {
    super(
      line
        ? `Parse error at line ${line}: ${message}`
        : `Parse error: ${message}`,
    );
    this.name = "SkillParseError";
  }
}

/**
 * Simple YAML parser for frontmatter.
 * Handles basic key-value pairs with string values.
 */
class SimpleYamlParser {
  parse(yamlText: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = yamlText.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Parse key: value pairs
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();

      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }

    return result;
  }

  stringify(obj: Record<string, string>): string {
    return Object.entries(obj)
      .map(([key, value]) => {
        // Quote values that contain special characters
        const needsQuotes =
          value.includes(":") || value.includes("#") || value.includes("\n");
        const quotedValue = needsQuotes
          ? `"${value.replace(/"/g, '\\"')}"`
          : value;
        return `${key}: ${quotedValue}`;
      })
      .join("\n");
  }
}

/**
 * Result type for parse operations.
 */
export type ParseResult<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Parser for SKILL.md files.
 * Handles extraction of YAML frontmatter and markdown content.
 */
export class SkillParser {
  private static readonly FRONTMATTER_DELIMITER = "---";
  private readonly yamlParser = new SimpleYamlParser();

  /**
   * Parse a SKILL.md file content into a structured skill object.
   *
   * @param content - Raw content of the SKILL.md file
   * @returns ParseResult with either the parsed skill or an error
   *
   * @example
   * ```typescript
   * const parser = new SkillParser();
   * const result = parser.parse(fileContent);
   * if (result.success) {
   *   console.log(result.data.name);
   * } else {
   *   console.error(result.error.message);
   * }
   * ```
   */
  parse(content: string): ParseResult<ParsedSkill, ValidationError> {
    const lines = content.split("\n");

    // Find frontmatter boundaries
    const frontmatterStart = this.findFrontmatterStart(lines);
    if (frontmatterStart === -1) {
      return {
        success: false,
        error: {
          code: "MISSING_FRONTMATTER",
          message:
            "SKILL.md file must start with YAML frontmatter between --- markers",
          line: 1,
        },
      };
    }

    const frontmatterEnd = this.findFrontmatterEnd(lines, frontmatterStart);
    if (frontmatterEnd === -1) {
      return {
        success: false,
        error: {
          code: "UNCLOSED_FRONTMATTER",
          message: "YAML frontmatter must be closed with --- marker",
          line: frontmatterStart + 1,
        },
      };
    }

    // Extract and parse frontmatter
    const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
    const frontmatterText = frontmatterLines.join("\n");

    let frontmatter: Record<string, string>;
    try {
      frontmatter = this.yamlParser.parse(frontmatterText);
    } catch (error) {
      const yamlError = error as Error;
      return {
        success: false,
        error: {
          code: "INVALID_YAML",
          message: `Failed to parse YAML frontmatter: ${yamlError.message}`,
          line: frontmatterStart + 1,
        },
      };
    }

    // Validate required fields
    const nameValidation = this.validateRequiredField(
      frontmatter,
      "name",
      frontmatterStart,
    );
    if (!nameValidation.success) {
      return nameValidation;
    }

    const descriptionValidation = this.validateRequiredField(
      frontmatter,
      "description",
      frontmatterStart,
    );
    if (!descriptionValidation.success) {
      return descriptionValidation;
    }

    // Extract markdown content after frontmatter
    const contentLines = lines.slice(frontmatterEnd + 1);
    const markdownContent = contentLines.join("\n").trim();

    return {
      success: true,
      data: {
        name: frontmatter.name,
        description: frontmatter.description,
        content: markdownContent,
      },
    };
  }

  /**
   * Serialize a skill object back to SKILL.md format.
   * This enables round-trip parsing: parse → serialize → parse should produce equivalent results.
   *
   * @param skill - Parsed skill object to serialize
   * @returns SKILL.md formatted string
   *
   * @example
   * ```typescript
   * const parser = new SkillParser();
   * const skillMd = parser.serialize({
   *   name: "lint",
   *   description: "Run pre-commit checks",
   *   content: "# Lint\n\nRun checks..."
   * });
   * ```
   */
  serialize(skill: ParsedSkill): string {
    const frontmatter = {
      name: skill.name,
      description: skill.description,
    };

    const yamlContent = this.yamlParser.stringify(frontmatter);
    const delimiter = SkillParser.FRONTMATTER_DELIMITER;

    return `${delimiter}\n${yamlContent}\n${delimiter}\n\n${skill.content}`;
  }

  /**
   * Find the starting line of frontmatter (first --- marker).
   */
  private findFrontmatterStart(lines: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === SkillParser.FRONTMATTER_DELIMITER) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Find the ending line of frontmatter (second --- marker after start).
   */
  private findFrontmatterEnd(lines: string[], startIndex: number): number {
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].trim() === SkillParser.FRONTMATTER_DELIMITER) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Validate that a required field exists in the frontmatter.
   */
  private validateRequiredField(
    frontmatter: Record<string, string>,
    fieldName: string,
    frontmatterStartLine: number,
  ): ParseResult<void, ValidationError> {
    if (!(fieldName in frontmatter) || !frontmatter[fieldName]) {
      return {
        success: false,
        error: {
          code: `MISSING_${fieldName.toUpperCase()}`,
          message: `Required field '${fieldName}' is missing from frontmatter`,
          line: frontmatterStartLine + 1,
        },
      };
    }

    return { success: true, data: undefined };
  }
}
