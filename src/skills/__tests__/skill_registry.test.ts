import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SkillRegistry } from "../skill_registry";
import type { SkillScope } from "../types";

// Mock the paths module
vi.mock("../../paths/paths", () => ({
  getUserDataPath: () => "/mock/user/data",
}));

// Mock electron-log
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

describe("SkillRegistry", () => {
  let registry: SkillRegistry;
  let mockFs: typeof fs;

  // Helper to create a valid SKILL.md content
  const createSkillContent = (
    name: string,
    description: string,
    content = "# Instructions",
  ) => {
    return `---
name: ${name}
description: ${description}
---

${content}`;
  };

  beforeEach(() => {
    // Get a fresh instance for each test
    registry = SkillRegistry.getInstance();
    registry.clear();

    // Mock fs module
    mockFs = fs;
  });

  afterEach(() => {
    registry.clear();
    vi.clearAllMocks();
  });

  describe("getInstance", () => {
    it("returns the same instance on multiple calls (singleton)", () => {
      const instance1 = SkillRegistry.getInstance();
      const instance2 = SkillRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("register", () => {
    it("successfully registers a valid skill", async () => {
      const skillPath = "/test/skills/lint/SKILL.md";
      const skillContent = createSkillContent("lint", "Run pre-commit checks");

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);

      const result = await registry.register(skillPath, "user");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("lint");
        expect(result.data.description).toBe("Run pre-commit checks");
        expect(result.data.scope).toBe("user");
        expect(result.data.path).toBe(skillPath);
        expect(result.data.namespace).toBeUndefined();
      }
    });

    it("registers a grouped skill with namespace", async () => {
      const skillPath = "/test/skills/dyad-lint/SKILL.md";
      const skillContent = createSkillContent("dyad:lint", "Dyad lint skill");

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);

      const result = await registry.register(skillPath, "workspace");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("dyad:lint");
        expect(result.data.namespace).toBe("dyad");
        expect(result.data.scope).toBe("workspace");
      }
    });

    it("returns error when skill file cannot be read", async () => {
      const skillPath = "/test/skills/missing/SKILL.md";

      vi.spyOn(mockFs, "readFileSync").mockImplementation(() => {
        throw new Error("ENOENT: no such file or directory");
      });

      const result = await registry.register(skillPath, "user");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("ENOENT");
      }
    });

    it("returns error when skill has invalid frontmatter", async () => {
      const skillPath = "/test/skills/invalid/SKILL.md";
      const skillContent = "# Just markdown, no frontmatter";

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);

      const result = await registry.register(skillPath, "user");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("frontmatter");
      }
    });

    it("returns error when skill fails validation", async () => {
      const skillPath = "/test/skills/invalid-name/SKILL.md";
      const skillContent = createSkillContent("Invalid_Name", "Test skill");

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);

      const result = await registry.register(skillPath, "user");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("Validation failed");
      }
    });

    it("allows workspace-level skill to override user-level skill", async () => {
      const userSkillPath = "/user/skills/lint/SKILL.md";
      const workspaceSkillPath = "/workspace/skills/lint/SKILL.md";
      const userContent = createSkillContent("lint", "User lint skill");
      const workspaceContent = createSkillContent(
        "lint",
        "Workspace lint skill",
      );

      // Register user-level skill first
      vi.spyOn(mockFs, "readFileSync").mockReturnValue(userContent);
      await registry.register(userSkillPath, "user");

      // Register workspace-level skill (should override)
      vi.spyOn(mockFs, "readFileSync").mockReturnValue(workspaceContent);
      const result = await registry.register(workspaceSkillPath, "workspace");

      expect(result.success).toBe(true);

      // Verify workspace skill is registered
      const skill = registry.get("lint");
      expect(skill).toBeDefined();
      expect(skill?.scope).toBe("workspace");
      expect(skill?.description).toBe("Workspace lint skill");
    });

    it("does not allow user-level skill to override workspace-level skill", async () => {
      const workspaceSkillPath = "/workspace/skills/lint/SKILL.md";
      const userSkillPath = "/user/skills/lint/SKILL.md";
      const workspaceContent = createSkillContent(
        "lint",
        "Workspace lint skill",
      );
      const userContent = createSkillContent("lint", "User lint skill");

      // Register workspace-level skill first
      vi.spyOn(mockFs, "readFileSync").mockReturnValue(workspaceContent);
      await registry.register(workspaceSkillPath, "workspace");

      // Try to register user-level skill (should be skipped)
      vi.spyOn(mockFs, "readFileSync").mockReturnValue(userContent);
      const result = await registry.register(userSkillPath, "user");

      expect(result.success).toBe(true);

      // Verify workspace skill is still registered
      const skill = registry.get("lint");
      expect(skill).toBeDefined();
      expect(skill?.scope).toBe("workspace");
      expect(skill?.description).toBe("Workspace lint skill");
    });
  });

  describe("get", () => {
    it("retrieves a registered skill by name", async () => {
      const skillPath = "/test/skills/lint/SKILL.md";
      const skillContent = createSkillContent("lint", "Run pre-commit checks");

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);
      await registry.register(skillPath, "user");

      const skill = registry.get("lint");

      expect(skill).toBeDefined();
      expect(skill?.name).toBe("lint");
      expect(skill?.description).toBe("Run pre-commit checks");
    });

    it("returns undefined for non-existent skill", () => {
      const skill = registry.get("non-existent");

      expect(skill).toBeUndefined();
    });

    it("retrieves grouped skill by full name", async () => {
      const skillPath = "/test/skills/dyad-lint/SKILL.md";
      const skillContent = createSkillContent("dyad:lint", "Dyad lint skill");

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);
      await registry.register(skillPath, "workspace");

      const skill = registry.get("dyad:lint");

      expect(skill).toBeDefined();
      expect(skill?.name).toBe("dyad:lint");
      expect(skill?.namespace).toBe("dyad");
    });
  });

  describe("unregister", () => {
    it("removes a registered skill", async () => {
      const skillPath = "/test/skills/lint/SKILL.md";
      const skillContent = createSkillContent("lint", "Run pre-commit checks");

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);
      await registry.register(skillPath, "user");

      expect(registry.get("lint")).toBeDefined();

      registry.unregister("lint");

      expect(registry.get("lint")).toBeUndefined();
    });

    it("handles unregistering non-existent skill gracefully", () => {
      expect(() => {
        registry.unregister("non-existent");
      }).not.toThrow();
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      // Register multiple skills for testing
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
        {
          name: "dyad:lint",
          description: "Dyad lint",
          scope: "workspace" as SkillScope,
        },
        {
          name: "dyad:test",
          description: "Dyad test",
          scope: "workspace" as SkillScope,
        },
      ];

      for (const skill of skills) {
        const skillPath = `/test/skills/${skill.name}/SKILL.md`;
        const skillContent = createSkillContent(skill.name, skill.description);
        vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);
        await registry.register(skillPath, skill.scope);
      }
    });

    it("lists all registered skills when no filter is provided", () => {
      const skills = registry.list();

      expect(skills).toHaveLength(5);
      expect(skills.map((s) => s.name)).toContain("lint");
      expect(skills.map((s) => s.name)).toContain("test");
      expect(skills.map((s) => s.name)).toContain("build");
      expect(skills.map((s) => s.name)).toContain("dyad:lint");
      expect(skills.map((s) => s.name)).toContain("dyad:test");
    });

    it("filters skills by scope (user)", () => {
      const skills = registry.list({ scope: "user" });

      expect(skills).toHaveLength(2);
      expect(skills.every((s) => s.scope === "user")).toBe(true);
      expect(skills.map((s) => s.name)).toContain("lint");
      expect(skills.map((s) => s.name)).toContain("test");
    });

    it("filters skills by scope (workspace)", () => {
      const skills = registry.list({ scope: "workspace" });

      expect(skills).toHaveLength(3);
      expect(skills.every((s) => s.scope === "workspace")).toBe(true);
      expect(skills.map((s) => s.name)).toContain("build");
      expect(skills.map((s) => s.name)).toContain("dyad:lint");
      expect(skills.map((s) => s.name)).toContain("dyad:test");
    });

    it("filters skills by namespace", () => {
      const skills = registry.list({ namespace: "dyad" });

      expect(skills).toHaveLength(2);
      expect(skills.every((s) => s.namespace === "dyad")).toBe(true);
      expect(skills.map((s) => s.name)).toContain("dyad:lint");
      expect(skills.map((s) => s.name)).toContain("dyad:test");
    });

    it("filters skills by both scope and namespace", () => {
      const skills = registry.list({ scope: "workspace", namespace: "dyad" });

      expect(skills).toHaveLength(2);
      expect(
        skills.every((s) => s.scope === "workspace" && s.namespace === "dyad"),
      ).toBe(true);
    });

    it("returns empty array when no skills match filter", () => {
      const skills = registry.list({ namespace: "non-existent" });

      expect(skills).toHaveLength(0);
    });

    it("returns empty array when registry is empty", () => {
      registry.clear();
      const skills = registry.list();

      expect(skills).toHaveLength(0);
    });
  });

  describe("findMatching", () => {
    beforeEach(async () => {
      // Register skills with different descriptions
      const skills = [
        {
          name: "lint",
          description: "Run pre-commit checks including linting and formatting",
        },
        { name: "test", description: "Run unit tests and integration tests" },
        { name: "build", description: "Build the project for production" },
        { name: "deploy", description: "Deploy the application to production" },
      ];

      for (const skill of skills) {
        const skillPath = `/test/skills/${skill.name}/SKILL.md`;
        const skillContent = createSkillContent(skill.name, skill.description);
        vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);
        await registry.register(skillPath, "user");
      }
    });

    it("finds skills matching query keywords", async () => {
      const matches = await registry.findMatching(
        "I need to run linting checks",
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].skill.name).toBe("lint");
      expect(matches[0].relevance).toBeGreaterThan(0);
    });

    it("ranks matches by relevance", async () => {
      const matches = await registry.findMatching("run tests");

      expect(matches.length).toBeGreaterThan(0);
      // "test" skill should rank higher because it has more matching keywords
      const testSkill = matches.find((m) => m.skill.name === "test");
      expect(testSkill).toBeDefined();
      expect(testSkill!.relevance).toBeGreaterThan(0);
    });

    it("returns empty array when no skills match", async () => {
      const matches = await registry.findMatching(
        "completely unrelated query xyz",
      );

      expect(matches).toHaveLength(0);
    });

    it("matches keywords in skill name", async () => {
      const matches = await registry.findMatching("deploy");

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].skill.name).toBe("deploy");
    });

    it("is case-insensitive", async () => {
      const matches = await registry.findMatching("LINTING CHECKS");

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].skill.name).toBe("lint");
    });

    it("includes reason in matched results", async () => {
      const matches = await registry.findMatching("run tests");

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].reason).toBeDefined();
      expect(matches[0].reason).toContain("Matched");
    });

    it("sorts matches by relevance (highest first)", async () => {
      const matches = await registry.findMatching("production build deploy");

      if (matches.length > 1) {
        for (let i = 0; i < matches.length - 1; i++) {
          expect(matches[i].relevance).toBeGreaterThanOrEqual(
            matches[i + 1].relevance,
          );
        }
      }
    });
  });

  describe("discoverAndRegister", () => {
    it("discovers and registers user-level skills", async () => {
      const userSkillsDir = "/mock/user/data/skills";
      const lintDir = path.join(userSkillsDir, "lint");
      const skillPath = path.join(lintDir, "SKILL.md");

      // Mock directory structure
      vi.spyOn(mockFs, "existsSync").mockImplementation((p) => {
        const pathStr = path.normalize(p.toString());
        const normalizedUserDir = path.normalize(userSkillsDir);
        const normalizedSkillPath = path.normalize(skillPath);
        return pathStr === normalizedUserDir || pathStr === normalizedSkillPath;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(mockFs, "readdirSync").mockImplementation(((dir: any) => {
        const dirStr = path.normalize(dir?.toString() ?? "");
        const normalizedUserDir = path.normalize(userSkillsDir);
        if (dirStr === normalizedUserDir) {
          return [{ name: "lint", isDirectory: () => true }];
        }
        return [];
      }) as any);

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(
        createSkillContent("lint", "Run linting"),
      );

      await registry.discoverAndRegister();

      const skill = registry.get("lint");
      expect(skill).toBeDefined();
      expect(skill?.scope).toBe("user");
    });

    it("discovers and registers workspace-level skills", async () => {
      const workspaceRoot = "/workspace";
      const userSkillsDir = "/mock/user/data/skills";
      const workspaceSkillsDir = path.join(
        workspaceRoot,
        ".neurocode",
        "skills",
      );
      const buildDir = path.join(workspaceSkillsDir, "build");
      const skillPath = path.join(buildDir, "SKILL.md");

      // Mock directory structure
      vi.spyOn(mockFs, "existsSync").mockImplementation((p) => {
        const pathStr = path.normalize(p.toString());
        const normalizedUserDir = path.normalize(userSkillsDir);
        const normalizedWorkspaceDir = path.normalize(workspaceSkillsDir);
        const normalizedSkillPath = path.normalize(skillPath);
        return (
          pathStr === normalizedUserDir ||
          pathStr === normalizedWorkspaceDir ||
          pathStr === normalizedSkillPath
        );
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(mockFs, "readdirSync").mockImplementation(((dir: any) => {
        const dirStr = path.normalize(dir?.toString() ?? "");
        const normalizedUserDir = path.normalize(userSkillsDir);
        const normalizedWorkspaceDir = path.normalize(workspaceSkillsDir);
        if (dirStr === normalizedUserDir) {
          return [];
        }
        if (dirStr === normalizedWorkspaceDir) {
          return [{ name: "build", isDirectory: () => true }];
        }
        return [];
      }) as any);

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(
        createSkillContent("build", "Build project"),
      );

      await registry.discoverAndRegister(workspaceRoot);

      const skill = registry.get("build");
      expect(skill).toBeDefined();
      expect(skill?.scope).toBe("workspace");
    });

    it("workspace-level skills override user-level skills during discovery", async () => {
      const workspaceRoot = "/workspace";

      // Mock directory structure with same skill in both locations
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(mockFs, "readdirSync").mockImplementation(((_dir: any) => {
        return [{ name: "lint", isDirectory: () => true }];
      }) as any);

      vi.spyOn(mockFs, "readFileSync").mockImplementation((p) => {
        if (p.toString().includes("user")) {
          return createSkillContent("lint", "User lint skill");
        }
        return createSkillContent("lint", "Workspace lint skill");
      });

      await registry.discoverAndRegister(workspaceRoot);

      const skill = registry.get("lint");
      expect(skill).toBeDefined();
      expect(skill?.scope).toBe("workspace");
      expect(skill?.description).toBe("Workspace lint skill");
    });

    it("handles non-existent skill directories gracefully", async () => {
      vi.spyOn(mockFs, "existsSync").mockReturnValue(false);

      await expect(registry.discoverAndRegister()).resolves.not.toThrow();

      expect(registry.size).toBe(0);
    });

    it("skips directories without SKILL.md files", async () => {
      const userSkillsDir = "/mock/user/data/skills";

      vi.spyOn(mockFs, "existsSync").mockImplementation((p) => {
        return p === userSkillsDir; // Directory exists but no SKILL.md
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([
        { name: "incomplete-skill", isDirectory: () => true },
      ] as any);

      await registry.discoverAndRegister();

      expect(registry.size).toBe(0);
    });

    it("skips non-directory entries", async () => {
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([
        { name: "README.md", isDirectory: () => false },
        { name: "lint", isDirectory: () => true },
      ] as any);

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(
        createSkillContent("lint", "Run linting"),
      );

      await registry.discoverAndRegister();

      expect(registry.size).toBe(1);
      expect(registry.get("lint")).toBeDefined();
    });

    it("continues discovery even if one skill fails to register", async () => {
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([
        { name: "invalid-skill", isDirectory: () => true },
        { name: "valid-skill", isDirectory: () => true },
      ] as any);

      vi.spyOn(mockFs, "readFileSync").mockImplementation((p) => {
        if (p.toString().includes("invalid-skill")) {
          return "Invalid content without frontmatter";
        }
        return createSkillContent("valid-skill", "Valid skill");
      });

      await registry.discoverAndRegister();

      expect(registry.size).toBe(1);
      expect(registry.get("valid-skill")).toBeDefined();
      expect(registry.get("invalid-skill")).toBeUndefined();
    });

    it("handles directory read errors gracefully", async () => {
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockImplementation(() => {
        throw new Error("Permission denied");
      });

      // Should not throw, but log error
      await expect(registry.discoverAndRegister()).resolves.not.toThrow();

      expect(registry.size).toBe(0);
    });

    it("handles unexpected errors during skill registration", async () => {
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([
        { name: "skill1", isDirectory: () => true },
        { name: "skill2", isDirectory: () => true },
      ] as any);

      vi.spyOn(mockFs, "readFileSync").mockImplementation((p) => {
        if (p.toString().includes("skill1")) {
          throw new Error("Unexpected file system error");
        }
        return createSkillContent("skill2", "Valid skill");
      });

      await registry.discoverAndRegister();

      // Should continue and register skill2 despite skill1 error
      expect(registry.size).toBe(1);
      expect(registry.get("skill2")).toBeDefined();
      expect(registry.get("skill1")).toBeUndefined();
    });

    it("handles errors in both user and workspace discovery independently", async () => {
      const workspaceRoot = "/workspace";
      const userSkillsDir = "/mock/user/data/skills";
      const workspaceSkillsDir = path.join(
        workspaceRoot,
        ".neurocode",
        "skills",
      );
      const workspaceSkillPath = path.join(
        workspaceSkillsDir,
        "workspace-skill",
        "SKILL.md",
      );

      vi.spyOn(mockFs, "existsSync").mockImplementation((p) => {
        const pathStr = p.toString();
        return (
          pathStr === userSkillsDir ||
          pathStr === workspaceSkillsDir ||
          pathStr === workspaceSkillPath
        );
      });

      // User directory fails to read
      vi.spyOn(mockFs, "readdirSync").mockImplementation((dir) => {
        if (dir === userSkillsDir) {
          throw new Error("User directory permission denied");
        }
        // Workspace directory succeeds
        return [{ name: "workspace-skill", isDirectory: () => true }] as any;
      });

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(
        createSkillContent("workspace-skill", "Workspace skill"),
      );

      await registry.discoverAndRegister(workspaceRoot);

      // Should still register workspace skill despite user directory error
      expect(registry.size).toBe(1);
      expect(registry.get("workspace-skill")).toBeDefined();
    });

    it("completes discovery even with multiple errors", async () => {
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([
        { name: "error1", isDirectory: () => true },
        { name: "valid", isDirectory: () => true },
        { name: "error2", isDirectory: () => true },
      ] as any);

      vi.spyOn(mockFs, "readFileSync").mockImplementation((p) => {
        if (p.toString().includes("error1")) {
          throw new Error("Read error 1");
        }
        if (p.toString().includes("error2")) {
          return "Invalid frontmatter";
        }
        return createSkillContent("valid", "Valid skill");
      });

      await registry.discoverAndRegister();

      expect(registry.size).toBe(1);
      expect(registry.get("valid")).toBeDefined();
    });
  });

  describe("clear", () => {
    it("removes all registered skills", async () => {
      const skillPath = "/test/skills/lint/SKILL.md";
      const skillContent = createSkillContent("lint", "Run linting");

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);
      await registry.register(skillPath, "user");

      expect(registry.size).toBe(1);

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.get("lint")).toBeUndefined();
    });
  });

  describe("size", () => {
    it("returns 0 for empty registry", () => {
      expect(registry.size).toBe(0);
    });

    it("returns correct count after registering skills", async () => {
      const skills = ["lint", "test", "build"];

      for (const name of skills) {
        const skillPath = `/test/skills/${name}/SKILL.md`;
        const skillContent = createSkillContent(name, `${name} skill`);
        vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);
        await registry.register(skillPath, "user");
      }

      expect(registry.size).toBe(3);
    });

    it("decreases after unregistering a skill", async () => {
      const skillPath = "/test/skills/lint/SKILL.md";
      const skillContent = createSkillContent("lint", "Run linting");

      vi.spyOn(mockFs, "readFileSync").mockReturnValue(skillContent);
      await registry.register(skillPath, "user");

      expect(registry.size).toBe(1);

      registry.unregister("lint");

      expect(registry.size).toBe(0);
    });
  });

  describe("file system watching", () => {
    afterEach(() => {
      registry.stopWatching();
    });

    it("enables file watching when enableWatch is true", async () => {
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([] as any);
      const watchSpy = vi.spyOn(mockFs, "watch").mockReturnValue({
        close: vi.fn(),
      } as any);

      await registry.discoverAndRegister(undefined, true);

      expect(registry.isWatchEnabled()).toBe(true);
      expect(watchSpy).toHaveBeenCalledWith(
        expect.stringContaining("skills"),
        { recursive: true },
        expect.any(Function),
      );
    });

    it("does not enable file watching when enableWatch is false", async () => {
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([] as any);

      await registry.discoverAndRegister(undefined, false);

      expect(registry.isWatchEnabled()).toBe(false);
    });

    it("watches both user and workspace directories when workspace root is provided", async () => {
      const workspaceRoot = "/workspace";

      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([] as any);
      const watchSpy = vi.spyOn(mockFs, "watch").mockReturnValue({
        close: vi.fn(),
      } as any);

      await registry.discoverAndRegister(workspaceRoot, true);

      expect(watchSpy).toHaveBeenCalledWith(
        expect.stringContaining("skills"),
        { recursive: true },
        expect.any(Function),
      );
      expect(watchSpy).toHaveBeenCalledWith(
        expect.stringContaining(".neurocode"),
        { recursive: true },
        expect.any(Function),
      );
      expect(watchSpy).toHaveBeenCalledTimes(2);
    });

    it("automatically registers new skill when SKILL.md is created", async () => {
      const userSkillsDir = "/mock/user/data/skills";
      const newSkillPath = path.join(userSkillsDir, "new-skill", "SKILL.md");

      // Mock fs.watch to capture callback properly
      let capturedCallback:
        | ((eventType: string, filename: string | null) => void)
        | null = null;
      vi.spyOn(mockFs, "watch").mockImplementation(
        (
          _path: fs.PathLike,
          _options: any,
          listener?: (eventType: string, filename: string | null) => void,
        ) => {
          if (listener) {
            capturedCallback = listener;
          }
          return {
            close: vi.fn(),
          } as any;
        },
      );

      // Make sure the directory exists so watch is set up
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([] as any);

      await registry.discoverAndRegister(undefined, true);

      expect(capturedCallback).not.toBeNull();

      // Now mock existsSync for the new skill file
      vi.spyOn(mockFs, "existsSync").mockImplementation((p) => {
        return p.toString() === userSkillsDir || p.toString() === newSkillPath;
      });

      // Simulate file creation
      vi.spyOn(mockFs, "readFileSync").mockReturnValue(
        createSkillContent("new-skill", "New skill description"),
      );

      // Trigger the watch callback
      capturedCallback!("rename", "new-skill/SKILL.md");

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 150));

      const skill = registry.get("new-skill");
      expect(skill).toBeDefined();
      expect(skill?.name).toBe("new-skill");
    });

    it("automatically updates skill when SKILL.md is modified", async () => {
      // Mock fs.watch to capture callback
      let watchCallback:
        | ((eventType: string, filename: string | null) => void)
        | null = null;
      vi.spyOn(mockFs, "watch").mockImplementation(
        (
          _path: fs.PathLike,
          _options: any,
          listener?: (eventType: string, filename: string | null) => void,
        ) => {
          if (listener) {
            watchCallback = listener;
          }
          return {
            close: vi.fn(),
          } as any;
        },
      );

      // Register initial skill
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([
        { name: "lint", isDirectory: () => true },
      ] as any);
      vi.spyOn(mockFs, "readFileSync").mockReturnValue(
        createSkillContent("lint", "Original description"),
      );

      await registry.discoverAndRegister(undefined, true);

      let skill = registry.get("lint");
      expect(skill?.description).toBe("Original description");

      expect(watchCallback).not.toBeNull();

      // Simulate file modification
      vi.spyOn(mockFs, "readFileSync").mockReturnValue(
        createSkillContent("lint", "Updated description"),
      );

      // Trigger the watch callback
      watchCallback!("change", "lint/SKILL.md");

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 150));

      skill = registry.get("lint");
      expect(skill?.description).toBe("Updated description");
    });

    it("automatically unregisters skill when SKILL.md is deleted", async () => {
      const userSkillsDir = "/mock/user/data/skills";
      const skillPath = path.join(userSkillsDir, "lint", "SKILL.md");

      // Mock fs.watch to capture callback
      let watchCallback:
        | ((eventType: string, filename: string | null) => void)
        | null = null;
      vi.spyOn(mockFs, "watch").mockImplementation(
        (
          _path: fs.PathLike,
          _options: any,
          listener?: (eventType: string, filename: string | null) => void,
        ) => {
          if (listener) {
            watchCallback = listener;
          }
          return {
            close: vi.fn(),
          } as any;
        },
      );

      // Register initial skill
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([
        { name: "lint", isDirectory: () => true },
      ] as any);
      vi.spyOn(mockFs, "readFileSync").mockReturnValue(
        createSkillContent("lint", "Lint skill"),
      );

      await registry.discoverAndRegister(undefined, true);

      expect(registry.get("lint")).toBeDefined();
      expect(watchCallback).not.toBeNull();

      // Simulate file deletion
      vi.spyOn(mockFs, "existsSync").mockImplementation((p) => {
        if (p.toString() === skillPath) {
          return false; // File deleted
        }
        return true;
      });

      // Trigger the watch callback
      watchCallback!("rename", "lint/SKILL.md");

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(registry.get("lint")).toBeUndefined();
    });

    it("ignores non-SKILL.md file changes", async () => {
      // Mock fs.watch to capture callback
      let watchCallback:
        | ((eventType: string, filename: string | null) => void)
        | null = null;
      vi.spyOn(mockFs, "watch").mockImplementation(
        (
          _path: fs.PathLike,
          _options: any,
          listener?: (eventType: string, filename: string | null) => void,
        ) => {
          if (listener) {
            watchCallback = listener;
          }
          return {
            close: vi.fn(),
          } as any;
        },
      );

      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([] as any);

      await registry.discoverAndRegister(undefined, true);

      const initialSize = registry.size;
      expect(watchCallback).not.toBeNull();

      // Trigger watch callback for non-SKILL.md file
      watchCallback!("change", "lint/README.md");

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Registry should not change
      expect(registry.size).toBe(initialSize);
    });

    it("stops watching when stopWatching is called", async () => {
      const closeMock = vi.fn();

      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([] as any);
      vi.spyOn(mockFs, "watch").mockReturnValue({
        close: closeMock,
      } as any);

      await registry.discoverAndRegister(undefined, true);

      expect(registry.isWatchEnabled()).toBe(true);

      registry.stopWatching();

      expect(closeMock).toHaveBeenCalled();
      expect(registry.isWatchEnabled()).toBe(false);
    });

    it("handles watch errors gracefully", async () => {
      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([] as any);
      vi.spyOn(mockFs, "watch").mockImplementation(() => {
        throw new Error("Watch failed");
      });

      // Should not throw
      await expect(
        registry.discoverAndRegister(undefined, true),
      ).resolves.not.toThrow();
    });

    it("does not watch non-existent directories", async () => {
      vi.spyOn(mockFs, "existsSync").mockReturnValue(false);

      await registry.discoverAndRegister(undefined, true);

      // watch should not be called for non-existent directory
      expect(mockFs.watch).not.toHaveBeenCalled();
    });

    it("handles errors when closing watchers", async () => {
      const closeMock = vi.fn().mockImplementation(() => {
        throw new Error("Failed to close watcher");
      });

      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([] as any);
      vi.spyOn(mockFs, "watch").mockReturnValue({
        close: closeMock,
      } as any);

      await registry.discoverAndRegister(undefined, true);

      // Should not throw when closing fails
      expect(() => registry.stopWatching()).not.toThrow();
      expect(registry.isWatchEnabled()).toBe(false);
    });

    it("continues closing all watchers even if some fail", async () => {
      const workspaceRoot = "/workspace";
      const closeMock1 = vi.fn().mockImplementation(() => {
        throw new Error("Failed to close watcher 1");
      });
      const closeMock2 = vi.fn(); // This one succeeds

      vi.spyOn(mockFs, "existsSync").mockReturnValue(true);
      vi.spyOn(mockFs, "readdirSync").mockReturnValue([] as any);

      let callCount = 0;
      vi.spyOn(mockFs, "watch").mockImplementation(() => {
        callCount++;
        return {
          close: callCount === 1 ? closeMock1 : closeMock2,
        } as any;
      });

      await registry.discoverAndRegister(workspaceRoot, true);

      registry.stopWatching();

      // Both close methods should have been called
      expect(closeMock1).toHaveBeenCalled();
      expect(closeMock2).toHaveBeenCalled();
      expect(registry.isWatchEnabled()).toBe(false);
    });

    it("handles no active watchers gracefully when stopping", () => {
      // Ensure no watchers are active
      registry.stopWatching();

      // Should not throw when called again
      expect(() => registry.stopWatching()).not.toThrow();
    });
  });
});
