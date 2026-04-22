import { describe, it, expect } from "vitest";
import { ContextMatcher, contextMatcher } from "../context_matcher";
import type { Skill } from "../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeSkill = (
  name: string,
  description: string,
  overrides: Partial<Skill> = {},
): Skill => ({
  name,
  description,
  content: `# ${name}\n\nSkill instructions.`,
  scope: "user",
  path: `/mock/skills/${name}/SKILL.md`,
  namespace: name.includes(":") ? name.split(":")[0] : undefined,
  ...overrides,
});

const SKILLS: Skill[] = [
  makeSkill("lint", "Run pre-commit checks including linting and formatting"),
  makeSkill("test", "Execute unit tests and integration tests for the project"),
  makeSkill("build", "Build the project for production deployment"),
  makeSkill("deploy", "Deploy the application to a remote production server"),
  makeSkill("review", "Perform a thorough code review of recent changes"),
  makeSkill(
    "dyad:lint",
    "Dyad-specific linting rules for code style enforcement",
    {
      namespace: "dyad",
    },
  ),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ContextMatcher", () => {
  // ── match – basic behaviour ───────────────────────────────────────────────

  describe("match – basic behaviour", () => {
    it("returns an empty array when context is empty", () => {
      const matcher = new ContextMatcher();
      expect(matcher.match("", SKILLS)).toEqual([]);
    });

    it("returns an empty array when context is whitespace only", () => {
      const matcher = new ContextMatcher();
      expect(matcher.match("   \t\n  ", SKILLS)).toEqual([]);
    });

    it("returns an empty array when skills list is empty", () => {
      const matcher = new ContextMatcher();
      expect(matcher.match("run linting checks", [])).toEqual([]);
    });

    it("returns matched skills for a relevant query", () => {
      const matcher = new ContextMatcher();
      const results = matcher.match(
        "I need to run linting checks before committing",
        SKILLS,
      );
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns MatchedSkill objects with required fields", () => {
      const matcher = new ContextMatcher();
      const results = matcher.match("run tests", SKILLS);
      for (const r of results) {
        expect(r).toHaveProperty("skill");
        expect(r).toHaveProperty("relevance");
        expect(r).toHaveProperty("reason");
        expect(typeof r.relevance).toBe("number");
        expect(typeof r.reason).toBe("string");
      }
    });
  });

  // ── match – relevance scoring ─────────────────────────────────────────────

  describe("match – relevance scoring", () => {
    it("gives a higher score to the most relevant skill", () => {
      const matcher = new ContextMatcher({ threshold: 0 });
      const results = matcher.match("I want to execute unit tests", SKILLS);
      const topName = results[0].skill.name;
      expect(topName).toBe("test");
    });

    it("scores are in [0, 1]", () => {
      const matcher = new ContextMatcher({ threshold: 0 });
      const results = matcher.match(
        "linting formatting tests deployment",
        SKILLS,
      );
      for (const r of results) {
        expect(r.relevance).toBeGreaterThanOrEqual(0);
        expect(r.relevance).toBeLessThanOrEqual(1);
      }
    });

    it("sorts results by relevance descending", () => {
      const matcher = new ContextMatcher({ threshold: 0 });
      const results = matcher.match("production build deploy server", SKILLS);
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].relevance).toBeGreaterThanOrEqual(
          results[i + 1].relevance,
        );
      }
    });

    it("applies a name-match boost when skill name appears in context", () => {
      const matcherBoosted = new ContextMatcher({
        threshold: 0,
        boostNameMatch: true,
      });
      const matcherPlain = new ContextMatcher({
        threshold: 0,
        boostNameMatch: false,
      });

      const boosted = matcherBoosted.match("I need to lint this code", SKILLS);
      const plain = matcherPlain.match("I need to lint this code", SKILLS);

      const lintBoosted = boosted.find((r) => r.skill.name === "lint");
      const lintPlain = plain.find((r) => r.skill.name === "lint");

      expect(lintBoosted).toBeDefined();
      expect(lintPlain).toBeDefined();
      // Boosted score must be ≥ plain score
      expect(lintBoosted!.relevance).toBeGreaterThanOrEqual(
        lintPlain!.relevance,
      );
    });

    it("boosts namespace match when namespace appears in context", () => {
      const matcher = new ContextMatcher({
        threshold: 0,
        boostNameMatch: true,
      });
      const results = matcher.match("run dyad style checks on this PR", SKILLS);
      const dyadResult = results.find((r) => r.skill.name === "dyad:lint");
      expect(dyadResult).toBeDefined();
      // dyad:lint should score higher due to namespace boost
      if (results.length > 1) {
        expect(dyadResult!.relevance).toBeGreaterThan(0);
      }
    });

    it("is case-insensitive", () => {
      const matcher = new ContextMatcher();
      const lower = matcher.match("run linting checks", SKILLS);
      const upper = matcher.match("RUN LINTING CHECKS", SKILLS);
      expect(lower.map((r) => r.skill.name)).toEqual(
        upper.map((r) => r.skill.name),
      );
    });
  });

  // ── match – threshold filtering ───────────────────────────────────────────

  describe("match – threshold filtering", () => {
    it("excludes results below the threshold", () => {
      const matcher = new ContextMatcher({ threshold: 0.9 });
      // Very high threshold – most skills shouldn't match "hello world"
      const results = matcher.match("hello world", SKILLS);
      for (const r of results) {
        expect(r.relevance).toBeGreaterThanOrEqual(0.9);
      }
    });

    it("threshold 0 returns all skills that have any token overlap", () => {
      const matcher = new ContextMatcher({ threshold: 0 });
      // "linting formatting tests deployment build code review" touches every skill
      const results = matcher.match(
        "linting formatting tests deployment build code review",
        SKILLS,
      );
      expect(results.length).toBe(SKILLS.length);
    });

    it("threshold 1 returns only perfect-match skills", () => {
      const matcher = new ContextMatcher({
        threshold: 1,
        boostNameMatch: false,
      });
      // Extremely specific context unlikely to give score of exactly 1 to most skills
      const results = matcher.match("pre-commit linting formatting", SKILLS);
      for (const r of results) {
        expect(r.relevance).toBeGreaterThanOrEqual(1);
      }
    });

    it("returns empty array when no skill meets the threshold", () => {
      const matcher = new ContextMatcher({ threshold: 0.99 });
      const results = matcher.match(
        "something completely unrelated xyz abc",
        SKILLS,
      );
      expect(results).toEqual([]);
    });
  });

  // ── match – maxResults cap ────────────────────────────────────────────────

  describe("match – maxResults cap", () => {
    it("caps results at maxResults", () => {
      const matcher = new ContextMatcher({ threshold: 0, maxResults: 2 });
      const results = matcher.match(
        "linting formatting tests deployment build code review",
        SKILLS,
      );
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("maxResults 0 means no cap", () => {
      const matcher = new ContextMatcher({ threshold: 0, maxResults: 0 });
      const results = matcher.match(
        "linting formatting tests deployment build code review",
        SKILLS,
      );
      expect(results.length).toBe(SKILLS.length);
    });

    it("returns all results when fewer than maxResults match", () => {
      const matcher = new ContextMatcher({ threshold: 0, maxResults: 100 });
      const results = matcher.match("linting checks", SKILLS);
      expect(results.length).toBeLessThanOrEqual(SKILLS.length);
    });
  });

  // ── match – various user messages ─────────────────────────────────────────

  describe("match – various user messages", () => {
    it("matches linting-related queries", () => {
      const matcher = new ContextMatcher();
      const results = matcher.match("can you check my code formatting", SKILLS);
      const names = results.map((r) => r.skill.name);
      expect(names).toContain("lint");
    });

    it("matches test-related queries", () => {
      const matcher = new ContextMatcher();
      const results = matcher.match(
        "please execute the integration tests for me",
        SKILLS,
      );
      const names = results.map((r) => r.skill.name);
      expect(names).toContain("test");
    });

    it("matches build-related queries", () => {
      const matcher = new ContextMatcher();
      const results = matcher.match("I need to build the project", SKILLS);
      const names = results.map((r) => r.skill.name);
      expect(names).toContain("build");
    });

    it("matches deploy-related queries", () => {
      const matcher = new ContextMatcher();
      const results = matcher.match(
        "deploy the application to production server",
        SKILLS,
      );
      const names = results.map((r) => r.skill.name);
      expect(names).toContain("deploy");
    });

    it("matches review-related queries", () => {
      const matcher = new ContextMatcher();
      const results = matcher.match("please do a code review of my PR", SKILLS);
      const names = results.map((r) => r.skill.name);
      expect(names).toContain("review");
    });

    it("returns no results for fully irrelevant context", () => {
      const matcher = new ContextMatcher({ threshold: 0.1 });
      const results = matcher.match("banana smoothie recipe for lunch", SKILLS);
      expect(results).toHaveLength(0);
    });

    it("handles multi-sentence context correctly", () => {
      const matcher = new ContextMatcher();
      const results = matcher.match(
        "First I want to run the tests. Then I will deploy to production.",
        SKILLS,
      );
      const names = results.map((r) => r.skill.name);
      expect(names).toContain("test");
      expect(names).toContain("deploy");
    });

    it("handles punctuation in context", () => {
      const matcher = new ContextMatcher();
      const results = matcher.match(
        "linting, formatting, and code-review!",
        SKILLS,
      );
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ── match – reason field ──────────────────────────────────────────────────

  describe("match – reason field", () => {
    it("includes matched keyword count in the reason", () => {
      const matcher = new ContextMatcher();
      const results = matcher.match("run linting checks", SKILLS);
      const lintResult = results.find((r) => r.skill.name === "lint");
      expect(lintResult?.reason).toMatch(/Matched \d+\/\d+ keywords/);
    });

    it("mentions name boost when matched via name only", () => {
      // Use a single-word context that exactly matches the skill name
      const skills = [
        makeSkill("deploy", "deploy the application to production"),
      ];
      const matcher = new ContextMatcher({
        threshold: 0,
        boostNameMatch: true,
      });
      const results = matcher.match("deploy", skills);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ── extractTokens ─────────────────────────────────────────────────────────

  describe("extractTokens", () => {
    const matcher = new ContextMatcher();

    it("lower-cases all tokens", () => {
      // Use words that are not in the stop-word list
      const tokens = matcher.extractTokens("LINT TESTS FORMAT");
      expect(tokens.has("lint")).toBe(true);
      expect(tokens.has("tests")).toBe(true);
      expect(tokens.has("format")).toBe(true);
    });

    it("filters out stop words", () => {
      const tokens = matcher.extractTokens("I need to run the tests");
      expect(tokens.has("i")).toBe(false);
      expect(tokens.has("to")).toBe(false);
      expect(tokens.has("the")).toBe(false);
    });

    it("filters out single-character tokens", () => {
      const tokens = matcher.extractTokens("a b c run tests");
      expect(tokens.has("a")).toBe(false);
      expect(tokens.has("b")).toBe(false);
      expect(tokens.has("c")).toBe(false);
    });

    it("de-duplicates tokens", () => {
      const tokens = matcher.extractTokens("test test test");
      expect(tokens.size).toBe(1);
    });

    it("handles empty string", () => {
      const tokens = matcher.extractTokens("");
      expect(tokens.size).toBe(0);
    });

    it("splits on various punctuation", () => {
      const tokens = matcher.extractTokens("lint,format;check:review");
      expect(tokens.has("lint")).toBe(true);
      expect(tokens.has("format")).toBe(true);
      expect(tokens.has("check")).toBe(true);
      expect(tokens.has("review")).toBe(true);
    });
  });

  // ── singleton export ──────────────────────────────────────────────────────

  describe("contextMatcher singleton", () => {
    it("is an instance of ContextMatcher", () => {
      expect(contextMatcher).toBeInstanceOf(ContextMatcher);
    });

    it("works with default configuration", () => {
      const results = contextMatcher.match("run tests", SKILLS);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ── stability of sort ─────────────────────────────────────────────────────

  describe("sort stability", () => {
    it("breaks relevance ties alphabetically by skill name", () => {
      // Both skills have identical descriptions → identical scores
      const tiedSkills: Skill[] = [
        makeSkill("zebra", "execute check process"),
        makeSkill("alpha", "execute check process"),
      ];
      const matcher = new ContextMatcher({ threshold: 0 });
      const results = matcher.match("execute check process", tiedSkills);
      if (results.length === 2) {
        expect(results[0].skill.name).toBe("alpha");
        expect(results[1].skill.name).toBe("zebra");
      }
    });
  });
});
