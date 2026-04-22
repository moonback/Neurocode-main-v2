# Skills Documentation

## Overview

Skills are reusable instruction sets that extend NeuroCode's capabilities. A skill is defined in a `SKILL.md` file containing YAML frontmatter (metadata) and markdown content (instructions). Skills can be invoked explicitly via slash commands or automatically loaded when relevant to your current context.

## Quick Start

### Creating Your First Skill

1. Create a skill directory in one of the standard locations:
   - **User-level**: `~/.neurocode/skills/my-skill/`
   - **Workspace-level**: `.neurocode/skills/my-skill/`

2. Create a `SKILL.md` file in the directory:

```markdown
---
name: my-skill
description: A brief description of when to use this skill
---

# My Skill

Detailed instructions for what this skill does.

## Instructions

1. Step one...
2. Step two...
```

3. Restart NeuroCode or run skill discovery to register the new skill

4. Invoke the skill using `/my-skill` in the chat

## Skill File Format

### SKILL.md Structure

Every skill must have a `SKILL.md` file with the following structure:

```markdown
---
name: skill-name
description: Brief description for automatic loading
---

# Skill Title

Markdown content with instructions...
```

### Frontmatter Fields

| Field         | Required | Description                                                    |
| ------------- | -------- | -------------------------------------------------------------- |
| `name`        | Yes      | Skill identifier (lowercase, numbers, hyphens only)            |
| `description` | No       | Brief description used for automatic skill loading suggestions |

### Naming Rules

Skill names must follow these rules:

- **Lowercase letters only**: `a-z`
- **Numbers allowed**: `0-9`
- **Hyphens for separation**: `-`
- **No spaces or special characters**
- **Optional namespace**: `namespace:skill-name` for grouped skills

**Valid examples:**

- `lint`
- `fix-issue`
- `pr-review`
- `git:rebase` (grouped skill)

**Invalid examples:**

- `Lint` (uppercase)
- `fix_issue` (underscore)
- `pr review` (space)

## Skill Locations

### User-Level Skills

Location: `~/.neurocode/skills/`

- Available to you across all workspaces
- Personal skills not shared with team
- Lower priority than workspace skills

### Workspace-Level Skills

Location: `.neurocode/skills/` (relative to workspace root)

- Available to all team members
- Shared via version control
- Override user-level skills with same name
- Higher priority than user-level skills

### Priority Rules

When two skills have the same name:

1. **Workspace-level skills** take precedence
2. User-level skills are ignored

This allows teams to standardize workflows while letting individuals customize their personal setup.

## Invoking Skills

### Slash Commands

Invoke a skill explicitly by typing its name with a forward slash:

```
/skill-name
```

**With arguments:**

```
/skill-name arg1 arg2
```

Arguments are passed to the skill and can be referenced in the skill content using `$ARGUMENTS` or similar placeholders.

### Automatic Loading

NeuroCode can automatically suggest or load skills based on your message context:

1. You type a message in chat
2. NeuroCode analyzes the message against skill descriptions
3. Relevant skills are suggested or automatically loaded
4. You can accept or decline the suggestion

**Example:**

If you have a skill with `description: "Run pre-commit checks including formatting, linting, and type-checking"`, typing "I need to run linting" might automatically suggest that skill.

## Grouped Skills

Organize related skills under a common namespace for complex workflows.

### Structure

```
.neurocode/skills/
└── git/
    ├── rebase/
    │   └── SKILL.md  (name: git:rebase)
    ├── push/
    │   └── SKILL.md  (name: git:push)
    └── pr/
        └── SKILL.md  (name: git:pr)
```

### Invocation

```
/git:rebase
/git:push
/git:pr
```

### Parent Skill

If you invoke just the parent namespace without a sub-skill:

```
/git
```

NeuroCode will display available sub-skills under that namespace.

## Skill Management

### Listing Skills

View all registered skills with their names and descriptions through the Skills UI or by requesting a list in chat.

### Editing Skills

1. Navigate to the skill directory
2. Open `SKILL.md` in your editor
3. Modify frontmatter or content
4. Save the file
5. Skill updates are reflected immediately (or after discovery refresh)

### Deleting Skills

1. Delete the skill directory
2. Skill is automatically unregistered on next discovery

### Exporting Skills

Create a portable archive of a skill to share with others:

1. Use the export function in the Skills UI
2. Share the archive file
3. Recipients can import by extracting to their skills directory

