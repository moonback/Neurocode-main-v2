/**
 * Unit tests for the output formatting system
 *
 * Tests colored console output, summary formatting, and dry-run mode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatMessage,
  printMessage,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printGenerationSummary,
  formatValidationErrors,
  printValidationErrors,
  createSpinner,
  type GeneratedFileInfo,
} from "../output-formatter";

describe("output-formatter", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true as any);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
  });

  describe("formatMessage", () => {
    it("should format success messages with green color", () => {
      const result = formatMessage("success", "Operation completed");
      expect(result).toContain("✓");
      expect(result).toContain("Operation completed");
      expect(result).toContain("\x1b[32m"); // Green color code
    });

    it("should format error messages with red color", () => {
      const result = formatMessage("error", "Operation failed");
      expect(result).toContain("✗");
      expect(result).toContain("Operation failed");
      expect(result).toContain("\x1b[31m"); // Red color code
    });

    it("should format warning messages with yellow color", () => {
      const result = formatMessage("warning", "Be careful");
      expect(result).toContain("⚠");
      expect(result).toContain("Be careful");
      expect(result).toContain("\x1b[33m"); // Yellow color code
    });

    it("should format info messages with blue color", () => {
      const result = formatMessage("info", "For your information");
      expect(result).toContain("ℹ");
      expect(result).toContain("For your information");
      expect(result).toContain("\x1b[34m"); // Blue color code
    });

    it("should include reset codes", () => {
      const result = formatMessage("success", "Test");
      expect(result).toContain("\x1b[0m"); // Reset code
    });
  });

  describe("printMessage", () => {
    it("should print formatted message to console", () => {
      printMessage("success", "Test message");
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Test message"),
      );
    });
  });

  describe("convenience print functions", () => {
    it("printSuccess should print success message", () => {
      printSuccess("Success!");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Success!"),
      );
    });

    it("printError should print error message", () => {
      printError("Error!");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error!"),
      );
    });

    it("printWarning should print warning message", () => {
      printWarning("Warning!");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning!"),
      );
    });

    it("printInfo should print info message", () => {
      printInfo("Info!");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Info!"),
      );
    });
  });

  describe("printGenerationSummary", () => {
    it("should print summary with created files", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/test.ts", action: "create", size: 1024 },
        { path: "src/test2.ts", action: "create", size: 2048 },
      ];

      printGenerationSummary(files, { verbose: true });

      expect(consoleLogSpy).toHaveBeenCalled();
      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("src/test.ts");
      expect(calls).toContain("src/test2.ts");
      expect(calls).toContain("CREATE");
    });

    it("should print summary with updated files", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/existing.ts", action: "update", size: 1024 },
      ];

      printGenerationSummary(files);

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("src/existing.ts");
      expect(calls).toContain("UPDATE");
    });

    it("should print summary with skipped files", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/skip.ts", action: "skip", size: 1024 },
      ];

      printGenerationSummary(files);

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("src/skip.ts");
      expect(calls).toContain("SKIP");
    });

    it("should show dry-run header when dryRun is true", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/test.ts", action: "create" },
      ];

      printGenerationSummary(files, { dryRun: true });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("Dry Run");
      expect(calls).toContain("No files will be created");
    });

    it("should show file sizes in verbose mode", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/test.ts", action: "create", size: 1024 },
      ];

      printGenerationSummary(files, { verbose: true });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("1.0 KB");
    });

    it("should not show file sizes in non-verbose mode", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/test.ts", action: "create", size: 1024 },
      ];

      printGenerationSummary(files, { verbose: false });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).not.toContain("KB");
    });

    it("should show statistics for multiple file actions", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/test1.ts", action: "create" },
        { path: "src/test2.ts", action: "create" },
        { path: "src/test3.ts", action: "update" },
        { path: "src/test4.ts", action: "skip" },
      ];

      printGenerationSummary(files);

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("2 created");
      expect(calls).toContain("1 updated");
      expect(calls).toContain("1 skipped");
    });

    it("should handle empty file list", () => {
      const files: GeneratedFileInfo[] = [];

      printGenerationSummary(files);

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("No files to generate");
    });

    it("should show completion message for non-dry-run", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/test.ts", action: "create" },
      ];

      printGenerationSummary(files, { dryRun: false });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("Generation completed successfully");
    });

    it("should show dry-run instruction message", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/test.ts", action: "create" },
      ];

      printGenerationSummary(files, { dryRun: true });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("Run without --dry-run to create these files");
    });
  });

  describe("formatValidationErrors", () => {
    it("should format single validation error", () => {
      const errors = ["Invalid parameter name"];
      const result = formatValidationErrors(errors);

      expect(result).toContain("Validation Errors:");
      expect(result).toContain("Invalid parameter name");
    });

    it("should format multiple validation errors", () => {
      const errors = ["Error 1", "Error 2", "Error 3"];
      const result = formatValidationErrors(errors);

      expect(result).toContain("Error 1");
      expect(result).toContain("Error 2");
      expect(result).toContain("Error 3");
    });

    it("should return empty string for empty error list", () => {
      const errors: string[] = [];
      const result = formatValidationErrors(errors);

      expect(result).toBe("");
    });

    it("should include bullet points for errors", () => {
      const errors = ["Error 1"];
      const result = formatValidationErrors(errors);

      expect(result).toContain("•");
    });
  });

  describe("printValidationErrors", () => {
    it("should print formatted validation errors", () => {
      const errors = ["Error 1", "Error 2"];
      printValidationErrors(errors);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Validation Errors:"),
      );
    });

    it("should not print anything for empty error list", () => {
      const errors: string[] = [];
      printValidationErrors(errors);

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("createSpinner", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should create a spinner with start and stop methods", () => {
      const spinner = createSpinner("Loading...");

      expect(spinner).toHaveProperty("start");
      expect(spinner).toHaveProperty("stop");
      expect(typeof spinner.start).toBe("function");
      expect(typeof spinner.stop).toBe("function");
    });

    it("should write spinner frames when started", () => {
      const spinner = createSpinner("Loading...");
      spinner.start();

      expect(stdoutWriteSpy).toHaveBeenCalled();
      expect(stdoutWriteSpy.mock.calls[0][0]).toContain("Loading...");

      spinner.stop();
    });

    it("should animate spinner frames", () => {
      const spinner = createSpinner("Loading...");
      spinner.start();

      const initialCallCount = stdoutWriteSpy.mock.calls.length;

      // Advance timers to trigger animation
      vi.advanceTimersByTime(160); // 2 frames at 80ms each

      expect(stdoutWriteSpy.mock.calls.length).toBeGreaterThan(
        initialCallCount,
      );

      spinner.stop();
    });

    it("should stop animation and clear line", () => {
      const spinner = createSpinner("Loading...");
      spinner.start();

      spinner.stop();

      // Should write clear line sequence
      const lastCall =
        stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0];
      expect(lastCall).toContain("\r\x1b[K");
    });

    it("should display final message when stopped", () => {
      const spinner = createSpinner("Loading...");
      spinner.start();

      spinner.stop("Done!");

      expect(consoleLogSpy).toHaveBeenCalledWith("Done!");
    });

    it("should not display message when stopped without final message", () => {
      const spinner = createSpinner("Loading...");
      spinner.start();

      consoleLogSpy.mockClear();
      spinner.stop();

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("file size formatting", () => {
    it("should format bytes correctly", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/small.ts", action: "create", size: 500 },
      ];

      printGenerationSummary(files, { verbose: true });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("500 B");
    });

    it("should format kilobytes correctly", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/medium.ts", action: "create", size: 2048 },
      ];

      printGenerationSummary(files, { verbose: true });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("2.0 KB");
    });

    it("should format megabytes correctly", () => {
      const files: GeneratedFileInfo[] = [
        { path: "src/large.ts", action: "create", size: 2097152 },
      ];

      printGenerationSummary(files, { verbose: true });

      const calls = consoleLogSpy.mock.calls.flat().join("\n");
      expect(calls).toContain("2.0 MB");
    });
  });
});
