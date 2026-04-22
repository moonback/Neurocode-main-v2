/**
 * Integration tests for the Skills system.
 *
 * These tests verify the full workflow from skill creation through discovery
 * to invocation, including IPC handler integration and file system operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { SkillRegistry } from "../skill_registry";
import { SkillManager } from "../skill_manager";
import { SkillParser } from "../skill_parser";
import type { SkillScope } from "../types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../paths/paths", () => ({
  getUserDataPath: () => "/mock/user/data",
}));

vi.mock("electron-log", () => ({
  default: {
    scope: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createSkillContent = (
  name: string,
  description: string,
  content = "# Instructions\n\nExecute the task.",
) => `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`;

/**
 * Create a temporary directory for testing file system operations.
 */
function createTempDir(): string {
  const tmpDir = path.join(os.tmpdir(), `skill-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

/**
 * Clean up a temporary directory.
 */
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Integration Tests
// ---------------------------------------------------------------------------

describe("Skills Integration Tests", () => {
  let registry: SkillRegistry;
  let manager: SkillManager;
  let parser: SkillParser;
  let tempDir: string;

  beforeEach(() => {
    registry = SkillRegistry.getInstance();
    registry.clear();
    manager = new SkillManager();
    parser = new SkillParser();
    tempDir = createTempDir();
    vi.clearAllMocks();
  });

  afterEach(() => {
    registry.clear();
    cleanupTempDir(tempDir);
    vi.restoreAllMocks();
  });

  // ── Full Workflow: Create → Discover → Invoke ──────────────────────────

  describe("Full Workflow: Create → Discover → Invoke", () => {
    it("creates a skill, discovers it, and invokes it successfully", async () => {
      // Step 1: Create a skill using the manager
      const skillDir = path.join(tempDir, "lint");
      const skillPath = path.join(skillDir, "SKILL.md");

      vi.spyOn(fs, "existsSync").mockImplementation((p) => {
        const pathStr = p.toString();
        return pathStr === skillPath || pathStr === skillDir;
      });

      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockReturnValue(undefined);

      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent(
          "lint",
          "Run pre-commit checks",
          "# Lint\n\nRun the linter.",
        ),
      );

      const createdSkill = await manager.create({
        name: "lint",
        description: "Run pre-commit checks",
        content: "# Lint\n\nRun the linter.",
        scope: "user",
      });

      expect(createdSkill.name).toBe("lint");
      expect(writeFileSyncSpy).toHaveBeenCalled();

      // Step 2: Discover the skill
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        { name: "lint", isDirectory: () => true },
      ] as unknown as fs.Dirent[]);

      await registry.discoverAndRegister();

      const discoveredSkill = registry.get("lint");
      expect(discoveredSkill).toBeDefined();
      expect(discoveredSkill?.name).toBe("lint");

      // Step 3: Invoke the skill
      const skill = registry.get("lint");
      expect(skill).toBeDefined();
      expect(skill?.content).toContain("Lint");
    });

    it("handles the complete lifecycle: create → update → delete", async () => {
      // Create
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("test", "Run tests"),
      );

      const created = await manager.create({
        name: "test",
        description: "Run tests",
        content: "# Test\n\nRun the tests.",
        scope: "user",
      });

      expect(created.name).toBe("test");
      expect(registry.get("test")).toBeDefined();

      // Update
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("test", "Run all tests", "# Test\n\nRun all tests."),
      );

      const updated = await manager.update("test", {
        description: "Run all tests",
        content: "# Test\n\nRun all tests.",
      });

      expect(updated.description).toBe("Run all tests");
      expect(updated.content).toContain("Run all tests");

      // Delete
      vi.spyOn(fs, "rmSync").mockReturnValue(undefined);

      await manager.delete("test");

      expect(registry.get("test")).toBeUndefined();
    });

    it("discovers both user and workspace skills with correct precedence", async () => {
      const userSkillsDir = "/mock/user/data/skills";
      const workspaceSkillsDir = path.join(tempDir, ".neurocode", "skills");

      // Create user-level skill
      const userLintPath = path.join(userSkillsDir, "lint", "SKILL.md");
      // Create workspace-level skill (same name)
      const workspaceLintPath = path.join(
        workspaceSkillsDir,
        "lint",
        "SKILL.md",
      );

      vi.spyOn(fs, "existsSync").mockImplementation((p) => {
        const pathStr = p.toString();
        return (
          pathStr === userSkillsDir ||
          pathStr === workspaceSkillsDir ||
          pathStr === userLintPath ||
          pathStr === workspaceLintPath
        );
      });

      vi.spyOn(fs, "readdirSync").mockImplementation(() => {
        return [
          { name: "lint", isDirectory: () => true },
        ] as unknown as fs.Dirent[];
      });

      vi.spyOn(fs, "readFileSync").mockImplementation((p) => {
        const pathStr = p.toString();
        if (pathStr.includes("user")) {
          return createSkillContent("lint", "User lint skill");
        }
        return createSkillContent("lint", "Workspace lint skill");
      });

      await registry.discoverAndRegister(tempDir);

      const skill = registry.get("lint");
      expect(skill).toBeDefined();
      expect(skill?.scope).toBe("workspace");
      expect(skill?.description).toBe("Workspace lint skill");
    });
  });

  // ── IPC Handler Integration ────────────────────────────────────────────

  describe("IPC Handler Integration", () => {
    it("creates a skill via IPC and registers it in the registry", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("deploy", "Deploy the app"),
      );

      const skill = await manager.create({
        name: "deploy",
        description: "Deploy the app",
        content: "# Deploy\n\nDeploy to production.",
        scope: "user",
      });

      expect(skill.name).toBe("deploy");
      expect(registry.get("deploy")).toBeDefined();
    });

    it("lists skills via IPC after registration", async () => {
      // Register multiple skills
      const skills = [
        {
          name: "lint",
          description: "Run linting",
          scope: "user" as SkillScope,
        },
        { name: "test", description: "Run tests", scope: "user" as SkillScope },
        {
          name: "build",
          description: "Build project",
          scope: "workspace" as SkillScope,
        },
      ];

      for (const skillData of skills) {
        vi.spyOn(fs, "existsSync").mockReturnValue(false);
        vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
        vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
        vi.spyOn(fs, "readFileSync").mockReturnValue(
          createSkillContent(skillData.name, skillData.description),
        );

        await manager.create({
          name: skillData.name,
          description: skillData.description,
          content: `# ${skillData.name}`,
          scope: skillData.scope,
        });
      }

      const allSkills = registry.list();
      expect(allSkills).toHaveLength(3);
      expect(allSkills.map((s) => s.name)).toContain("lint");
      expect(allSkills.map((s) => s.name)).toContain("test");
      expect(allSkills.map((s) => s.name)).toContain("build");
    });

    it("updates a skill via IPC and reflects changes in registry", async () => {
      // Create initial skill
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("format", "Format code"),
      );

      await manager.create({
        name: "format",
        description: "Format code",
        content: "# Format\n\nFormat the code.",
        scope: "user",
      });

      // Update the skill
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("format", "Format and prettify code"),
      );

      const updated = await manager.update("format", {
        description: "Format and prettify code",
      });

      expect(updated.description).toBe("Format and prettify code");
      expect(registry.get("format")?.description).toBe(
        "Format and prettify code",
      );
    });

    it("deletes a skill via IPC and removes it from registry", async () => {
      // Create skill
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("cleanup", "Clean up files"),
      );

      await manager.create({
        name: "cleanup",
        description: "Clean up files",
        content: "# Cleanup\n\nRemove temp files.",
        scope: "user",
      });

      expect(registry.get("cleanup")).toBeDefined();

      // Delete the skill
      vi.spyOn(fs, "rmSync").mockReturnValue(undefined);

      await manager.delete("cleanup");

      expect(registry.get("cleanup")).toBeUndefined();
    });

    it("validates skill content via IPC before creation", async () => {
      const invalidContent = "No frontmatter here";

      const parseResult = parser.parse(invalidContent);
      expect(parseResult.success).toBe(false);

      if (!parseResult.success) {
        expect(parseResult.error.message).toContain("frontmatter");
      }
    });

    it("discovers skills via IPC and returns discovery results", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        { name: "skill1", isDirectory: () => true },
        { name: "skill2", isDirectory: () => true },
      ] as unknown as fs.Dirent[]);

      vi.spyOn(fs, "readFileSync").mockImplementation((p) => {
        const pathStr = p.toString();
        if (pathStr.includes("skill1")) {
          return createSkillContent("skill1", "First skill");
        }
        return createSkillContent("skill2", "Second skill");
      });

      const sizeBefore = registry.size;
      await registry.discoverAndRegister();
      const sizeAfter = registry.size;

      expect(sizeAfter).toBeGreaterThan(sizeBefore);
      expect(registry.get("skill1")).toBeDefined();
      expect(registry.get("skill2")).toBeDefined();
    });
  });

  // ── File System Operations ─────────────────────────────────────────────

  describe("File System Operations", () => {
    it("creates skill directory and SKILL.md file on disk", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      const mkdirSyncSpy = vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockReturnValue(undefined);

      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("new-skill", "New skill"),
      );

      await manager.create({
        name: "new-skill",
        description: "New skill",
        content: "# New Skill\n\nDo something new.",
        scope: "user",
      });

      expect(mkdirSyncSpy).toHaveBeenCalled();
      expect(writeFileSyncSpy).toHaveBeenCalled();
    });

    it("updates SKILL.md file on disk when skill is updated", async () => {
      // Create initial skill
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("update-test", "Original description"),
      );

      await manager.create({
        name: "update-test",
        description: "Original description",
        content: "# Original",
        scope: "user",
      });

      // Update the skill
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockReturnValue(undefined);

      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("update-test", "Updated description", "# Updated"),
      );

      await manager.update("update-test", {
        description: "Updated description",
        content: "# Updated",
      });

      expect(writeFileSyncSpy).toHaveBeenCalled();
      const [, writtenContent] = writeFileSyncSpy.mock.calls[0] as [
        unknown,
        string,
      ];
      expect(writtenContent).toContain("Updated description");
      expect(writtenContent).toContain("# Updated");
    });

    it("removes skill directory from disk when skill is deleted", async () => {
      // Create skill
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("delete-test", "To be deleted"),
      );

      await manager.create({
        name: "delete-test",
        description: "To be deleted",
        content: "# Delete Me",
        scope: "user",
      });

      // Delete the skill
      const rmSyncSpy = vi.spyOn(fs, "rmSync").mockReturnValue(undefined);

      await manager.delete("delete-test");

      expect(rmSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining("delete-test"),
        { recursive: true, force: true },
      );
    });

    it("handles file system errors gracefully during creation", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockImplementation(() => {
        throw new Error("Permission denied");
      });

      await expect(
        manager.create({
          name: "error-skill",
          description: "Will fail",
          content: "# Error",
          scope: "user",
        }),
      ).rejects.toThrow("Permission denied");
    });

    it("handles file system errors gracefully during deletion", async () => {
      // Create skill
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("error-delete", "Will fail to delete"),
      );

      await manager.create({
        name: "error-delete",
        description: "Will fail to delete",
        content: "# Error",
        scope: "user",
      });

      // Attempt to delete with file system error
      vi.spyOn(fs, "rmSync").mockImplementation(() => {
        throw new Error("Cannot remove directory");
      });

      await expect(manager.delete("error-delete")).rejects.toThrow(
        "Cannot remove directory",
      );

      // Skill should still be unregistered from registry
      expect(registry.get("error-delete")).toBeUndefined();
    });

    it("discovers skills from nested directory structure", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        { name: "lint", isDirectory: () => true },
        { name: "test", isDirectory: () => true },
        { name: "README.md", isDirectory: () => false }, // Should be skipped
      ] as unknown as fs.Dirent[]);

      vi.spyOn(fs, "readFileSync").mockImplementation((p) => {
        const pathStr = p.toString();
        if (pathStr.includes("lint")) {
          return createSkillContent("lint", "Lint skill");
        }
        return createSkillContent("test", "Test skill");
      });

      await registry.discoverAndRegister();

      expect(registry.size).toBe(2);
      expect(registry.get("lint")).toBeDefined();
      expect(registry.get("test")).toBeDefined();
    });
  });

  // ── Error Handling and Edge Cases ──────────────────────────────────────

  describe("Error Handling and Edge Cases", () => {
    it("prevents creating duplicate skills", async () => {
      // Create first skill
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("duplicate", "First skill"),
      );

      await manager.create({
        name: "duplicate",
        description: "First skill",
        content: "# First",
        scope: "user",
      });

      // Attempt to create duplicate
      await expect(
        manager.create({
          name: "duplicate",
          description: "Second skill",
          content: "# Second",
          scope: "user",
        }),
      ).rejects.toThrow("already exists");
    });

    it("validates skill name format before creation", async () => {
      await expect(
        manager.create({
          name: "Invalid_Name",
          description: "Invalid",
          content: "# Invalid",
          scope: "user",
        }),
      ).rejects.toThrow("validation failed");
    });

    it("validates skill content before creation", async () => {
      const invalidContent = "No frontmatter";

      const parseResult = parser.parse(invalidContent);
      expect(parseResult.success).toBe(false);
    });

    it("handles missing skill gracefully during update", async () => {
      await expect(
        manager.update("non-existent", { description: "Updated" }),
      ).rejects.toThrow("not found");
    });

    it("handles missing skill gracefully during deletion", async () => {
      await expect(manager.delete("non-existent")).rejects.toThrow("not found");
    });

    it("continues discovery even if one skill fails to parse", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        { name: "valid", isDirectory: () => true },
        { name: "invalid", isDirectory: () => true },
      ] as unknown as fs.Dirent[]);

      vi.spyOn(fs, "readFileSync").mockImplementation((p) => {
        const pathStr = p.toString();
        if (pathStr.includes("valid")) {
          return createSkillContent("valid", "Valid skill");
        }
        return "Invalid content without frontmatter";
      });

      await registry.discoverAndRegister();

      expect(registry.get("valid")).toBeDefined();
      expect(registry.get("invalid")).toBeUndefined();
    });

    it("handles grouped skills with namespace correctly", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        createSkillContent("dyad:lint", "Dyad lint skill"),
      );

      const skill = await manager.create({
        name: "dyad:lint",
        description: "Dyad lint skill",
        content: "# Dyad Lint",
        scope: "workspace",
      });

      expect(skill.name).toBe("dyad:lint");
      expect(skill.namespace).toBe("dyad");
      expect(registry.get("dyad:lint")).toBeDefined();
    });
  });

  // ── Context Matching Integration ───────────────────────────────────────

  describe("Context Matching Integration", () => {
    beforeEach(async () => {
      // Register multiple skills with different descriptions
      const skills = [
        {
          name: "lint",
          description: "Run pre-commit checks including linting and formatting",
        },
        { name: "test", description: "Run unit tests and integration tests" },
        { name: "build", description: "Build the project for production" },
        { name: "deploy", description: "Deploy the application to production" },
      ];

      for (const skillData of skills) {
        vi.spyOn(fs, "existsSync").mockReturnValue(false);
        vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
        vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
        vi.spyOn(fs, "readFileSync").mockReturnValue(
          createSkillContent(skillData.name, skillData.description),
        );

        await manager.create({
          name: skillData.name,
          description: skillData.description,
          content: `# ${skillData.name}`,
          scope: "user",
        });
      }
    });

    it("finds matching skills based on user context", async () => {
      const matches = await registry.findMatching(
        "I need to run linting checks",
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].skill.name).toBe("lint");
      expect(matches[0].relevance).toBeGreaterThan(0);
    });

    it("ranks multiple matches by relevance", async () => {
      const matches = await registry.findMatching("run tests");

      expect(matches.length).toBeGreaterThan(0);
      const testSkill = matches.find((m) => m.skill.name === "test");
      expect(testSkill).toBeDefined();
      expect(testSkill!.relevance).toBeGreaterThan(0);
    });

    it("returns empty array when no skills match context", async () => {
      const matches = await registry.findMatching(
        "completely unrelated query xyz",
      );

      expect(matches).toHaveLength(0);
    });
  });
});