## Skill Validation

NeuroCode validates skills when they are registered or modified.

### Validation Errors

These prevent the skill from being registered:

| Error                 | Description                         | Fix                                      |
| --------------------- | ----------------------------------- | ---------------------------------------- |
| `REQUIRED_NAME`       | Missing `name` field in frontmatter | Add `name: skill-name` to frontmatter    |
| `INVALID_NAME_FORMAT` | Name contains invalid characters    | Use only lowercase, numbers, and hyphens |
| `DUPLICATE_NAME`      | Skill name already exists           | Choose a different name                  |
| `FRONTMATTER_MISSING` | No YAML frontmatter found           | Add `---` markers around frontmatter     |
| `FRONTMATTER_INVALID` | YAML syntax error                   | Fix YAML syntax (check colons, quotes)   |

### Validation Warnings

These don't prevent registration but may affect functionality:

| Warning                | Description                              | Impact                                 |
| ---------------------- | ---------------------------------------- | -------------------------------------- |
| `REQUIRED_DESCRIPTION` | Missing `description` field              | Skill won't be suggested automatically |
| `EMPTY_CONTENT`        | No instruction content after frontmatter | Skill has no instructions to execute   |

## Best Practices

### Writing Effective Skills

1. **Clear descriptions**: Write descriptions that match how users would naturally describe the task
2. **Structured instructions**: Use numbered lists or clear sections
3. **Document arguments**: If your skill accepts arguments, document them clearly
4. **Test thoroughly**: Invoke the skill multiple times to ensure it works as expected

### Organizing Skills

1. **Use namespaces for related skills**: Group similar workflows under a common namespace
2. **Workspace vs user**: Put team-wide standards in workspace, personal preferences in user-level
3. **Version control**: Commit workspace skills to share with your team
4. **Avoid duplication**: Check existing skills before creating new ones

### Skill Content Guidelines

1. **Be specific**: Provide exact commands, file paths, or procedures
2. **Handle errors**: Include troubleshooting steps for common issues
3. **Reference documentation**: Link to relevant docs or resources
4. **Keep it updated**: Review and update skills as workflows change

## Examples

### Example 1: Simple Linting Skill

````markdown
---
name: lint
description: Run pre-commit checks including formatting, linting, and type-checking
---

# Lint

Run all pre-commit checks to ensure code quality.

## Instructions

1. Run formatting check:
   ```sh
   npm run fmt
   ```
````

2. Run linting:

   ```sh
   npm run lint
   ```

3. Run type-checking:

   ```sh
   npm run ts
   ```

4. If any checks fail, fix the issues and re-run.

````

### Example 2: Skill with Arguments

```markdown
---
name: fix-issue
description: Fix a GitHub issue by analyzing the problem and implementing a solution
---

# Fix Issue

Analyze and fix a GitHub issue.

## Arguments

- `$ISSUE_NUMBER`: The GitHub issue number to fix

## Instructions

1. Fetch the issue details for issue #$ISSUE_NUMBER
2. Analyze the problem description
3. Identify affected files
4. Implement the fix
5. Add tests if applicable
6. Create a PR referencing the issue
````

### Example 3: Grouped Skills

````markdown
---
name: git:rebase
description: Rebase current branch on latest main
---

# Git Rebase

Rebase the current branch on the latest main branch.

## Instructions

1. Fetch latest changes:
   ```sh
   git fetch origin main
   ```
````

2. Rebase on main:

   ```sh
   git rebase origin/main
   ```

3. If conflicts occur:
   - Resolve conflicts in affected files
   - Stage resolved files: `git add <file>`
   - Continue rebase: `git rebase --continue`

4. Force push if already pushed:
   ```sh
   git push --force-with-lease
   ```

```

## Troubleshooting

### Skill Not Found

**Problem**: `/my-skill` returns "Skill not found"

**Solutions**:
1. Check the skill name matches the `name` field in frontmatter
2. Verify the skill directory is in a standard location
3. Run skill discovery to refresh the registry
4. Check for validation errors in the skill file

### Skill Not Auto-Loading

**Problem**: Skill isn't suggested automatically

**Solutions**:
1. Add or improve the `description` field in frontmatter
2. Make the description match how users would describe the task
3. Check that the skill passed validation
4. Verify automatic loading is enabled in settings

### Workspace Skill Not Overriding User Skill

