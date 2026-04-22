import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Pure helpers extracted for unit testing (no React rendering needed)
// ---------------------------------------------------------------------------

/**
 * Re-implementation of the groupSkills helper from SkillList.tsx so it can be
 * unit-tested without bringing in the full React component tree.
 */
import type { Skill } from "@/ipc/types";

function groupSkills(skills: Skill[]): {
  grouped: Record<string, Skill[]>;
  ungrouped: Skill[];
} {
  const grouped: Record<string, Skill[]> = {};
  const ungrouped: Skill[] = [];
  for (const skill of skills) {
    if (skill.namespace) {
      if (!grouped[skill.namespace]) grouped[skill.namespace] = [];
      grouped[skill.namespace].push(skill);
    } else {
      ungrouped.push(skill);
    }
  }
  return { grouped, ungrouped };
}

/** Client-side search filter (mirrors SkillList internals). */
function filterBySearch(skills: Skill[], search: string): Skill[] {
  if (!search.trim()) return skills;
  const q = search.toLowerCase();
  return skills.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q),
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeSkill = (
  name: string,
  description: string,
  scope: "user" | "workspace" = "user",
  namespace?: string,
): Skill => ({
  name,
  description,
  content: `# ${name}`,
  scope,
  path: `/mock/skills/${name}/SKILL.md`,
  namespace,
});

const SKILLS: Skill[] = [
  makeSkill("lint", "Run pre-commit linting checks"),
  makeSkill("test", "Execute unit and integration tests", "workspace"),
  makeSkill("build", "Build the project", "workspace"),
  makeSkill("dyad:lint", "Dyad linting rules", "workspace", "dyad"),
  makeSkill("dyad:test", "Dyad test suite", "workspace", "dyad"),
  makeSkill("team:review", "Team code review process", "user", "team"),
];

// ---------------------------------------------------------------------------
// groupSkills tests
// ---------------------------------------------------------------------------

describe("groupSkills", () => {
  it("puts skills without a namespace into ungrouped", () => {
    const { ungrouped } = groupSkills(SKILLS);
    const names = ungrouped.map((s) => s.name);
    expect(names).toContain("lint");
    expect(names).toContain("test");
    expect(names).toContain("build");
  });

  it("groups skills with a namespace by their namespace", () => {
    const { grouped } = groupSkills(SKILLS);
    expect(Object.keys(grouped)).toContain("dyad");
    expect(Object.keys(grouped)).toContain("team");
  });

  it("puts all dyad-namespaced skills under the 'dyad' key", () => {
    const { grouped } = groupSkills(SKILLS);
    const dyadNames = grouped["dyad"]?.map((s) => s.name) ?? [];
    expect(dyadNames).toContain("dyad:lint");
    expect(dyadNames).toContain("dyad:test");
  });

  it("handles skills that are all ungrouped", () => {
    const flat = [makeSkill("a", "A"), makeSkill("b", "B")];
    const { grouped, ungrouped } = groupSkills(flat);
    expect(ungrouped).toHaveLength(2);
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("handles skills that are all grouped", () => {
    const all = [
      makeSkill("ns:a", "A", "user", "ns"),
      makeSkill("ns:b", "B", "user", "ns"),
    ];
    const { grouped, ungrouped } = groupSkills(all);
    expect(ungrouped).toHaveLength(0);
    expect(grouped["ns"]).toHaveLength(2);
  });

  it("returns empty grouped and ungrouped for empty input", () => {
    const { grouped, ungrouped } = groupSkills([]);
    expect(ungrouped).toHaveLength(0);
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("preserves skills belonging to different namespaces separately", () => {
    const { grouped } = groupSkills(SKILLS);
    expect(grouped["dyad"]).toHaveLength(2);
    expect(grouped["team"]).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// filterBySearch tests
// ---------------------------------------------------------------------------

describe("filterBySearch", () => {
  it("returns all skills when search is empty", () => {
    expect(filterBySearch(SKILLS, "")).toHaveLength(SKILLS.length);
  });

  it("returns all skills when search is whitespace only", () => {
    expect(filterBySearch(SKILLS, "   ")).toHaveLength(SKILLS.length);
  });

  it("matches by skill name (case-insensitive)", () => {
    const results = filterBySearch(SKILLS, "LINT");
    const names = results.map((s) => s.name);
    expect(names).toContain("lint");
    expect(names).toContain("dyad:lint");
  });

  it("matches by description (case-insensitive)", () => {
    const results = filterBySearch(SKILLS, "integration");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("test");
  });

  it("returns empty array when nothing matches", () => {
    expect(filterBySearch(SKILLS, "xyzzy-no-match")).toHaveLength(0);
  });

  it("matches partial name fragments", () => {
    const results = filterBySearch(SKILLS, "ui");
    const names = results.map((s) => s.name);
    // "build" contains "ui" (bUild — case-insensitive)
    expect(names).toContain("build");
  });

  it("matches partial description fragments", () => {
    const results = filterBySearch(SKILLS, "pre-commit");
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("lint");
  });

  it("handles namespace-qualified names in search", () => {
    const results = filterBySearch(SKILLS, "dyad:");
    const names = results.map((s) => s.name);
    expect(names).toContain("dyad:lint");
    expect(names).toContain("dyad:test");
  });

  it("reduces result count when query is narrowed", () => {
    const broad = filterBySearch(SKILLS, "test");
    const narrow = filterBySearch(SKILLS, "dyad:test");
    expect(narrow.length).toBeLessThanOrEqual(broad.length);
  });
});

// ---------------------------------------------------------------------------
// Scope filter logic
// ---------------------------------------------------------------------------

describe("scope filtering", () => {
  /** Mirrors the IPC filter the component passes to skillClient.list */
  function applyScope(
    skills: Skill[],
    scope: "all" | "user" | "workspace",
  ): Skill[] {
    if (scope === "all") return skills;
    return skills.filter((s) => s.scope === scope);
  }

  it("'all' scope returns every skill", () => {
    expect(applyScope(SKILLS, "all")).toHaveLength(SKILLS.length);
  });

  it("'user' scope returns only user-level skills", () => {
    const result = applyScope(SKILLS, "user");
    expect(result.every((s) => s.scope === "user")).toBe(true);
  });

  it("'workspace' scope returns only workspace-level skills", () => {
    const result = applyScope(SKILLS, "workspace");
    expect(result.every((s) => s.scope === "workspace")).toBe(true);
  });

  it("user + workspace counts add up to total", () => {
    const user = applyScope(SKILLS, "user").length;
    const ws = applyScope(SKILLS, "workspace").length;
    expect(user + ws).toBe(SKILLS.length);
  });
});
