# Example Skills

This directory contains example skills that demonstrate common development workflows. These skills serve as templates and learning resources for creating your own custom skills.

## Available Example Skills

### Code Review (`/examples:code-review`)

Perform a thorough code review focusing on correctness, security, and best practices.

**Use when:** You need to review code changes, PRs, or new implementations.

### Debug Error (`/examples:debug-error`)

Debug an error or exception by analyzing stack traces, logs, and relevant code.

**Use when:** You encounter an error or exception and need systematic debugging.

### Write Tests (`/examples:write-tests`)

Write comprehensive unit or integration tests for a given function or component.

**Use when:** You need to add test coverage for existing or new code.

### Refactor Code (`/examples:refactor-code`)

Refactor code to improve readability, maintainability, or performance while preserving behavior.

**Use when:** Code needs improvement but behavior should remain unchanged.

### Add Feature (`/examples:add-feature`)

Add a new feature to the codebase following best practices and project conventions.

**Use when:** Implementing new functionality from scratch.

### Optimize Performance (`/examples:optimize-performance`)

Identify and fix performance bottlenecks in code or application.

**Use when:** You need to improve application performance or resolve slowness.

## Using Example Skills

### Via Slash Command

Invoke any example skill by typing its name in the chat:

```
/examples:code-review
```

### As Templates

Copy and modify these skills to create your own custom workflows:

1. Copy an example skill directory to your user or workspace skills folder
2. Modify the `name` and `description` in the frontmatter
3. Customize the instructions for your specific needs
4. Save and use your custom skill

## Creating Your Own Skills

Skills are defined in SKILL.md files with the following structure:

```markdown
---
name: your-skill-name
description: Brief description for automatic loading
---

# Your Skill Title

Detailed instructions for the skill...

## Instructions

1. Step one
2. Step two
   ...
```

### Skill Locations

- **User-level skills:** `~/.neurocode/skills/` (available to you only)
- **Workspace-level skills:** `.neurocode/skills/` (shared with team)

### Best Practices

- Use descriptive names in kebab-case
- Write clear, actionable instructions
- Include context about when to use the skill
- Break complex workflows into numbered steps
- Add examples where helpful
- Consider edge cases and error handling

## Learn More

For more information about the skills system, see the main documentation or use `/help skills`.
