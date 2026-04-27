/**
 * Unit tests for PostProcessor
 *
 * Tests formatting, linting, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PostProcessor } from "../post-processor";
import * as child_process from "node:child_process";

// Mock child_process.exec
vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

describe("PostProcessor", () => {
  let execMock: any;

  beforeEach(() => {
    execMock = vi.mocked(child_process.exec);
    execMock.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("processFiles", () => {
    it("should format files when format option is true", async () => {
      execMock.mockImplementation((cmd: string, opts: any, callback: any) => {
        callback(null, { stdout: "", stderr: "" });
      });

      const processor = new PostProcessor({
        format: true,
        lint: false,
        projectRoot: "/test/project",
      });

      await processor.processFiles(["src/test.ts", "src/test2.ts"]);

      expect(execMock).toHaveBeenCalledTimes(1);
      expect(execMock.mock.calls[0][0]).toContain("npx oxfmt");
      expect(execMock.mock.calls[0][0]).toContain("src/test.ts");
      expect(execMock.mock.calls[0][0]).toContain("src/test2.ts");
    });

    it("should lint files when lint option is true", async () => {
      execMock.mockImplementation((cmd: string, opts: any, callback: any) => {
        callback(null, { stdout: "", stderr: "" });
      });

      const processor = new PostProcessor({
        format: false,
        lint: true,
        projectRoot: "/test/project",
      });

      await processor.processFiles(["src/test.ts"]);

      expect(execMock).toHaveBeenCalledTimes(1);
      expect(execMock.mock.calls[0][0]).toContain("npx oxlint --fix");
      expect(execMock.mock.calls[0][0]).toContain("src/test.ts");
    });

    it("should format and lint when both options are true", async () => {
      execMock.mockImplementation((cmd: string, opts: any, callback: any) => {
        callback(null, { stdout: "", stderr: "" });
      });

      const processor = new PostProcessor({
        format: true,
        lint: true,
        projectRoot: "/test/project",
      });

      await processor.processFiles(["src/test.ts"]);

      expect(execMock).toHaveBeenCalledTimes(2);
      expect(execMock.mock.calls[0][0]).toContain("npx oxfmt");
      expect(execMock.mock.calls[1][0]).toContain("npx oxlint --fix");
    });

    it("should not process when no files are provided", async () => {
      const processor = new PostProcessor({
        format: true,
        lint: true,
        projectRoot: "/test/project",
      });

      await processor.processFiles([]);

      expect(execMock).not.toHaveBeenCalled();
    });

    it("should handle formatting errors gracefully", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      execMock.mockImplementation((cmd: string, opts: any, callback: any) => {
        callback(new Error("Formatting failed"), null);
      });

      const processor = new PostProcessor({
        format: true,
        lint: false,
        projectRoot: "/test/project",
      });

      // Should not throw
      await expect(
        processor.processFiles(["src/test.ts"]),
      ).resolves.not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Formatting failed:",
        "Formatting failed",
      );

      consoleWarnSpy.mockRestore();
    });

    it("should handle linting errors gracefully", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      execMock.mockImplementation((cmd: string, opts: any, callback: any) => {
        callback(new Error("Linting failed"), null);
      });

      const processor = new PostProcessor({
        format: false,
        lint: true,
        projectRoot: "/test/project",
      });

      // Should not throw
      await expect(
        processor.processFiles(["src/test.ts"]),
      ).resolves.not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Linting/Fixing failed:",
        "Linting failed",
      );

      consoleWarnSpy.mockRestore();
    });

    it("should resolve relative paths to absolute paths", async () => {
      execMock.mockImplementation((cmd: string, opts: any, callback: any) => {
        callback(null, { stdout: "", stderr: "" });
      });

      const processor = new PostProcessor({
        format: true,
        lint: false,
        projectRoot: "/test/project",
      });

      await processor.processFiles(["src/test.ts"]);

      expect(execMock).toHaveBeenCalled();
      const command = execMock.mock.calls[0][0];
      // Should contain absolute path
      expect(command).toContain("/test/project/src/test.ts");
    });

    it("should handle absolute paths correctly", async () => {
      execMock.mockImplementation((cmd: string, opts: any, callback: any) => {
        callback(null, { stdout: "", stderr: "" });
      });

      const processor = new PostProcessor({
        format: true,
        lint: false,
        projectRoot: "/test/project",
      });

      await processor.processFiles(["/absolute/path/test.ts"]);

      expect(execMock).toHaveBeenCalled();
      const command = execMock.mock.calls[0][0];
      expect(command).toContain("/absolute/path/test.ts");
    });

    it("should pass correct working directory to exec", async () => {
      execMock.mockImplementation((cmd: string, opts: any, callback: any) => {
        callback(null, { stdout: "", stderr: "" });
      });

      const processor = new PostProcessor({
        format: true,
        lint: false,
        projectRoot: "/test/project",
      });

      await processor.processFiles(["src/test.ts"]);

      expect(execMock).toHaveBeenCalled();
      const options = execMock.mock.calls[0][1];
      expect(options.cwd).toBe("/test/project");
    });

    it("should handle multiple files in single command", async () => {
      execMock.mockImplementation((cmd: string, opts: any, callback: any) => {
        callback(null, { stdout: "", stderr: "" });
      });

      const processor = new PostProcessor({
        format: true,
        lint: false,
        projectRoot: "/test/project",
      });

      const files = [
        "src/file1.ts",
        "src/file2.ts",
        "src/file3.ts",
        "src/file4.ts",
      ];

      await processor.processFiles(files);

      expect(execMock).toHaveBeenCalledTimes(1);
      const command = execMock.mock.calls[0][0];
      files.forEach((file) => {
        expect(command).toContain(file);
      });
    });

    it("should not format or lint when both options are false", async () => {
      const processor = new PostProcessor({
        format: false,
        lint: false,
        projectRoot: "/test/project",
      });

      await processor.processFiles(["src/test.ts"]);

      expect(execMock).not.toHaveBeenCalled();
    });

    it("should handle non-Error objects in catch blocks", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      execMock.mockImplementation((cmd: string, opts: any, callback: any) => {
        callback("string error", null);
      });

      const processor = new PostProcessor({
        format: true,
        lint: false,
        projectRoot: "/test/project",
      });

      await processor.processFiles(["src/test.ts"]);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Formatting failed:",
        "string error",
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
