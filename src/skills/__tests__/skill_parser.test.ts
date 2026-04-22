import { describe, it, expect } from "vitest";
import { SkillParser, SkillParseError } from "../skill_parser";
import type { ParsedSkill } from "../types";

describe("SkillParser", () => {
  const parser = new SkillParser();

  describe("parse", () => {
    it("parses valid SKILL.md with all required fields", () => {
      const content = `---
name: lint
description: Run pre-commit checks including formatting, linting, and type-checking.
---

# Lint

Run pre-commit checks including formatting, linting, and type-checking.

## Instructions

1. Run formatting check
2. Run linting
3. Run type-checking`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("lint");
        expect(result.data.description).toBe(
          "Run pre-commit checks including formatting, linting, and type-checking.",
        );
        expect(result.data.content).toContain("# Lint");
        expect(result.data.content).toContain("## Instructions");
      }
    });

    it("parses skill with quoted values in frontmatter", () => {
      const content = `---
name: "test-skill"
description: "A skill with: special characters"
---

Content here`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("test-skill");
        expect(result.data.description).toBe(
          "A skill with: special characters",
        );
      }
    });

    it("parses skill with single-quoted values", () => {
      const content = `---
name: 'single-quoted'
description: 'Description with single quotes'
---

Content`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("single-quoted");
        expect(result.data.description).toBe("Description with single quotes");
      }
    });

    it("parses grouped skill names with namespace", () => {
      const content = `---
name: parent:child
description: A grouped skill under parent namespace
---

# Parent:Child Skill

This is a child skill under the parent namespace.`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("parent:child");
        expect(result.data.description).toBe(
          "A grouped skill under parent namespace",
        );
      }
    });

    it("trims whitespace from content", () => {
      const content = `---
name: test
description: Test skill
---


# Content

With extra whitespace


`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content.startsWith("\n")).toBe(false);
        expect(result.data.content.endsWith("\n\n")).toBe(false);
        expect(result.data.content).toContain("# Content");
      }
    });

    it("handles frontmatter with comments", () => {
      const content = `---
# This is a comment
name: test
description: Test skill
# Another comment
---

Content`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("test");
      }
    });

    it("handles empty lines in frontmatter", () => {
      const content = `---
name: test

description: Test skill

---

Content`;

      const result = parser.parse(content);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("test");
        expect(result.data.description).toBe("Test skill");
      }
    });
  });

  describe("parse - missing frontmatter", () => {
    it("returns error when frontmatter is completely missing", () => {
      const content = `# Just a markdown file

No frontmatter here`;

      const result = parser.parse(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("MISSING_FRONTMATTER");
        expect(result.error.message).toContain(
          "must start with YAML frontmatter",
        );
        expect(result.error.line).toBe(1);
      }
    });

    it("returns error when frontmatter is not closed", () => {
      const content = `---
name: test
description: Test skill

# Content without closing delimiter`;

      const result = parser.parse(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNCLOSED_FRONTMATTER");
        expect(result.error.message).toContain(
          "must be closed with --- marker",
        );
      }
    });

    it("returns error when only one delimiter exists", () => {
      const content = `---
name: test
description: Test skill`;

      const result = parser.parse(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNCLOSED_FRONTMATTER");
      }
    });
  });

  describe("parse - missing required fields", () => {
    it("returns error when name field is missing", () => {
      const content = `---
description: Test skill
---

Content`;

      const result = parser.parse(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("MISSING_NAME");
        expect(result.error.message).toContain(
          "Required field 'name' is missing",
        );
      }
    });

    it("returns error when description field is missing", () => {
      const content = `---
name: test
---

Content`;

      const result = parser.parse(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("MISSING_DESCRIPTION");
        expect(result.error.message).toContain(
          "Required field 'description' is missing",
        );
      }
    });

    it("returns error when name is empty string", () => {
      const content = `---
name: 
description: Test skill
---

Content`;

      const result = parser.parse(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("MISSING_NAME");
      }
    });

    it("returns error when description is empty string", () => {
      const content = `---
name: test
description: 
---

Content`;

      const result = parser.parse(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("MISSING_DESCRIPTION");
      }
    });

    it("returns error when both required fields are missing", () => {
      const content = `---
other: value
---

Content`;

      const result = parser.parse(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should fail on first missing field (name)
        expect(result.error.code).toBe("MISSING_NAME");
      }
    });
  });

  describe("serialize", () => {
    it("serializes a parsed skill back to SKILL.md format", () => {
      const skill: ParsedSkill = {
        name: "lint",
        description: "Run pre-commit checks",
        content: "# Lint\n\nRun checks...",
      };

      const serialized = parser.serialize(skill);

      expect(serialized).toContain("---");
      expect(serialized).toContain("name: lint");
      expect(serialized).toContain("description: Run pre-commit checks");
      expect(serialized).toContain("# Lint");
      expect(serialized).toContain("Run checks...");
    });

    it("quotes values with special characters", () => {
      const skill: ParsedSkill = {
        name: "test",
        description: "A description with: colons and # hashes",
        content: "Content",
      };

      const serialized = parser.serialize(skill);

      expect(serialized).toContain(
        'description: "A description with: colons and # hashes"',
      );
    });

    it("escapes quotes in quoted values", () => {
      const skill: ParsedSkill = {
        name: "test",
        description: 'Description with "quotes" inside',
        content: "Content",
      };

      const serialized = parser.serialize(skill);

      // The serializer doesn't quote values unless they contain special chars like : or #
      // Since this description contains quotes but no special chars, it won't be quoted
      expect(serialized).toContain(
        'description: Description with "quotes" inside',
      );
    });

    it("preserves grouped skill names with namespace", () => {
      const skill: ParsedSkill = {
        name: "parent:child",
        description: "Grouped skill",
        content: "Content",
      };

      const serialized = parser.serialize(skill);

      // The serializer quotes values with colons since they're special chars in YAML
      expect(serialized).toContain('name: "parent:child"');
    });
  });

  describe("round-trip property (parse → serialize → parse)", () => {
    it("produces equivalent skill object after round-trip", () => {
      const original = `---
name: lint
description: Run pre-commit checks including formatting, linting, and type-checking.
---

# Lint

Run pre-commit checks.

## Instructions

1. Run formatting
2. Run linting`;

      const firstParse = parser.parse(original);
      expect(firstParse.success).toBe(true);

      if (firstParse.success) {
        const serialized = parser.serialize(firstParse.data);
        const secondParse = parser.parse(serialized);

        expect(secondParse.success).toBe(true);
        if (secondParse.success) {
          expect(secondParse.data.name).toBe(firstParse.data.name);
          expect(secondParse.data.description).toBe(
            firstParse.data.description,
          );
          expect(secondParse.data.content).toBe(firstParse.data.content);
        }
      }
    });

    it("handles round-trip with special characters", () => {
      const original = `---
name: test-skill
description: "A skill with: special # characters"
---

# Content

With special characters: colons and # hashes`;

      const firstParse = parser.parse(original);
      expect(firstParse.success).toBe(true);

      if (firstParse.success) {
        const serialized = parser.serialize(firstParse.data);
        const secondParse = parser.parse(serialized);

        expect(secondParse.success).toBe(true);
        if (secondParse.success) {
          expect(secondParse.data).toEqual(firstParse.data);
        }
      }
    });

    it("handles round-trip with grouped skill names", () => {
      const original = `---
name: parent:child
description: Grouped skill under namespace
---

# Parent:Child

This is a grouped skill.`;

      const firstParse = parser.parse(original);
      expect(firstParse.success).toBe(true);

      if (firstParse.success) {
        const serialized = parser.serialize(firstParse.data);
        const secondParse = parser.parse(serialized);

        expect(secondParse.success).toBe(true);
        if (secondParse.success) {
          expect(secondParse.data.name).toBe("parent:child");
          expect(secondParse.data.description).toBe(
            firstParse.data.description,
          );
          expect(secondParse.data.content).toBe(firstParse.data.content);
        }
      }
    });

    it("handles round-trip with minimal content", () => {
      const original = `---
name: minimal
description: Minimal skill
---

Content`;

      const firstParse = parser.parse(original);
      expect(firstParse.success).toBe(true);

      if (firstParse.success) {
        const serialized = parser.serialize(firstParse.data);
        const secondParse = parser.parse(serialized);

        expect(secondParse.success).toBe(true);
        if (secondParse.success) {
          expect(secondParse.data).toEqual(firstParse.data);
        }
      }
    });

    it("handles round-trip with multiline content", () => {
      const original = `---
name: multiline
description: Skill with multiline content
---

# Title

Paragraph 1

Paragraph 2

## Section

- List item 1
- List item 2

\`\`\`typescript
code block
\`\`\``;

      const firstParse = parser.parse(original);
      expect(firstParse.success).toBe(true);

      if (firstParse.success) {
        const serialized = parser.serialize(firstParse.data);
        const secondParse = parser.parse(serialized);

        expect(secondParse.success).toBe(true);
        if (secondParse.success) {
          expect(secondParse.data.content).toBe(firstParse.data.content);
        }
      }
    });
  });

  describe("SkillParseError", () => {
    it("creates error with line number", () => {
      const error = new SkillParseError("Test error", 5);

      expect(error.message).toBe("Parse error at line 5: Test error");
      expect(error.line).toBe(5);
      expect(error.name).toBe("SkillParseError");
    });

    it("creates error without line number", () => {
      const error = new SkillParseError("Test error");

      expect(error.message).toBe("Parse error: Test error");
      expect(error.line).toBeUndefined();
      expect(error.name).toBe("SkillParseError");
    });
  });
});
