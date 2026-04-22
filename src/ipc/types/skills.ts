import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";

// =============================================================================
// Skills Schemas
// =============================================================================

export const SkillScopeSchema = z.enum(["user", "workspace"]);
export type SkillScope = z.infer<typeof SkillScopeSchema>;

export const SkillSchema = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
  scope: SkillScopeSchema,
  path: z.string(),
  namespace: z.string().optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const SkillFilterSchema = z.object({
  scope: SkillScopeSchema.optional(),
  namespace: z.string().optional(),
});
export type SkillFilter = z.infer<typeof SkillFilterSchema>;

export const CreateSkillParamsSchema = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
  scope: SkillScopeSchema,
});
export type CreateSkillParams = z.infer<typeof CreateSkillParamsSchema>;

export const UpdateSkillParamsSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
});
export type UpdateSkillParams = z.infer<typeof UpdateSkillParamsSchema>;

export const ValidationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  line: z.number().optional(),
});
export type ValidationError = z.infer<typeof ValidationErrorSchema>;

export const ValidationWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ValidationWarning = z.infer<typeof ValidationWarningSchema>;

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const ExecuteSkillParamsSchema = z.object({
  name: z.string(),
  /** Optional user-supplied argument string passed after the slash command */
  args: z.string().optional(),
});
export type ExecuteSkillParams = z.infer<typeof ExecuteSkillParamsSchema>;

export const ExecuteSkillResultSchema = z.object({
  /** Resolved skill content with args interpolated */
  content: z.string(),
  skill: SkillSchema,
});
export type ExecuteSkillResult = z.infer<typeof ExecuteSkillResultSchema>;

export const DiscoverSkillsResultSchema = z.object({
  discovered: z.number(),
  registered: z.number(),
});
export type DiscoverSkillsResult = z.infer<typeof DiscoverSkillsResultSchema>;

// =============================================================================
// Skills Contracts
// =============================================================================

export const skillContracts = {
  /** List all registered skills, with optional scope/namespace filter */
  list: defineContract({
    channel: "skills:list",
    input: SkillFilterSchema.optional(),
    output: z.array(SkillSchema),
  }),

  /** Get a single skill by name */
  get: defineContract({
    channel: "skills:get",
    input: z.string(), // skill name
    output: SkillSchema,
  }),

  /** Create a new skill (writes SKILL.md to disk and registers it) */
  create: defineContract({
    channel: "skills:create",
    input: CreateSkillParamsSchema,
    output: SkillSchema,
  }),

  /** Update an existing skill's description and/or content */
  update: defineContract({
    channel: "skills:update",
    input: UpdateSkillParamsSchema,
    output: SkillSchema,
  }),

  /** Delete a skill by name (removes directory from disk and unregisters it) */
  delete: defineContract({
    channel: "skills:delete",
    input: z.string(), // skill name
    output: z.object({ success: z.boolean() }),
  }),

  /** Execute a skill by name, returning its resolved content */
  execute: defineContract({
    channel: "skills:execute",
    input: ExecuteSkillParamsSchema,
    output: ExecuteSkillResultSchema,
  }),

  /** Validate a skill's SKILL.md content without persisting it */
  validate: defineContract({
    channel: "skills:validate",
    input: z.string(), // raw SKILL.md content
    output: ValidationResultSchema,
  }),

  /** Trigger a full re-scan of all skill directories */
  discover: defineContract({
    channel: "skills:discover",
    input: z.void(),
    output: DiscoverSkillsResultSchema,
  }),
} as const;

// =============================================================================
// Skills Client
// =============================================================================

export const skillClient = createClient(skillContracts);
