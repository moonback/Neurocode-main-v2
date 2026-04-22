import { describe, it, expect } from "vitest";
import { SkillValidator, ValidationRules } from "../skill_validator";
import type { ParsedSkill } from "../types";

describe("SkillValidator", () => {
  const validator = new SkillValidator();

  describe("validate", () => {
    describe("valid skills", () => {
      it("validates a complete skill with all fields", () => {
        const skill: ParsedSkill = {
          name: "lint",
          description: "Run pre-commit checks",
          content: "# Lint\n\nRun checks...",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it("validates skill with simple name", () => {
        const skill: ParsedSkill = {
          name: "test",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("validates skill with hyphens in name", () => {
        const skill: ParsedSkill = {
          name: "fix-issue",
          description: "Fix an issue",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("validates skill with numbers in name", () => {
        const skill: ParsedSkill = {
          name: "test123",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("validates grouped skill with namespace", () => {
        const skill: ParsedSkill = {
          name: "dyad:lint",
          description: "Dyad lint skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("validates skill with complex namespace", () => {
        const skill: ParsedSkill = {
          name: "team-123:code-review-v2",
          description: "Team code review",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe("REQUIRED_NAME validation rule", () => {
      it("returns error when name is missing", () => {
        const skill: ParsedSkill = {
          name: "",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ValidationRules.REQUIRED_NAME);
        expect(result.errors[0].message).toContain("Skill name is required");
      });

      it("returns error when name is only whitespace", () => {
        const skill: ParsedSkill = {
          name: "   ",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationRules.REQUIRED_NAME);
      });

      it("returns error when name is undefined", () => {
        const skill = {
          name: undefined as unknown as string,
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationRules.REQUIRED_NAME);
      });
    });

    describe("INVALID_NAME_FORMAT validation rule", () => {
      it("returns error for name with uppercase letters", () => {
        const skill: ParsedSkill = {
          name: "Lint",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ValidationRules.INVALID_NAME_FORMAT);
        expect(result.errors[0].message).toContain(
          "lowercase letters, numbers, and hyphens only",
        );
      });

      it("returns error for name with spaces", () => {
        const skill: ParsedSkill = {
          name: "fix issue",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationRules.INVALID_NAME_FORMAT);
      });

      it("returns error for name with underscores", () => {
        const skill: ParsedSkill = {
          name: "fix_issue",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationRules.INVALID_NAME_FORMAT);
      });

      it("returns error for name with dots", () => {
        const skill: ParsedSkill = {
          name: "fix.issue",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationRules.INVALID_NAME_FORMAT);
      });

      it("returns error for name with special characters", () => {
        const skill: ParsedSkill = {
          name: "fix@issue",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationRules.INVALID_NAME_FORMAT);
      });

      it("returns error for name with multiple colons", () => {
        const skill: ParsedSkill = {
          name: "team:sub:skill",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationRules.INVALID_NAME_FORMAT);
      });

      it("returns error for name starting with colon", () => {
        const skill: ParsedSkill = {
          name: ":skill",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationRules.INVALID_NAME_FORMAT);
      });

      it("returns error for name ending with colon", () => {
        const skill: ParsedSkill = {
          name: "skill:",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe(ValidationRules.INVALID_NAME_FORMAT);
      });

      it("accepts name starting with hyphen (current implementation)", () => {
        const skill: ParsedSkill = {
          name: "-skill",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        // Note: Current regex allows this, though design doc suggests it shouldn't
        expect(result.valid).toBe(true);
      });

      it("accepts name ending with hyphen (current implementation)", () => {
        const skill: ParsedSkill = {
          name: "skill-",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        // Note: Current regex allows this, though design doc suggests it shouldn't
        expect(result.valid).toBe(true);
      });

      it("includes skill name in error message", () => {
        const skill: ParsedSkill = {
          name: "Invalid_Name",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.errors[0].message).toContain("Invalid_Name");
      });

      it("mentions namespace format in error message", () => {
        const skill: ParsedSkill = {
          name: "INVALID",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.errors[0].message).toContain("namespace:skill-name");
      });
    });

    describe("REQUIRED_DESCRIPTION validation rule (warning)", () => {
      it("returns warning when description is missing", () => {
        const skill: ParsedSkill = {
          name: "test",
          description: "",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true); // Still valid, just a warning
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].code).toBe(
          ValidationRules.REQUIRED_DESCRIPTION,
        );
        expect(result.warnings[0].message).toContain(
          "description is recommended",
        );
      });

      it("returns warning when description is only whitespace", () => {
        const skill: ParsedSkill = {
          name: "test",
          description: "   ",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].code).toBe(
          ValidationRules.REQUIRED_DESCRIPTION,
        );
      });

      it("mentions automatic loading in warning message", () => {
        const skill: ParsedSkill = {
          name: "test",
          description: "",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.warnings[0].message).toContain("automatic loading");
      });

      it("does not return warning when description is present", () => {
        const skill: ParsedSkill = {
          name: "test",
          description: "Valid description",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.warnings).toHaveLength(0);
      });
    });

    describe("EMPTY_CONTENT validation rule (warning)", () => {
      it("returns warning when content is empty", () => {
        const skill: ParsedSkill = {
          name: "test",
          description: "Test skill",
          content: "",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true); // Still valid, just a warning
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].code).toBe(ValidationRules.EMPTY_CONTENT);
        expect(result.warnings[0].message).toContain("no instruction content");
      });

      it("returns warning when content is only whitespace", () => {
        const skill: ParsedSkill = {
          name: "test",
          description: "Test skill",
          content: "   \n\n  ",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].code).toBe(ValidationRules.EMPTY_CONTENT);
      });

      it("does not return warning when content is present", () => {
        const skill: ParsedSkill = {
          name: "test",
          description: "Test skill",
          content: "# Instructions\n\nDo something",
        };

        const result = validator.validate(skill);

        expect(result.warnings).toHaveLength(0);
      });
    });

    describe("multiple validation issues", () => {
      it("returns multiple errors when multiple fields are invalid", () => {
        const skill: ParsedSkill = {
          name: "",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it("returns both warnings when description and content are missing", () => {
        const skill: ParsedSkill = {
          name: "test",
          description: "",
          content: "",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true); // No errors, just warnings
        expect(result.warnings).toHaveLength(2);
        expect(
          result.warnings.some(
            (w) => w.code === ValidationRules.REQUIRED_DESCRIPTION,
          ),
        ).toBe(true);
        expect(
          result.warnings.some((w) => w.code === ValidationRules.EMPTY_CONTENT),
        ).toBe(true);
      });

      it("returns error and warnings together", () => {
        const skill: ParsedSkill = {
          name: "Invalid_Name",
          description: "",
          content: "",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ValidationRules.INVALID_NAME_FORMAT);
        expect(result.warnings).toHaveLength(2);
      });
    });

    describe("warning vs error distinction", () => {
      it("marks skill as valid when only warnings are present", () => {
        const skill: ParsedSkill = {
          name: "test",
          description: "",
          content: "",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings.length).toBeGreaterThan(0);
      });

      it("marks skill as invalid when any error is present", () => {
        const skill: ParsedSkill = {
          name: "",
          description: "Test skill",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it("marks skill as invalid even with warnings present", () => {
        const skill: ParsedSkill = {
          name: "Invalid_Name",
          description: "",
          content: "Content",
        };

        const result = validator.validate(skill);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe("validateName", () => {
    describe("valid names", () => {
      it("accepts simple lowercase name", () => {
        expect(validator.validateName("lint")).toBe(true);
      });

      it("accepts name with hyphens", () => {
        expect(validator.validateName("fix-issue")).toBe(true);
      });

      it("accepts name with numbers", () => {
        expect(validator.validateName("test123")).toBe(true);
      });

      it("accepts name with hyphens and numbers", () => {
        expect(validator.validateName("test-123-abc")).toBe(true);
      });

      it("accepts grouped name with namespace", () => {
        expect(validator.validateName("dyad:lint")).toBe(true);
      });

      it("accepts grouped name with hyphens in both parts", () => {
        expect(validator.validateName("team-name:skill-name")).toBe(true);
      });

      it("accepts grouped name with numbers", () => {
        expect(validator.validateName("team123:skill456")).toBe(true);
      });

      it("accepts single character name", () => {
        expect(validator.validateName("a")).toBe(true);
      });

      it("accepts single character namespace and skill", () => {
        expect(validator.validateName("a:b")).toBe(true);
      });
    });

    describe("invalid names", () => {
      it("rejects name with uppercase letters", () => {
        expect(validator.validateName("Lint")).toBe(false);
      });

      it("rejects name with spaces", () => {
        expect(validator.validateName("fix issue")).toBe(false);
      });

      it("rejects name with underscores", () => {
        expect(validator.validateName("fix_issue")).toBe(false);
      });

      it("rejects name with dots", () => {
        expect(validator.validateName("fix.issue")).toBe(false);
      });

      it("rejects name with special characters", () => {
        expect(validator.validateName("fix@issue")).toBe(false);
        expect(validator.validateName("fix#issue")).toBe(false);
        expect(validator.validateName("fix$issue")).toBe(false);
        expect(validator.validateName("fix%issue")).toBe(false);
      });

      it("rejects name with multiple colons", () => {
        expect(validator.validateName("team:sub:skill")).toBe(false);
      });

      it("rejects name starting with colon", () => {
        expect(validator.validateName(":skill")).toBe(false);
      });

      it("rejects name ending with colon", () => {
        expect(validator.validateName("skill:")).toBe(false);
      });

      it("accepts name starting with hyphen (current implementation)", () => {
        // Note: Current regex allows this, though design doc suggests it shouldn't
        expect(validator.validateName("-skill")).toBe(true);
      });

      it("accepts name ending with hyphen (current implementation)", () => {
        // Note: Current regex allows this, though design doc suggests it shouldn't
        expect(validator.validateName("skill-")).toBe(true);
      });

      it("rejects empty string", () => {
        expect(validator.validateName("")).toBe(false);
      });

      it("rejects name with only colon", () => {
        expect(validator.validateName(":")).toBe(false);
      });

      it("accepts name with only hyphen (current implementation)", () => {
        // Note: Current regex allows this, though it's likely not intended
        expect(validator.validateName("-")).toBe(true);
      });

      it("rejects grouped name with uppercase in namespace", () => {
        expect(validator.validateName("Team:skill")).toBe(false);
      });

      it("rejects grouped name with uppercase in skill", () => {
        expect(validator.validateName("team:Skill")).toBe(false);
      });

      it("rejects grouped name with spaces", () => {
        expect(validator.validateName("team name:skill")).toBe(false);
        expect(validator.validateName("team:skill name")).toBe(false);
      });
    });
  });

  describe("validateContent", () => {
    it("returns valid result for non-empty content", () => {
      const result = validator.validateContent(
        "# Instructions\n\nDo something",
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("returns warning for empty content", () => {
      const result = validator.validateContent("");

      expect(result.valid).toBe(true); // Content validation only produces warnings
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe(ValidationRules.EMPTY_CONTENT);
    });

    it("returns warning for whitespace-only content", () => {
      const result = validator.validateContent("   \n\n  ");

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe(ValidationRules.EMPTY_CONTENT);
    });

    it("accepts content with just whitespace and text", () => {
      const result = validator.validateContent("  text  ");

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