**Problem**: User-level skill is being used instead of workspace skill

**Solutions**:
1. Verify both skills have the exact same `name` field
2. Check that the workspace skill is in `.neurocode/skills/`
3. Run skill discovery to refresh the registry
4. Restart NeuroCode if changes aren't reflected

### Validation Errors

**Problem**: Skill fails validation

**Solutions**:
1. Check the error message for specific issues
2. Verify YAML frontmatter syntax (colons, quotes, indentation)
3. Ensure `name` field uses only lowercase, numbers, and hyphens
4. Add missing required fields (`name`)

## Advanced Topics

### Skill References

Skills can reference additional files in their directory:

```

.neurocode/skills/my-skill/
├── SKILL.md
├── references/
│ ├── api-spec.yaml
│ └── examples.md
└── scripts/
└── helper.sh

````

Reference these files in your skill content:

```markdown
See `references/api-spec.yaml` for API details.
Run `scripts/helper.sh` for setup.
````

### Dynamic Content

Use placeholders in skill content that can be replaced at invocation time:

- `$ARGUMENTS`: All arguments passed to the skill
- `$ARG1`, `$ARG2`, etc.: Individual arguments
- `$WORKSPACE`: Current workspace path
- `$USER`: Current user name

### Skill Templates

Create template skills that users can copy and customize:

```markdown
---
name: template-skill
description: Template for creating new skills
---

# Template Skill

Replace this with your skill description.

## Arguments

- `$ARG1`: Description of first argument

## Instructions

1. Replace these instructions with your workflow
2. Add specific commands or procedures
3. Test thoroughly before sharing
```

## API Reference

### IPC Endpoints

For programmatic access to skills:

| Endpoint          | Input                | Output             | Description                |
| ----------------- | -------------------- | ------------------ | -------------------------- |
| `skills:list`     | `SkillFilter?`       | `Skill[]`          | List all registered skills |
| `skills:get`      | `string` (name)      | `Skill \| null`    | Get skill by name          |
| `skills:create`   | `CreateSkillParams`  | `Skill`            | Create a new skill         |
| `skills:update`   | `UpdateSkillParams`  | `Skill`            | Update existing skill      |
| `skills:delete`   | `string` (name)      | `void`             | Delete a skill             |
| `skills:execute`  | `ExecuteSkillParams` | `ExecutionResult`  | Execute a skill            |
| `skills:validate` | `string` (content)   | `ValidationResult` | Validate skill content     |
| `skills:discover` | `void`               | `Skill[]`          | Discover and register all  |

### TypeScript Types

```typescript
interface Skill {
  name: string;
  description: string;
  content: string;
  scope: "user" | "workspace";
  path: string;
  namespace?: string;
}

interface CreateSkillParams {
  name: string;
  description: string;
  content: string;
  scope: "user" | "workspace";
}

interface UpdateSkillParams {
  name: string;
  description?: string;
  content?: string;
}

interface SkillFilter {
  scope?: "user" | "workspace";
  namespace?: string;
}
```

## FAQ

**Q: Can I use skills across different workspaces?**  
A: Yes, user-level skills (`~/.neurocode/skills/`) are available in all workspaces.

**Q: How do I share skills with my team?**  
A: Place skills in `.neurocode/skills/` and commit to version control.

**Q: Can skills call other skills?**  
A: Yes, reference other skills in your skill content using their slash commands.

**Q: What happens if I have the same skill at user and workspace level?**  
A: Workspace-level skills always take precedence over user-level skills.

**Q: Can I disable automatic skill loading?**  
A: Yes, check the settings to disable automatic skill suggestions.

**Q: How do I debug a skill that isn't working?**  
A: Check validation errors, verify the skill is registered (list all skills), and test with simple content first.

**Q: Can skills modify files or run commands?**  
A: Skills provide instructions to NeuroCode, which then executes them. The skill content itself doesn't directly modify files.

**Q: What's the difference between a skill and a command?**  
A: Skills are instruction sets for NeuroCode to follow. Commands are specific actions NeuroCode can execute.

## Related Documentation

- [Architecture Documentation](architecture.md) - System architecture overview
- [Agent Architecture](agent_architecture.md) - Agent system design
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to NeuroCode

## Support

For issues or questions:

1. Check this documentation first
2. Review validation errors and warnings
3. Test with a minimal skill example
4. Check the NeuroCode logs for detailed error messages
