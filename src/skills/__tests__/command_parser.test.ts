import { describe, it, expect } from "vitest";
import { isSlashCommand, parseCommand } from "../command_parser";

describe("isSlashCommand", () => {
  describe("valid slash commands", () => {
    it("recognizes a simple skill name", () => {
      expect(isSlashCommand("/lint")).toBe(true);
    });

    it("recognizes a skill name with hyphens", () => {
      expect(isSlashCommand("/fix-issue")).toBe(true);
    });

    it("recognizes a namespaced skill", () => {
      expect(isSlashCommand("/dyad:lint")).toBe(true);
    });

    it("recognizes a command with arguments", () => {
      expect(isSlashCommand("/lint --fix")).toBe(true);
    });

    it("recognizes a command with multiple arguments", () => {
      expect(isSlashCommand("/fix-issue 123 src/")).toBe(true);
    });

    it("handles leading/trailing whitespace", () => {
      expect(isSlashCommand("  /lint  ")).toBe(true);
    });
  });

  describe("invalid slash commands", () => {
    it("rejects plain text", () => {
      expect(isSlashCommand("hello world")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isSlashCommand("")).toBe(false);
    });

    it("rejects slash with no name", () => {
      expect(isSlashCommand("/")).toBe(false);
    });

    it("rejects slash with space before name", () => {
      expect(isSlashCommand("/ lint")).toBe(false);
    });

    it("rejects uppercase skill names", () => {
      expect(isSlashCommand("/Lint")).toBe(false);
    });

    it("rejects skill names with underscores", () => {
      expect(isSlashCommand("/fix_issue")).toBe(false);
    });

    it("rejects skill names with multiple colons", () => {
      expect(isSlashCommand("/a:b:c")).toBe(false);
    });
  });
});

describe("parseCommand", () => {
  describe("skill name extraction", () => {
    it("extracts a simple skill name", () => {
      const result = parseCommand("/lint");
      expect(result).not.toBeNull();
      expect(result!.skillName).toBe("lint");
    });

    it("extracts a hyphenated skill name", () => {
      const result = parseCommand("/fix-issue");
      expect(result!.skillName).toBe("fix-issue");
    });

    it("extracts a namespaced skill name", () => {
      const result = parseCommand("/dyad:lint");
      expect(result!.skillName).toBe("dyad:lint");
    });

    it("extracts skill name with numbers", () => {
      const result = parseCommand("/test123");
      expect(result!.skillName).toBe("test123");
    });
  });

  describe("argument extraction", () => {
    it("returns empty args when no arguments provided", () => {
      const result = parseCommand("/lint");
      expect(result!.args).toEqual([]);
    });

    it("extracts a single argument", () => {
      const result = parseCommand("/fix-issue 123");
      expect(result!.args).toEqual(["123"]);
    });

    it("extracts multiple arguments", () => {
      const result = parseCommand("/fix-issue arg1 arg2 arg3");
      expect(result!.args).toEqual(["arg1", "arg2", "arg3"]);
    });

    it("handles flag-style arguments", () => {
      const result = parseCommand("/lint --fix");
      expect(result!.args).toEqual(["--fix"]);
    });

    it("handles path-style arguments", () => {
      const result = parseCommand("/lint src/components/");
      expect(result!.args).toEqual(["src/components/"]);
    });

    it("collapses multiple spaces between arguments", () => {
      const result = parseCommand("/lint  arg1   arg2");
      expect(result!.args).toEqual(["arg1", "arg2"]);
    });
  });

  describe("whitespace handling", () => {
    it("trims leading whitespace", () => {
      const result = parseCommand("  /lint");
      expect(result!.skillName).toBe("lint");
    });

    it("trims trailing whitespace", () => {
      const result = parseCommand("/lint  ");
      expect(result!.skillName).toBe("lint");
      expect(result!.args).toEqual([]);
    });
  });

  describe("invalid input", () => {
    it("returns null for plain text", () => {
      expect(parseCommand("hello")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseCommand("")).toBeNull();
    });

    it("returns null for bare slash", () => {
      expect(parseCommand("/")).toBeNull();
    });

    it("returns null for uppercase skill name", () => {
      expect(parseCommand("/Lint")).toBeNull();
    });

    it("returns null for skill name with underscores", () => {
      expect(parseCommand("/fix_issue")).toBeNull();
    });

    it("returns null for multiple colons in name", () => {
      expect(parseCommand("/a:b:c")).toBeNull();
    });
  });
});
