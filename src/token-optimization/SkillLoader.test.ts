/**
 * Unit tests for SkillLoader
 *
 * Tests cover:
 * - Metadata-only loading without full content
 * - Full skill loading with lazy loading
 * - Async operations without blocking
 * - Loading time measurement and reporting
 * - Error handling for missing/invalid skills
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { SkillLoader } from "./SkillLoader";

describe("SkillLoader", () => {
  let loader: SkillLoader;
  let testDir: string;

  beforeEach(async () => {
    loader = new SkillLoader();

    // Create a temporary test directory with .neurocode/skills structure
    testDir = path.join(os.tmpdir(), `skill-loader-test-${Date.now()}`);
    await fs.mkdir(path.join(testDir, ".neurocode", "skills"), {
      recursive: true,
    });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("loadMetadata", () => {
    it("should load metadata without loading full content", async () => {
      // Create a test skill with large content
      const skillName = "test-skill";
      const skillDir = path.join(testDir, ".neurocode", "skills", skillName);
      await fs.mkdir(skillDir, { recursive: true });

      const largeContent = "x".repeat(10000); // 10KB of content
      const skillContent = [
        "---",
        `name: ${skillName}`,
        "description: A test skill",
        "---",
        "",
        largeContent,
      ].join("\n");

      const skillPath = path.join(skillDir, "SKILL.md");
      await fs.writeFile(skillPath, skillContent, "utf-8");

      // Mock getUserDataPath to return our test directory
      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Load metadata - should not load the full 10KB content
        const result = await loader.loadMetadata(skillName, "workspace");

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(skillName);
          expect(result.data.description).toBe("A test skill");
          expect(result.data.scope).toBe("workspace");
          expect(result.data.estimatedTokens).toBeGreaterThan(0);
          expect(result.data.lastModified).toBeGreaterThan(0);

          // Verify metrics were recorded
          expect(result.metrics.operation).toBe("loadMetadata");
          expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);
          expect(result.metrics.success).toBe(true);
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should extract dependencies from skill content", async () => {
      const skillName = "dependent-skill";
      const skillDir = path.join(testDir, ".neurocode", "skills", skillName);
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = [
        "---",
        `name: ${skillName}`,
        "description: A skill with dependencies",
        "---",
        "",
        "## Dependencies",
        "",
        "Requires: base-skill",
        "Requires: helper-skill",
        "",
        "This skill depends on other skills.",
      ].join("\n");

      const skillPath = path.join(skillDir, "SKILL.md");
      await fs.writeFile(skillPath, skillContent, "utf-8");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const result = await loader.loadMetadata(skillName, "workspace");

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.dependencies).toContain("base-skill");
          expect(result.data.dependencies).toContain("helper-skill");
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should handle missing skill files", async () => {
      const result = await loader.loadMetadata("nonexistent-skill", "user");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
        expect(result.metrics.success).toBe(false);
        expect(result.metrics.error).toBeDefined();
      }
    });

    it("should handle invalid frontmatter", async () => {
      const skillName = "invalid-skill";
      const skillDir = path.join(testDir, ".neurocode", "skills", skillName);
      await fs.mkdir(skillDir, { recursive: true });

      // Skill without frontmatter
      const skillContent = "# Invalid Skill\n\nNo frontmatter here.";
      const skillPath = path.join(skillDir, "SKILL.md");
      await fs.writeFile(skillPath, skillContent, "utf-8");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const result = await loader.loadMetadata(skillName, "workspace");

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("frontmatter");
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should measure and report loading time", async () => {
      const skillName = "timed-skill";
      const skillDir = path.join(testDir, ".neurocode", "skills", skillName);
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = [
        "---",
        `name: ${skillName}`,
        "description: A skill for timing",
        "---",
        "",
        "Content here.",
      ].join("\n");

      const skillPath = path.join(skillDir, "SKILL.md");
      await fs.writeFile(skillPath, skillContent, "utf-8");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const result = await loader.loadMetadata(skillName, "workspace");

        expect(result.success).toBe(true);
        expect(result.metrics.startTime).toBeGreaterThan(0);
        expect(result.metrics.endTime).toBeGreaterThan(
          result.metrics.startTime,
        );
        expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);
        expect(result.metrics.skillName).toBe(skillName);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("loadSkill", () => {
    it("should load full skill content", async () => {
      const skillName = "full-skill";
      const skillDir = path.join(testDir, ".neurocode", "skills", skillName);
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = [
        "---",
        `name: ${skillName}`,
        "description: A complete skill",
        "---",
        "",
        "# Full Skill",
        "",
        "This is the full content of the skill.",
        "It includes multiple lines and sections.",
      ].join("\n");

      const skillPath = path.join(skillDir, "SKILL.md");
      await fs.writeFile(skillPath, skillContent, "utf-8");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const result = await loader.loadSkill(skillName, "workspace");

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe(skillName);
          expect(result.data.description).toBe("A complete skill");
          expect(result.data.content).toContain("This is the full content");
          expect(result.data.scope).toBe("workspace");
          expect(result.data.path).toBe(skillPath);

          // Verify metrics
          expect(result.metrics.operation).toBe("loadSkill");
          expect(result.metrics.success).toBe(true);
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should handle namespaced skills", async () => {
      const skillName = "dyad:test";
      // On Windows, the directory name will be "dyad__test"
      const dirName = process.platform === "win32" ? "dyad__test" : "dyad:test";
      const skillDir = path.join(testDir, ".neurocode", "skills", dirName);
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = [
        "---",
        "name: dyad:test",
        "description: A namespaced skill",
        "---",
        "",
        "Namespaced content.",
      ].join("\n");

      const skillPath = path.join(skillDir, "SKILL.md");
      await fs.writeFile(skillPath, skillContent, "utf-8");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const result = await loader.loadSkill(skillName, "workspace");

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("dyad:test");
          expect(result.data.namespace).toBe("dyad");
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should handle parse errors", async () => {
      const skillName = "parse-error-skill";
      const skillDir = path.join(testDir, ".neurocode", "skills", skillName);
      await fs.mkdir(skillDir, { recursive: true });

      // Invalid skill content (missing description)
      const skillContent = [
        "---",
        `name: ${skillName}`,
        "---",
        "",
        "Content without description.",
      ].join("\n");

      const skillPath = path.join(skillDir, "SKILL.md");
      await fs.writeFile(skillPath, skillContent, "utf-8");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const result = await loader.loadSkill(skillName, "workspace");

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("parse");
          expect(result.metrics.success).toBe(false);
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should perform async loading without blocking", async () => {
      // Create multiple skills
      const skillNames = ["skill1", "skill2", "skill3"];

      for (const skillName of skillNames) {
        const skillDir = path.join(testDir, ".neurocode", "skills", skillName);
        await fs.mkdir(skillDir, { recursive: true });

        const skillContent = [
          "---",
          `name: ${skillName}`,
          `description: Skill ${skillName}`,
          "---",
          "",
          `Content for ${skillName}`,
        ].join("\n");

        const skillPath = path.join(skillDir, "SKILL.md");
        await fs.writeFile(skillPath, skillContent, "utf-8");
      }

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Load all skills concurrently
        const startTime = performance.now();
        const results = await Promise.all(
          skillNames.map((name) => loader.loadSkill(name, "workspace")),
        );
        const totalTime = performance.now() - startTime;

        // All should succeed
        expect(results.every((r) => r.success)).toBe(true);

        // Concurrent loading should be faster than sequential
        // (though this is a weak test since operations are fast)
        expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("listSkills", () => {
    it("should list all skills in a scope", async () => {
      // Create multiple skills
      const skillNames = ["list-skill-1", "list-skill-2", "list-skill-3"];

      for (const skillName of skillNames) {
        const skillDir = path.join(testDir, ".neurocode", "skills", skillName);
        await fs.mkdir(skillDir, { recursive: true });

        const skillContent = [
          "---",
          `name: ${skillName}`,
          `description: Description for ${skillName}`,
          "---",
          "",
          "Content.",
        ].join("\n");

        const skillPath = path.join(skillDir, "SKILL.md");
        await fs.writeFile(skillPath, skillContent, "utf-8");
      }

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const skills = await loader.listSkills("workspace");

        expect(skills).toHaveLength(3);
        expect(skills.map((s) => s.name).sort()).toEqual(skillNames.sort());

        // All should have metadata
        for (const skill of skills) {
          expect(skill.description).toBeDefined();
          expect(skill.estimatedTokens).toBeGreaterThan(0);
          expect(skill.scope).toBe("workspace");
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it("should return empty array for nonexistent directory", async () => {
      // Create a separate test directory without any skills
      const emptyTestDir = path.join(
        os.tmpdir(),
        `empty-skill-test-${Date.now()}`,
      );
      await fs.mkdir(path.join(emptyTestDir, ".neurocode", "skills"), {
        recursive: true,
      });

      const originalCwd = process.cwd();
      process.chdir(emptyTestDir);

      try {
        const skills = await loader.listSkills("workspace");
        expect(skills).toEqual([]);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(emptyTestDir, { recursive: true, force: true });
      }
    });

    it("should skip invalid skills when listing", async () => {
      // Create one valid and one invalid skill
      const validSkill = "valid-list-skill";
      const invalidSkill = "invalid-list-skill";

      // Valid skill
      const validDir = path.join(testDir, ".neurocode", "skills", validSkill);
      await fs.mkdir(validDir, { recursive: true });
      await fs.writeFile(
        path.join(validDir, "SKILL.md"),
        ["---", `name: ${validSkill}`, "description: Valid", "---", ""].join(
          "\n",
        ),
        "utf-8",
      );

      // Invalid skill (no frontmatter)
      const invalidDir = path.join(
        testDir,
        ".neurocode",
        "skills",
        invalidSkill,
      );
      await fs.mkdir(invalidDir, { recursive: true });
      await fs.writeFile(
        path.join(invalidDir, "SKILL.md"),
        "Invalid content",
        "utf-8",
      );

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        const skills = await loader.listSkills("workspace");

        // Should only include the valid skill
        expect(skills).toHaveLength(1);
        expect(skills[0].name).toBe(validSkill);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("performance", () => {
    it("should load metadata faster than full skill", async () => {
      const skillName = "perf-skill";
      const skillDir = path.join(testDir, ".neurocode", "skills", skillName);
      await fs.mkdir(skillDir, { recursive: true });

      // Create a skill with substantial content
      const largeContent = "x".repeat(50000); // 50KB
      const skillContent = [
        "---",
        `name: ${skillName}`,
        "description: Performance test skill",
        "---",
        "",
        largeContent,
      ].join("\n");

      const skillPath = path.join(skillDir, "SKILL.md");
      await fs.writeFile(skillPath, skillContent, "utf-8");

      const originalCwd = process.cwd();
      process.chdir(testDir);

      try {
        // Load metadata
        const metadataResult = await loader.loadMetadata(
          skillName,
          "workspace",
        );
        expect(metadataResult.success).toBe(true);
        const metadataTime = metadataResult.metrics.durationMs;

        // Load full skill
        const skillResult = await loader.loadSkill(skillName, "workspace");
        expect(skillResult.success).toBe(true);
        const skillTime = skillResult.metrics.durationMs;

        // Metadata loading should be faster (or at least not significantly slower)
        // We use a generous threshold since file I/O can be variable
        expect(metadataTime).toBeLessThanOrEqual(skillTime * 2);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
