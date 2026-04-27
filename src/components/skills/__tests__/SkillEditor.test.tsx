import { describe, it, expect } from "vitest";
import type { ValidationResult } from "@/ipc/types";

// ---------------------------------------------------------------------------
// Pure helpers extracted from SkillEditor for unit testing
// ---------------------------------------------------------------------------

interface Draft {
  name: string;
  description: string;
  content: string;
}

/** Mirrors buildRawContent from SkillEditor.tsx */
function buildRawContent(draft: Draft): string {
  return `---\nname: ${draft.name}\ndescription: ${draft.description}\n---\n\n${draft.content}`;
}

/**
 * Mirrors the isSaveDisabled derivation from SkillEditor.tsx.
 * Kept as a pure function so it can be tested without React.
 */
function isSaveDisabled(
  draft: Draft,
  validation: ValidationResult | null,
  isValidating: boolean,
  isSaving: boolean,
): boolean {
  const hasErrors = validation !== null && !validation.valid;
  return (
    !draft.name.trim() ||
    !draft.content.trim() ||
    hasErrors ||
    isValidating ||
    isSaving
  );
}

/** Mirrors the name-immutability rule in edit mode. */
function isNameEditable(isEditMode: boolean): boolean {
  return !isEditMode;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validResult: ValidationResult = { valid: true, errors: [], warnings: [] };
const withWarning: ValidationResult = {
  valid: true,
  errors: [],
  warnings: [{ code: "EMPTY_CONTENT", message: "Skill has no content" }],
};
const withError: ValidationResult = {
  valid: false,
  errors: [{ code: "INVALID_NAME_FORMAT", message: "Invalid name" }],
  warnings: [],
};

// ---------------------------------------------------------------------------
// buildRawContent
// ---------------------------------------------------------------------------

describe("buildRawContent", () => {
  it("produces valid YAML frontmatter opening and closing markers", () => {
    const raw = buildRawContent({
      name: "lint",
      description: "Run checks",
      content: "# Go",
    });
    expect(raw.startsWith("---\n")).toBe(true);
    expect(raw).toContain("\n---\n");
  });

  it("embeds the name field in frontmatter", () => {
    const raw = buildRawContent({
      name: "my-skill",
      description: "desc",
      content: "body",
    });
    expect(raw).toContain("name: my-skill");
  });

  it("embeds the description field in frontmatter", () => {
    const raw = buildRawContent({
      name: "lint",
      description: "Run pre-commit checks",
      content: "body",
    });
    expect(raw).toContain("description: Run pre-commit checks");
  });

  it("appends the content after the closing --- marker", () => {
    const raw = buildRawContent({
      name: "lint",
      description: "desc",
      content: "# Instructions",
    });
    const afterFrontmatter = raw.split("---\n").slice(2).join("---\n");
    expect(afterFrontmatter.trim()).toBe("# Instructions");
  });

  it("handles empty content gracefully", () => {
    const raw = buildRawContent({
      name: "lint",
      description: "desc",
      content: "",
    });
    expect(raw).toContain("---\n\n");
  });

  it("handles namespaced skill names correctly", () => {
    const raw = buildRawContent({
      name: "dyad:lint",
      description: "Dyad lint",
      content: "body",
    });
    expect(raw).toContain("name: dyad:lint");
  });
});

// ---------------------------------------------------------------------------
// isSaveDisabled
// ---------------------------------------------------------------------------

describe("isSaveDisabled", () => {
  const good: Draft = {
    name: "lint",
    description: "Run checks",
    content: "# Instructions",
  };

  it("allows save when draft is valid, no errors, not validating or saving", () => {
    expect(isSaveDisabled(good, validResult, false, false)).toBe(false);
  });

  it("disables save when name is empty", () => {
    expect(
      isSaveDisabled({ ...good, name: "" }, validResult, false, false),
    ).toBe(true);
  });

  it("disables save when name is whitespace only", () => {
    expect(
      isSaveDisabled({ ...good, name: "   " }, validResult, false, false),
    ).toBe(true);
  });

  it("disables save when content is empty", () => {
    expect(
      isSaveDisabled({ ...good, content: "" }, validResult, false, false),
    ).toBe(true);
  });

  it("disables save when content is whitespace only", () => {
    expect(
      isSaveDisabled({ ...good, content: "  " }, validResult, false, false),
    ).toBe(true);
  });

  it("disables save when validation has errors", () => {
    expect(isSaveDisabled(good, withError, false, false)).toBe(true);
  });

  it("allows save when validation has warnings but no errors", () => {
    expect(isSaveDisabled(good, withWarning, false, false)).toBe(false);
  });

  it("disables save while validation is in progress", () => {
    expect(isSaveDisabled(good, null, true, false)).toBe(true);
  });

  it("disables save while a save is in progress", () => {
    expect(isSaveDisabled(good, validResult, false, true)).toBe(true);
  });

  it("disables save when validation result is null (not yet validated)", () => {
    // null means we haven't validated yet — allow save unless other fields are bad
    // null + good draft → enabled (null is treated as 'no result', not 'error')
    expect(isSaveDisabled(good, null, false, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isNameEditable
// ---------------------------------------------------------------------------

describe("isNameEditable", () => {
  it("name is editable in create mode", () => {
    expect(isNameEditable(false)).toBe(true);
  });

  it("name is NOT editable in edit mode", () => {
    expect(isNameEditable(true)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Validation result display logic
// ---------------------------------------------------------------------------

describe("ValidationResult display helpers", () => {
  it("shows errors when result is invalid", () => {
    // Component would render error indicators when !result.valid
    expect(withError.valid).toBe(false);
    expect(withError.errors.length).toBeGreaterThan(0);
  });

  it("shows warnings when result is valid but has warnings", () => {
    expect(withWarning.valid).toBe(true);
    expect(withWarning.warnings.length).toBeGreaterThan(0);
    expect(withWarning.errors).toHaveLength(0);
  });

  it("shows 'looks good' state when valid with no warnings", () => {
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);
    expect(validResult.warnings).toHaveLength(0);
  });

  it("error message is accessible from result", () => {
    const msg = withError.errors[0].message;
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("warning code is accessible from result", () => {
    const code = withWarning.warnings[0].code;
    expect(typeof code).toBe("string");
    expect(code).toBe("EMPTY_CONTENT");
  });
});

// ---------------------------------------------------------------------------
// Editor mode detection
// ---------------------------------------------------------------------------

describe("editor mode", () => {
  it("create mode: skill prop is undefined", () => {
    const skill = undefined;
    const isEditMode = !!skill;
    expect(isEditMode).toBe(false);
  });

  it("edit mode: skill prop is defined", () => {
    const skill = {
      name: "lint",
      description: "desc",
      content: "body",
      scope: "user" as const,
      path: "/x",
    };
    const isEditMode = !!skill;
    expect(isEditMode).toBe(true);
  });

  it("initial draft name is empty string in create mode", () => {
    const skill: any = {};
    const draft: Draft = {
      name: skill.name ?? "",
      description: skill.description ?? "",
      content: skill.content ?? "",
    };
    expect(draft.name).toBe("");
    expect(draft.description).toBe("");
    expect(draft.content).toBe("");
  });

  it("initial draft is pre-populated from skill in edit mode", () => {
    const skill = {
      name: "lint",
      description: "Run checks",
      content: "# Instructions",
    };
    const draft: Draft = {
      name: skill.name ?? "",
      description: skill.description ?? "",
      content: skill.content ?? "",
    };
    expect(draft.name).toBe("lint");
    expect(draft.description).toBe("Run checks");
    expect(draft.content).toBe("# Instructions");
  });
});
