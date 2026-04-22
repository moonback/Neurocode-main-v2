# Design Document: NeuroCode Skills

## Overview

This document describes the technical design for extending NeuroCode with a skills functionality. Skills allow users to create, manage, and share reusable instruction sets that extend NeuroCode's capabilities. A skill is defined in a SKILL.md file containing YAML frontmatter (metadata) and markdown content (instructions).

### Goals

- Enable users to define reusable instruction sets in a structured file format
- Support automatic discovery and registration of skills from standard locations
- Provide slash command invocation for explicit skill triggering
- Implement automatic skill loading based on context relevance
- Support skill creation, management, and sharing workflows
- Enable grouping of related skills under namespaces

### Non-Goals

- Real-time collaborative skill editing
- Skill versioning and rollback (future consideration)
- Skill marketplace or centralized registry (future consideration)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Renderer Process                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Skill UI     │  │ Chat Input   │  │ Skill Matcher UI     │  │
│  │ Components   │  │ Component    │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐│
│  │              skillClient (IPC Client)                      ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ IPC (electron.ipcRenderer.invoke)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Main Process                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐│
│  │              Skill Registry (Singleton)                    ││
│  │  - discoverAndRegister()                                   ││
│  │  - register(skillPath, scope)                              ││
│  │  - unregister(name)                                        ││
│  │  - get(name)                                               ││
│  │  - list()                                                  ││
│  │  - findMatching(query)                                     ││
│  └────────────────────────────────────────────────────────────┘│
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                  │
│         ▼                 ▼                 ▼                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐        │
│  │ Skill       │  │ Skill       │  │ Context         │        │
│  │ Parser      │  │ Validator   │  │ Matcher         │        │
│  └─────────────┘  └─────────────┘  └─────────────────┘        │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐│
│  │              Skill Handlers (IPC Handlers)                 ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       File System                               │
├─────────────────────────────────────────────────────────────────┤
│  ~/.neurocode/skills/          (user-level skills)             │
│  .neurocode/skills/            (workspace-level skills)        │
│                                                                 │
│  Each skill directory contains:                                 │
│  - SKILL.md (required)                                          │
│  - references/ (optional - additional reference files)          │
│  - scripts/ (optional - helper scripts)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component           | Responsibility                                                                          |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Skill Registry**  | Central registry for all discovered skills, handles discovery, registration, and lookup |
| **Skill Parser**    | Parses SKILL.md files, extracts frontmatter and content                                 |
| **Skill Validator** | Validates skill structure, naming conventions, and required fields                      |
| **Context Matcher** | Matches user context to skill descriptions for automatic loading                        |
| **Skill Handlers**  | IPC handlers for skill CRUD operations and execution                                    |

## Components and Interfaces

### Skill Parser

The Skill Parser is responsible for parsing SKILL.md files and extracting structured data.

```typescript
// src/skills/skill_parser.ts

export interface ParsedSkill {
  name: string;
  description: string;
  content: string;
}

export interface SkillParseError {
  message: string;
  line?: number;
}

export class SkillParser {
  /**
   * Parse a SKILL.md file content into a structured skill object.
   */
  parse(content: string): Result<ParsedSkill, SkillParseError>;

  /**
   * Serialize a skill object back to SKILL.md format.
   */
  serialize(skill: ParsedSkill): string;
}
```

**Parsing Algorithm:**

1. Extract content between `---` markers as YAML frontmatter
2. Parse YAML to extract `name` and `description` fields
3. Extract remaining content as markdown instructions
4. Validate required fields are present
5. Return structured skill object

### Skill Registry

The Skill Registry manages skill discovery, registration, and lookup.

```typescript
// src/skills/skill_registry.ts

export type SkillScope = "user" | "workspace";

export interface Skill {
  name: string;
  description: string;
  content: string;
  scope: SkillScope;
  path: string;
  namespace?: string;
}

export interface MatchedSkill {
  skill: Skill;
  relevance: number; // 0-1 score
  reason: string;
}

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  /**
   * Scan standard locations and register all discovered skills.
   */
  async discoverAndRegister(): Promise<void>;

  /**
   * Register a skill from a file path.
   */
  async register(
    skillPath: string,
    scope: SkillScope,
  ): Promise<Result<Skill, Error>>;

  /**
   * Unregister a skill by name.
   */
  unregister(name: string): void;

  /**
   * Get a skill by name.
   */
  get(name: string): Skill | undefined;

  /**
   * List all registered skills.
   */
  list(): Skill[];

  /**
   * Find skills matching a context query.
   */
  async findMatching(query: string): Promise<MatchedSkill[]>;
}
```

**Discovery Process:**

1. On NeuroCode startup, scan `~/.neurocode/skills/` (user-level)
2. Scan `.neurocode/skills/` relative to current workspace (workspace-level)
3. For each directory containing a SKILL.md file:
   - Parse and validate the skill
   - Register in memory
4. Workspace-level skills override user-level skills with same name

### Skill Validator

The Skill Validator ensures skill files conform to the expected format.

