import type {
  ParsedSkill,
  ValidationError,
  ValidationWarning,
  ValidationResult,
} from "./types";

/**
 * Validation rule codes for skill validation errors.
 */
export const ValidationRules = {
  REQUIRED_NAME: "REQUIRED_NAME",
  REQUIRED_DESCRIPTION: "REQUIRED_DESCRIPTION",
  INVALID_NAME_FORMAT: "INVALID_NAME_FORMAT",
  EMPTY_CONTENT: "EMPTY_CONTENT",
} as const;

/**
 * Regular expression for valid skill names.
 * Allows:
 * - Simple names: lowercase letters, numbers, hyphens (e.g., "lint", "fix-issue")
 * - Grouped names: namespace:skill-name (e.g., "dyad:lint", "team:code-review")
 */
const SKILL_NAME_PATTERN = /^[a-z0-9-]+(?::[a-z0-9-]+)?$/;

/**
 * Validator for skill files.
 * Ensures skills conform to the expected format and naming conventions.
 */
export class SkillValidator {
  /**
   * Validate a parsed skill object.
   *
   * @param skill - The parsed skill to validate
   * @returns ValidationResult with errors and warnings
   *
   * @example
   * ```typescript
   * const validator = new SkillValidator();
   * const result = validator.validate(parsedSkill);
   * if (!result.valid) {
   *   console.error("Validation errors:", result.errors);
   * }
   * if (result.warnings.length > 0) {
   *   console.warn("Validation warnings:", result.warnings);
   * }
   * ```
   */
  validate(skill: ParsedSkill): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate name field
    if (!skill.name || skill.name.trim() === "") {
      errors.push({
        code: ValidationRules.REQUIRED_NAME,
        message: "Skill name is required in frontmatter",
      });
    } else if (!this.validateName(skill.name)) {
      errors.push({
        code: ValidationRules.INVALID_NAME_FORMAT,
        message: `Skill name "${skill.name}" is invalid. Must be lowercase letters, numbers, and hyphens only. Optionally use namespace:skill-name format for grouped skills.`,
      });
    }

    // Validate description field (warning only)
    if (!skill.description || skill.description.trim() === "") {
      warnings.push({
        code: ValidationRules.REQUIRED_DESCRIPTION,
        message:
          "Skill description is recommended for automatic loading to work effectively",
      });
    }

    // Validate content (warning only)
    if (!skill.content || skill.content.trim() === "") {
      warnings.push({
        code: ValidationRules.EMPTY_CONTENT,
        message: "Skill has no instruction content",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a skill name format.
   *
   * Valid formats:
   * - Simple: "lint", "fix-issue", "code-review"
   * - Grouped: "dyad:lint", "team:code-review"
   *
   * Invalid formats:
   * - Uppercase letters: "Lint", "FIX-ISSUE"
   * - Spaces: "fix issue"
   * - Special characters: "fix_issue", "fix.issue"
   * - Multiple colons: "team:sub:skill"
   *
   * @param name - The skill name to validate
   * @returns true if the name is valid, false otherwise
   *
   * @example
   * ```typescript
   * const validator = new SkillValidator();
   * validator.validateName("lint"); // true
   * validator.validateName("dyad:lint"); // true
   * validator.validateName("Fix-Issue"); // false (uppercase)
   * validator.validateName("fix_issue"); // false (underscore)
   * ```
   */
  validateName(name: string): boolean {
    return SKILL_NAME_PATTERN.test(name);
  }

  /**
   * Validate skill content.
   *
   * @param content - The skill content to validate
   * @returns ValidationResult with warnings if content is empty
   *
   * @example
   * ```typescript
   * const validator = new SkillValidator();
   * const result = validator.validateContent("");
   * // result.warnings will contain EMPTY_CONTENT warning
   * ```
   */
  validateContent(content: string): ValidationResult {
    const warnings: ValidationWarning[] = [];

    if (!content || content.trim() === "") {
      warnings.push({
        code: ValidationRules.EMPTY_CONTENT,
        message: "Skill has no instruction content",
      });
    }

    return {
      valid: true, // Content validation only produces warnings, not errors
      errors: [],
      warnings,
    };
  }
}
