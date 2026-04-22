// Core type definitions for the NeuroCode Skills system

/**
 * Scope of a skill - determines where it's stored and who can access it.
 * - 'user': Stored in ~/.neurocode/skills/, available only to current user
 * - 'workspace': Stored in .neurocode/skills/, available to all workspace users
 */
export type SkillScope = "user" | "workspace";

/**
 * A registered skill with all metadata and content.
 */
export interface Skill {
  /** Unique identifier for the skill, used as the slash command */
  name: string;
  /** Brief explanation of when to use the skill, used for automatic loading decisions */
  description: string;
  /** Markdown content containing the skill instructions */
  content: string;
  /** Scope of the skill (user-level or workspace-level) */
  scope: SkillScope;
  /** Absolute file system path to the SKILL.md file */
  path: string;
  /** Optional namespace for grouped skills (e.g., 'parent' for 'parent:child') */
  namespace?: string;
}

/**
 * Parsed skill data extracted from a SKILL.md file.
 * This is the intermediate representation after parsing but before registration.
 */
export interface ParsedSkill {
  /** Skill name from frontmatter */
  name: string;
  /** Skill description from frontmatter */
  description: string;
  /** Markdown content after frontmatter */
  content: string;
}

/**
 * Parameters for creating a new skill.
 */
export interface CreateSkillParams {
  /** Unique name for the skill (must match pattern: ^[a-z0-9-]+(:[a-z0-9-]+)?$) */
  name: string;
  /** Description of when to use the skill */
  description: string;
  /** Markdown content with skill instructions */
  content: string;
  /** Where to store the skill (user-level or workspace-level) */
  scope: SkillScope;
}

/**
 * Parameters for updating an existing skill.
 * All fields are optional - only provided fields will be updated.
 */
export interface UpdateSkillParams {
  /** Updated description */
  description?: string;
  /** Updated markdown content */
  content?: string;
}

/**
 * Filter criteria for listing skills.
 */
export interface SkillFilter {
  /** Filter by scope (user or workspace) */
  scope?: SkillScope;
  /** Filter by namespace (for grouped skills) */
  namespace?: string;
}

/**
 * A validation error with details about what went wrong.
 */
export interface ValidationError {
  /** Error code identifying the type of validation failure */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional line number where the error occurred */
  line?: number;
}

/**
 * A validation warning that doesn't prevent skill usage but should be addressed.
 */
export interface ValidationWarning {
  /** Warning code identifying the type of issue */
  code: string;
  /** Human-readable warning message */
  message: string;
}

/**
 * Result of validating a skill.
 */
export interface ValidationResult {
  /** Whether the skill passed validation */
  valid: boolean;
  /** List of validation errors (empty if valid) */
  errors: ValidationError[];
  /** List of validation warnings (may be present even if valid) */
  warnings: ValidationWarning[];
}

/**
 * A skill matched to a user's context with relevance scoring.
 * Used for automatic skill loading suggestions.
 */
export interface MatchedSkill {
  /** The matched skill */
  skill: Skill;
  /** Relevance score from 0 to 1 (higher is more relevant) */
  relevance: number;
  /** Explanation of why this skill was matched */
  reason: string;
}