```typescript
// src/skills/skill_validator.ts

export interface ValidationError {
  code: string;
  message: string;
  line?: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export class SkillValidator {
  validate(skill: ParsedSkill): ValidationResult;
  validateName(name: string): boolean;
}
```

**Validation Rules:**

| Rule                   | Level   | Description                                                         |
| ---------------------- | ------- | ------------------------------------------------------------------- |
| `REQUIRED_NAME`        | Error   | `name` field is required in frontmatter                             |
| `REQUIRED_DESCRIPTION` | Warning | `description` field recommended for auto-loading                    |
| `INVALID_NAME_FORMAT`  | Error   | Name must match pattern `^[a-z0-9-]+$` or `^[a-z0-9-]+:[a-z0-9-]+$` |
| `EMPTY_CONTENT`        | Warning | Skill has no instruction content                                    |
| `DUPLICATE_NAME`       | Error   | Skill name already registered (for workspace override)              |

### Context Matcher

The Context Matcher determines which skills are relevant to the current user context.

```typescript
// src/skills/context_matcher.ts

export class ContextMatcher {
  /**
   * Find skills that match the given context.
   */
  async match(context: string, skills: Skill[]): Promise<MatchedSkill[]>;
}
```

**Matching Strategy:**

1. Tokenize user message
2. Compare tokens against skill descriptions using keyword matching
3. Rank by relevance score
4. Return top matches above threshold

## Data Models

### Skill File Format (SKILL.md)

```markdown
---
name: lint
description: Run pre-commit checks including formatting, linting, and type-checking.
---

# Lint

Run pre-commit checks including formatting, linting, and type-checking.

## Arguments

- `$ARGUMENTS`: (Optional) Specific files to lint.

## Instructions

1. Run formatting check...
```

### TypeScript Interfaces

```typescript
// src/skills/types.ts

export interface Skill {
  name: string;
  description: string;
  content: string;
  scope: SkillScope;
  path: string;
  namespace?: string;
}

export type SkillScope = "user" | "workspace";

export interface CreateSkillParams {
  name: string;
  description: string;
  content: string;
  scope: SkillScope;
}

export interface UpdateSkillParams {
  description?: string;
  content?: string;
}

export interface SkillFilter {
  scope?: SkillScope;
  namespace?: string;
}
```

## IPC Endpoints

### Contracts Definition

```typescript
// src/ipc/types/skills.ts
import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";

// Schemas
export const SkillSchema = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
  scope: z.enum(["user", "workspace"]),
  path: z.string(),
  namespace: z.string().nullable(),
});

export const CreateSkillParamsSchema = z.object({
  name: z
    .string()
    .regex(/^[a-z0-9-]+(:[a-z0-9-]+)?$/, "Invalid skill name format"),
  description: z.string().min(1, "Description is required"),
  content: z.string().min(1, "Content is required"),
  scope: z.enum(["user", "workspace"]),
});

export const UpdateSkillParamsSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
});

export const SkillFilterSchema = z.object({
  scope: z.enum(["user", "workspace"]).optional(),
  namespace: z.string().optional(),
});

export const ExecuteSkillParamsSchema = z.object({
  name: z.string(),
  args: z.array(z.string()).optional(),
});

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      line: z.number().optional(),
    }),
  ),
  warnings: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
    }),
  ),
});

// Contracts
export const skillContracts = {
  list: defineContract({
    channel: "skills:list",
    input: SkillFilterSchema.optional(),
    output: z.array(SkillSchema),
  }),

  get: defineContract({
    channel: "skills:get",
    input: z.string(), // name
    output: SkillSchema.nullable(),
  }),

  create: defineContract({
    channel: "skills:create",
    input: CreateSkillParamsSchema,
    output: SkillSchema,
  }),

  update: defineContract({
    channel: "skills:update",
    input: UpdateSkillParamsSchema,
    output: SkillSchema,
  }),

  delete: defineContract({
    channel: "skills:delete",
    input: z.string(), // name
    output: z.void(),
  }),

  execute: defineContract({
    channel: "skills:execute",
    input: ExecuteSkillParamsSchema,
    output: z.object({
      success: z.boolean(),
      error: z.string().optional(),
      content: z.string().optional(),
    }),
  }),

  validate: defineContract({
    channel: "skills:validate",
    input: z.string(), // skill content
    output: ValidationResultSchema,
  }),

  discover: defineContract({
    channel: "skills:discover",
    input: z.void(),
    output: z.array(SkillSchema),
  }),
};

export const skillClient = createClient(skillContracts);
```

### Handler Registration

