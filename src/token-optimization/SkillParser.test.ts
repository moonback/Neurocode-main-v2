/**
 * Unit tests for SkillParser
 *
 * Tests Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SkillParser } from "./SkillParser";
import type { ParsedSkill } from "@/skills/types";

describe("SkillParser", () => {
  let parser: SkillParser;

  beforeEach(() => {
    parser = new SkillParser();
  });

  describe("parseSkill", () => {
    it("should parse a valid skill file", () => {
      const content = `---
name: test-skill
description: A test skill
---

This is the skill content.`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: "test-skill",
        description: "A test skill",
        content: "This is the skill content.",
      });
    });

    it("should parse skill with namespace", () => {
      const content = `---
name: parent:child
description: A namespaced skill
---

Namespaced content.`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("parent:child");
    });

    it("should parse skill with multi-line content", () => {
      const content = `---
name: multi-line
description: Multi-line skill
---

Line 1
Line 2
Line 3`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe("Line 1\nLine 2\nLine 3");
    });

    it("should handle quoted frontmatter values", () => {
      const content = `---
name: "quoted-skill"
description: 'Single quoted description'
---

Content here.`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("quoted-skill");
      expect(result.data?.description).toBe("Single quoted description");
    });

    it("should ignore unknown frontmatter fields", () => {
      const content = `---
name: test-skill
description: Test
author: John Doe
version: 1.0.0
---

Content.`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("test-skill");
    });

    it("should fail on empty file", () => {
      const result = parser.parseSkill("");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EMPTY_FILE");
      expect(result.error?.line).toBe(1);
    });

    it("should fail on missing frontmatter start", () => {
      const content = `name: test-skill
description: Test
---

Content.`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MISSING_FRONTMATTER_START");
      expect(result.error?.line).toBe(1);
    });

    it("should fail on missing frontmatter end", () => {
      const content = `---
name: test-skill
description: Test

Content without closing delimiter.`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MISSING_FRONTMATTER_END");
    });

    it("should fail on missing name field", () => {
      const content = `---
description: Test
---

Content.`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MISSING_REQUIRED_FIELD");
      expect(result.error?.message).toContain("name");
    });

    it("should fail on missing description field", () => {
      const content = `---
name: test-skill
---

Content.`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MISSING_REQUIRED_FIELD");
      expect(result.error?.message).toContain("description");
    });

    it("should fail on empty content", () => {
      const content = `---
name: test-skill
description: Test
---

`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EMPTY_CONTENT");
    });

    it("should fail on invalid frontmatter format", () => {
      const content = `---
name test-skill
description: Test
---

Content.`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_FRONTMATTER_FORMAT");
      expect(result.error?.line).toBe(2);
    });

    it("should fail on empty frontmatter value", () => {
      const content = `---
name:
description: Test
---

Content.`;

      const result = parser.parseSkill(content);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("MISSING_FRONTMATTER_VALUE");
      expect(result.error?.message).toContain("name");
    });
  });

  describe("formatSkill", () => {
    it("should format a skill object to file content", () => {
      const skill: ParsedSkill = {
        name: "test-skill",
        description: "A test skill",
        content: "This is the skill content.",
      };

      const formatted = parser.formatSkill(skill);

      expect(formatted).toContain("---");
      expect(formatted).toContain("name: test-skill");
      expect(formatted).toContain("description: A test skill");
      expect(formatted).toContain("This is the skill content.");
    });

    it("should format skill with multi-line content", () => {
      const skill: ParsedSkill = {
        name: "multi-line",
        description: "Multi-line skill",
        content: "Line 1\nLine 2\nLine 3",
      };

      const formatted = parser.formatSkill(skill);

      expect(formatted).toContain("Line 1\nLine 2\nLine 3");
    });

    it("should format skill with namespace", () => {
      const skill: ParsedSkill = {
        name: "parent:child",
        description: "Namespaced skill",
        content: "Content.",
      };

      const formatted = parser.formatSkill(skill);

      expect(formatted).toContain("name: parent:child");
    });

    it("should preserve content whitespace", () => {
      const skill: ParsedSkill = {
        name: "whitespace",
        description: "Test",
        content: "  Indented content\n\n  More content",
      };

      const formatted = parser.formatSkill(skill);

      expect(formatted).toContain("  Indented content\n\n  More content");
    });
  });

  describe("validateSkill", () => {
    it("should validate a valid skill", () => {
      const skill: ParsedSkill = {
        name: "test-skill",
        description: "A test skill",
        content: "This is the skill content.",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate skill with namespace", () => {
      const skill: ParsedSkill = {
        name: "parent:child",
        description: "Namespaced skill",
        content: "Content with enough characters.",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(true);
    });

    it("should reject invalid name format", () => {
      const skill: ParsedSkill = {
        name: "Invalid_Name",
        description: "Test description",
        content: "Content with enough characters.",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "INVALID_NAME_FORMAT")).toBe(
        true,
      );
    });

    it("should reject name with uppercase letters", () => {
      const skill: ParsedSkill = {
        name: "TestSkill",
        description: "Test",
        content: "Content.",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe("INVALID_NAME_FORMAT");
    });

    it("should reject name with spaces", () => {
      const skill: ParsedSkill = {
        name: "test skill",
        description: "Test",
        content: "Content.",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe("INVALID_NAME_FORMAT");
    });

    it("should reject name that is too long", () => {
      const skill: ParsedSkill = {
        name: "a".repeat(51),
        description: "Test",
        content: "Content.",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "NAME_TOO_LONG")).toBe(true);
    });

    it("should reject empty description", () => {
      const skill: ParsedSkill = {
        name: "test-skill",
        description: "",
        content: "Content.",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe("EMPTY_DESCRIPTION");
    });

    it("should reject description that is too long", () => {
      const skill: ParsedSkill = {
        name: "test-skill",
        description: "a".repeat(201),
        content: "Content.",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe("DESCRIPTION_TOO_LONG");
    });

    it("should reject empty content", () => {
      const skill: ParsedSkill = {
        name: "test-skill",
        description: "Test",
        content: "",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe("EMPTY_CONTENT");
    });

    it("should reject content that is too short", () => {
      const skill: ParsedSkill = {
        name: "test-skill",
        description: "Test",
        content: "Short",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe("CONTENT_TOO_SHORT");
    });

    it("should report multiple validation errors", () => {
      const skill: ParsedSkill = {
        name: "Invalid Name",
        description: "",
        content: "",
      };

      const result = parser.validateSkill(skill);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("validateSkillFile", () => {
    it("should validate a valid skill file", () => {
      const content = `---
name: test-skill
description: A test skill
---

This is the skill content.`;

      const result = parser.validateSkillFile(content);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty file", () => {
      const result = parser.validateSkillFile("");

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe("EMPTY_FILE");
    });

    it("should reject file with parse errors", () => {
      const content = `---
name: test-skill
---

Content.`;

      const result = parser.validateSkillFile(content);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe("MISSING_REQUIRED_FIELD");
    });

    it("should reject file with validation errors", () => {
      const content = `---
name: Invalid_Name
description: Test
---

Content.`;

      const result = parser.validateSkillFile(content);

      expect(result.valid).toBe(false);
      expect(result.errors[0]?.code).toBe("INVALID_NAME_FORMAT");
    });
  });

  describe("testRoundTrip", () => {
    it("should pass round-trip test for valid skill", () => {
      const content = `---
name: test-skill
description: A test skill
---

This is the skill content.`;

      const result = parser.testRoundTrip(content);

      expect(result).toBe(true);
    });

    it("should pass round-trip test with multi-line content", () => {
      const content = `---
name: multi-line
description: Multi-line skill
---

Line 1
Line 2
Line 3`;

      const result = parser.testRoundTrip(content);

      expect(result).toBe(true);
    });

    it("should pass round-trip test with namespace", () => {
      const content = `---
name: parent:child
description: Namespaced skill
---

Content.`;

      const result = parser.testRoundTrip(content);

      expect(result).toBe(true);
    });

    it("should fail round-trip test for invalid skill", () => {
      const content = `---
name: test-skill
---

Content.`;

      const result = parser.testRoundTrip(content);

      expect(result).toBe(false);
    });

    it("should handle whitespace normalization", () => {
      const content = `---
name: test-skill
description: Test
---

Content with trailing spaces   
And extra newlines


`;

      const result = parser.testRoundTrip(content);

      expect(result).toBe(true);
    });
  });

  describe("formatError", () => {
    it("should format error with line number", () => {
      const content = `---
name: test-skill
description: Test
---

Content.`;

      const error = {
        message: "Test error",
        line: 2,
        code: "TEST_ERROR",
      };

      const formatted = parser.formatError(error, content);

      expect(formatted).toContain("Error: Test error");
      expect(formatted).toContain("at line 2");
      expect(formatted).toContain("name: test-skill");
      expect(formatted).toContain("(TEST_ERROR)");
    });

    it("should format error with column number", () => {
      const content = `---
name: test-skill
---`;

      const error = {
        message: "Test error",
        line: 2,
        column: 5,
        code: "TEST_ERROR",
      };

      const formatted = parser.formatError(error, content);

      expect(formatted).toContain("^");
    });

    it("should format error without line number", () => {
      const content = "Some content";

      const error = {
        message: "Test error",
        code: "TEST_ERROR",
      };

      const formatted = parser.formatError(error, content);

      expect(formatted).toContain("Error: Test error");
      expect(formatted).toContain("(TEST_ERROR)");
      expect(formatted).not.toContain("at line");
    });

    it("should handle invalid line numbers gracefully", () => {
      const content = "Line 1\nLine 2";

      const error = {
        message: "Test error",
        line: 999,
        code: "TEST_ERROR",
      };

      const formatted = parser.formatError(error, content);

      expect(formatted).toContain("Error: Test error");
      expect(formatted).toContain("(TEST_ERROR)");
    });
  });

  describe("Integration Tests", () => {
    it("should parse, validate, format, and re-parse successfully", () => {
      const originalContent = `---
name: integration-test
description: Integration test skill
---

This is a comprehensive integration test.
It has multiple lines.
And various content.`;

      // Parse
      const parseResult = parser.parseSkill(originalContent);
      expect(parseResult.success).toBe(true);

      const skill = parseResult.data!;

      // Validate
      const validationResult = parser.validateSkill(skill);
      expect(validationResult.valid).toBe(true);

      // Format
      const formatted = parser.formatSkill(skill);
      expect(formatted).toBeTruthy();

      // Re-parse
      const reparseResult = parser.parseSkill(formatted);
      expect(reparseResult.success).toBe(true);

      // Compare
      expect(reparseResult.data).toEqual(skill);
    });

    it("should handle complex skill with all features", () => {
      const content = `---
name: complex:skill
description: A complex skill with namespace
---

# Complex Skill

This skill has:
- Multiple lines
- Markdown formatting
- Code blocks

\`\`\`typescript
const example = "code";
\`\`\`

And more content.`;

      const parseResult = parser.parseSkill(content);
      expect(parseResult.success).toBe(true);

      const validationResult = parser.validateSkill(parseResult.data!);
      expect(validationResult.valid).toBe(true);

      const roundTrip = parser.testRoundTrip(content);
      expect(roundTrip).toBe(true);
    });
  });
});
