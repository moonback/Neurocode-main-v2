import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SkillManager } from "../skill_manager";
import { SkillRegistry } from "../skill_registry";

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

const makeSkillContent = (
  name: string,
  description: string,
  content = "# Instructions\n\nDo the thing.",
) => `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SkillManager", () => {
  let manager: SkillManager;
  let registry: SkillRegistry;

  beforeEach(() => {
    manager = new SkillManager();
    registry = SkillRegistry.getInstance();
    registry.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    registry.clear();
    vi.restoreAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a skill with explicit content", async () => {
      // Mock the fs interactions
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockReturnValue(undefined);
      // registry.register will call readFileSync to re-read the file
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("lint", "Run pre-commit checks"),
      );

      const skill = await manager.create({
        name: "lint",
        description: "Run pre-commit checks",
        content: "Run the linter now.",
        scope: "user",
      });

      expect(skill.name).toBe("lint");
      expect(skill.description).toBe("Run pre-commit checks");
      expect(skill.scope).toBe("user");
      expect(writeFileSyncSpy).toHaveBeenCalledOnce();
    });

    it("generates a template when no content is provided", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("deploy", "Deploy the app"),
      );

      await manager.create({
        name: "deploy",
        description: "Deploy the app",
        content: "",
        scope: "user",
      });

      // Should have written a template containing the skill name
      const [, writtenContent] = writeFileSyncSpy.mock.calls[0] as [
        unknown,
        string,
      ];
      expect(writtenContent).toContain("# deploy");
      expect(writtenContent).toContain("## Instructions");
    });

    it("throws when skill name is invalid", async () => {
      await expect(
        manager.create({
          name: "INVALID_NAME",
          description: "bad",
          content: "stuff",
          scope: "user",
        }),
      ).rejects.toThrow("validation failed");
    });

    it("throws when a skill with the same name already exists in the registry", async () => {
      // Pre-register the skill
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("lint", "Run pre-commit checks"),
      );
      await registry.register("/existing/lint/SKILL.md", "user");

      await expect(
        manager.create({
          name: "lint",
          description: "Duplicate",
          content: "stuff",
          scope: "user",
        }),
      ).rejects.toThrow("already exists");
    });

    it("throws when skill directory already exists on disk", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true); // directory exists

      await expect(
        manager.create({
          name: "existing",
          description: "Existing on disk",
          content: "stuff",
          scope: "user",
        }),
      ).rejects.toThrow("already exists on disk");
    });

    it("creates workspace-scoped skill in the workspace directory", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("build", "Build project"),
      );

      const skill = await manager.create({
        name: "build",
        description: "Build project",
        content: "Build it.",
        scope: "workspace",
      });

      expect(skill.scope).toBe("workspace");
      // The SKILL.md path written should include .neurocode/skills
      const [writtenPath] = writeFileSyncSpy.mock.calls[0] as [
        string,
        ...unknown[],
      ];
      expect(writtenPath).toContain(".neurocode");
    });

    it("cleans up the directory if registry registration fails", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      const rmSyncSpy = vi.spyOn(fs, "rmSync").mockReturnValue(undefined);

      // Make readFileSync return invalid content so registry.register fails
      vi.spyOn(fs, "readFileSync").mockReturnValue("no frontmatter here");

      await expect(
        manager.create({
          name: "oops",
          description: "Fails to register",
          content: "Something.",
          scope: "user",
        }),
      ).rejects.toThrow();

      // Cleanup should have been attempted
      expect(rmSyncSpy).toHaveBeenCalledOnce();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe("update", () => {
    beforeEach(async () => {
      // Pre-register a skill for update tests
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("lint", "Run pre-commit checks", "# Old Instructions"),
      );
      await registry.register("/user/skills/lint/SKILL.md", "user");
      vi.restoreAllMocks();
    });

    it("updates the description only", async () => {
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("lint", "Updated description", "# Old Instructions"),
      );

      const skill = await manager.update("lint", {
        description: "Updated description",
      });

      expect(skill.description).toBe("Updated description");
    });

    it("updates the content only", async () => {
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("lint", "Run pre-commit checks", "# New Instructions"),
      );

      const skill = await manager.update("lint", {
        content: "# New Instructions",
      });

      expect(skill.content).toContain("New Instructions");
    });

    it("updates both description and content simultaneously", async () => {
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("lint", "New desc", "# New Content"),
      );

      const skill = await manager.update("lint", {
        description: "New desc",
        content: "# New Content",
      });

      expect(skill.description).toBe("New desc");
      expect(skill.content).toContain("New Content");
    });

    it("preserves unchanged fields when partially updating", async () => {
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockReturnValue(undefined);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("lint", "Run pre-commit checks", "# Old Instructions"),
      );

      await manager.update("lint", { description: "New desc" });

      // The written content should still contain the original content body
      const [, writtenContent] = writeFileSyncSpy.mock.calls[0] as [
        unknown,
        string,
      ];
      expect(writtenContent).toContain("Old Instructions");
    });

    it("throws when skill does not exist", async () => {
      await expect(
        manager.update("non-existent", { description: "x" }),
      ).rejects.toThrow("not found");
    });

    it("throws when description is set to empty string (parse error)", async () => {
      // The parser treats a missing/empty description as a hard error
      // (Required field 'description' is missing from frontmatter)
      await expect(manager.update("lint", { description: "" })).rejects.toThrow(
        "Invalid skill content",
      );
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe("delete", () => {
    beforeEach(async () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("lint", "Run pre-commit checks"),
      );
      await registry.register("/user/skills/lint/SKILL.md", "user");
      vi.restoreAllMocks();
    });

    it("removes the skill from the registry", async () => {
      vi.spyOn(fs, "rmSync").mockReturnValue(undefined);

      await manager.delete("lint");

      expect(registry.get("lint")).toBeUndefined();
    });

    it("removes the skill directory from disk", async () => {
      const rmSyncSpy = vi.spyOn(fs, "rmSync").mockReturnValue(undefined);

      await manager.delete("lint");

      expect(rmSyncSpy).toHaveBeenCalledOnce();
      const [deletedPath, opts] = rmSyncSpy.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(deletedPath).toContain("lint");
      expect(opts.recursive).toBe(true);
    });

    it("throws when skill does not exist in registry", async () => {
      await expect(manager.delete("non-existent")).rejects.toThrow("not found");
    });

    it("unregisters the skill even if disk removal fails", async () => {
      vi.spyOn(fs, "rmSync").mockImplementation(() => {
        throw new Error("Permission denied");
      });

      await expect(manager.delete("lint")).rejects.toThrow("Permission denied");

      // Skill should already be unregistered before the disk error
      expect(registry.get("lint")).toBeUndefined();
    });
  });

  // ── export ────────────────────────────────────────────────────────────────

  describe("export", () => {
    const SKILL_PATH = "/user/skills/lint/SKILL.md";

    beforeEach(async () => {
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("lint", "Run pre-commit checks"),
      );
      await registry.register(SKILL_PATH, "user");
      vi.restoreAllMocks();
    });

    it("returns a path ending in .tar.gz", async () => {
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        { name: "SKILL.md", isDirectory: () => false } as any,
      ]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        Buffer.from(makeSkillContent("lint", "Run pre-commit checks")),
      );
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);

      const archivePath = await manager.export("lint");

      expect(archivePath).toMatch(/\.tar\.gz$/);
    });

    it("places the archive in the system temp directory", async () => {
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        { name: "SKILL.md", isDirectory: () => false } as any,
      ]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        Buffer.from(makeSkillContent("lint", "Run pre-commit checks")),
      );
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);

      const archivePath = await manager.export("lint");

      expect(archivePath).toContain(require("node:os").tmpdir());
    });

    it("includes the skill name in the archive filename", async () => {
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        { name: "SKILL.md", isDirectory: () => false } as any,
      ]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        Buffer.from(makeSkillContent("lint", "Run pre-commit checks")),
      );
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);

      const archivePath = await manager.export("lint");

      expect(path.basename(archivePath)).toContain("lint");
    });

    it("throws when skill does not exist", async () => {
      await expect(manager.export("non-existent")).rejects.toThrow("not found");
    });

    it("throws when the skill directory contains no files", async () => {
      vi.spyOn(fs, "readdirSync").mockReturnValue([]);

      await expect(manager.export("lint")).rejects.toThrow("No files found");
    });

    it("handles colon-namespaced skill names safely in archive filenames", async () => {
      // Register a namespaced skill
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        makeSkillContent("dyad:lint", "Dyad lint"),
      );
      await registry.register("/user/skills/dyad__lint/SKILL.md", "user");
      vi.restoreAllMocks();

      vi.spyOn(fs, "readdirSync").mockReturnValue([
        { name: "SKILL.md", isDirectory: () => false } as any,
      ]);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        Buffer.from(makeSkillContent("dyad:lint", "Dyad lint")),
      );
      vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);

      const archivePath = await manager.export("dyad:lint");

      // Archive path must not contain a bare colon (invalid on Windows)
      expect(path.basename(archivePath)).not.toContain(":");
    });
  });
});