```typescript
// src/ipc/handlers/skill_handlers.ts
import { createTypedHandler } from "./base";
import { skillContracts } from "../types/skills";
import { skillRegistry } from "@/skills/skill_registry";
import { skillValidator } from "@/skills/skill_validator";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

export function registerSkillHandlers() {
  createTypedHandler(skillContracts.list, async (_, filter) => {
    return skillRegistry.list(filter);
  });

  createTypedHandler(skillContracts.get, async (_, name) => {
    return skillRegistry.get(name) ?? null;
  });

  createTypedHandler(skillContracts.create, async (_, params) => {
    const result = await skillRegistry.create(params);
    if (!result.success) {
      throw new DyadError(result.error.message, DyadErrorKind.Validation);
    }
    return result.data;
  });

  createTypedHandler(skillContracts.update, async (_, params) => {
    const result = await skillRegistry.update(params.name, params);
    if (!result.success) {
      throw new DyadError(result.error.message, DyadErrorKind.Validation);
    }
    return result.data;
  });

  createTypedHandler(skillContracts.delete, async (_, name) => {
    await skillRegistry.delete(name);
  });

  createTypedHandler(skillContracts.execute, async (_, params) => {
    const skill = skillRegistry.get(params.name);
    if (!skill) {
      throw new DyadError(
        `Skill "${params.name}" not found. Available: ${skillRegistry
          .list()
          .map((s) => s.name)
          .join(", ")}`,
        DyadErrorKind.NotFound,
      );
    }
    return {
      success: true,
      content: skill.content,
    };
  });

  createTypedHandler(skillContracts.validate, async (_, content) => {
    return skillValidator.validateContent(content);
  });

  createTypedHandler(skillContracts.discover, async () => {
    await skillRegistry.discoverAndRegister();
    return skillRegistry.list();
  });
}
```

## Error Handling

### Error Types

```typescript
// src/errors/skill_errors.ts
import { DyadError, DyadErrorKind } from "./dyad_error";

export class SkillNotFoundError extends DyadError {
  constructor(skillName: string, availableSkills: string[]) {
    super(
      `Skill "${skillName}" not found. Available skills: ${availableSkills.join(", ")}`,
      DyadErrorKind.NotFound,
    );
  }
}

export class SkillValidationError extends DyadError {
  constructor(errors: ValidationError[]) {
    super(
      `Skill validation failed: ${errors.map((e) => e.message).join(", ")}`,
      DyadErrorKind.Validation,
    );
  }
}

export class SkillParseError extends DyadError {
  constructor(message: string, line?: number) {
    super(
      line
        ? `Parse error at line ${line}: ${message}`
        : `Parse error: ${message}`,
      DyadErrorKind.Validation,
    );
  }
}

export class SkillNameConflictError extends DyadError {
  constructor(name: string) {
    super(
      `Skill "${name}" already exists. Use a different name or delete the existing skill.`,
      DyadErrorKind.Conflict,
    );
  }
}
```

### Error Scenarios

| Scenario            | Error Type               | User Message                                                      |
| ------------------- | ------------------------ | ----------------------------------------------------------------- |
| Skill not found     | `SkillNotFoundError`     | "Skill 'xyz' not found. Available: /lint, /fix-issue"             |
| Invalid frontmatter | `SkillParseError`        | "Parse error at line 3: Missing required field 'name'"            |
| Invalid name format | `SkillValidationError`   | "Skill name must be lowercase letters, numbers, and hyphens only" |
| Duplicate name      | `SkillNameConflictError` | "Skill 'lint' already exists"                                     |
| File system error   | `Error` (wrapped)        | "Failed to read skill file: permission denied"                    |

## File Structure

```
src/
├── skills/
│   ├── index.ts                    # Public exports
│   ├── types.ts                    # Type definitions
│   ├── skill_parser.ts             # SKILL.md parser
│   ├── skill_validator.ts          # Validation logic
│   ├── skill_registry.ts           # Central registry
│   ├── context_matcher.ts          # Context matching
│   └── skill_manager.ts            # CRUD operations
├── ipc/
│   ├── types/
│   │   └── skills.ts               # IPC contracts
│   └── handlers/
│       └── skill_handlers.ts       # IPC handlers
└── components/
    └── skills/
        ├── SkillList.tsx           # List skills UI
        ├── SkillEditor.tsx         # Edit skill UI
        ├── SkillCreator.tsx        # Create skill UI
        └── SkillMatcher.tsx        # Auto-load suggestions UI
```

## Testing Strategy

### Unit Tests

Unit tests will cover pure business logic and utility functions:

- **Skill Parser**: Test parsing of valid/invalid SKILL.md files
- **Skill Validator**: Test validation rules and error messages
- **Context Matcher**: Test matching algorithm with various inputs
- **Name Resolution**: Test workspace vs user-level skill override

### Integration Tests

Integration tests will cover IPC handlers and file system operations:

- **Skill Discovery**: Test scanning and registration from file system
- **Skill CRUD**: Test create, read, update, delete operations via IPC
- **Skill Execution**: Test skill invocation with arguments
- **Error Handling**: Test error propagation through IPC boundary

### E2E Tests

E2E tests will cover user workflows:

- **Skill Creation Flow**: User creates a new skill via UI
- **Skill Invocation**: User invokes skill via slash command
- **Skill Management**: User lists, edits, and deletes skills
- **Automatic Loading**: Skills are suggested based on context

### Test File Locations

```
src/
  skills/
    __tests__/
      skill_parser.test.ts
      skill_validator.test.ts
      skill_matcher.test.ts
      skill_registry.test.ts
e2e-tests/
  skills.spec.ts
```
