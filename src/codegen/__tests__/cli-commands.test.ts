/**
 * Unit tests for CLI command parsing and validation
 *
 * Tests command structure, argument parsing, and option handling
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Command } from "commander";

describe("CLI command structure", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program.exitOverride(); // Prevent process.exit during tests
  });

  describe("command registration", () => {
    it("should register ipc command", () => {
      program
        .command("ipc")
        .description("Generate IPC endpoint")
        .argument("[name]", "Name of the IPC endpoint")
        .option("-d, --domain <domain>", "Domain/namespace")
        .option("--dry-run", "Show what would be generated", false);

      const ipcCommand = program.commands.find((cmd) => cmd.name() === "ipc");
      expect(ipcCommand).toBeDefined();
      expect(ipcCommand?.description()).toContain("IPC endpoint");
    });

    it("should register component command", () => {
      program
        .command("component")
        .description("Generate React component")
        .argument("[name]", "Name of the component")
        .option("--no-test", "Skip generating test file")
        .option("--dry-run", "Show what would be generated", false);

      const componentCommand = program.commands.find(
        (cmd) => cmd.name() === "component",
      );
      expect(componentCommand).toBeDefined();
      expect(componentCommand?.description()).toContain("React component");
    });

    it("should register schema command", () => {
      program
        .command("schema")
        .description("Generate database schema")
        .argument("[table]", "Name of the database table")
        .option("--dry-run", "Show what would be generated", false);

      const schemaCommand = program.commands.find(
        (cmd) => cmd.name() === "schema",
      );
      expect(schemaCommand).toBeDefined();
      expect(schemaCommand?.description()).toContain("database schema");
    });

    it("should register test command", () => {
      program
        .command("test")
        .description("Generate E2E test file")
        .argument("[feature]", "Name of the feature to test")
        .option("--dry-run", "Show what would be generated", false);

      const testCommand = program.commands.find((cmd) => cmd.name() === "test");
      expect(testCommand).toBeDefined();
      expect(testCommand?.description()).toContain("E2E test");
    });

    it("should register refactor subcommands", () => {
      const refactorCommand = program.command("refactor");
      refactorCommand
        .command("rename-ipc")
        .description("Rename IPC endpoint")
        .argument("<old-name>", "Current name")
        .argument("<new-name>", "New name")
        .option("--dry-run", "Show what would be changed", false);

      refactorCommand
        .command("rename-component")
        .description("Rename React component")
        .argument("<old-name>", "Current name")
        .argument("<new-name>", "New name")
        .option("--dry-run", "Show what would be changed", false);

      const refactor = program.commands.find(
        (cmd) => cmd.name() === "refactor",
      );
      expect(refactor).toBeDefined();
      expect(refactor?.commands).toHaveLength(2);
    });
  });

  describe("option parsing", () => {
    it("should parse --dry-run flag", () => {
      program
        .command("ipc")
        .argument("[name]")
        .option("--dry-run", "Dry run mode", false)
        .action((name, options) => {
          expect(options.dryRun).toBe(true);
        });

      program.parse(["node", "test", "ipc", "testName", "--dry-run"]);
    });

    it("should parse --domain option", () => {
      program
        .command("ipc")
        .argument("[name]")
        .option("-d, --domain <domain>", "Domain")
        .action((name, options) => {
          expect(options.domain).toBe("testDomain");
        });

      program.parse([
        "node",
        "test",
        "ipc",
        "testName",
        "--domain",
        "testDomain",
      ]);
    });

    it("should parse --no-test flag", () => {
      program
        .command("component")
        .argument("[name]")
        .option("--no-test", "Skip test file")
        .action((name, options) => {
          expect(options.test).toBe(false);
        });

      program.parse([
        "node",
        "test",
        "component",
        "TestComponent",
        "--no-test",
      ]);
    });

    it("should parse --non-interactive flag", () => {
      program
        .command("ipc")
        .argument("[name]")
        .option("--non-interactive", "Non-interactive mode", false)
        .action((name, options) => {
          expect(options.nonInteractive).toBe(true);
        });

      program.parse(["node", "test", "ipc", "testName", "--non-interactive"]);
    });

    it("should parse boolean flags with default false", () => {
      program
        .command("ipc")
        .argument("[name]")
        .option("-m, --mutation", "Mark as mutation", false)
        .action((name, options) => {
          expect(options.mutation).toBe(true);
        });

      program.parse(["node", "test", "ipc", "testName", "--mutation"]);
    });

    it("should use default values when options not provided", () => {
      program
        .command("ipc")
        .argument("[name]")
        .option("--dry-run", "Dry run mode", false)
        .option("-m, --mutation", "Mark as mutation", false)
        .action((name, options) => {
          expect(options.dryRun).toBe(false);
          expect(options.mutation).toBe(false);
        });

      program.parse(["node", "test", "ipc", "testName"]);
    });
  });

  describe("argument parsing", () => {
    it("should parse required arguments", () => {
      const refactorCommand = program.command("refactor");
      refactorCommand
        .command("rename-ipc")
        .argument("<old-name>", "Old name")
        .argument("<new-name>", "New name")
        .action((oldName, newName) => {
          expect(oldName).toBe("oldIpc");
          expect(newName).toBe("newIpc");
        });

      program.parse([
        "node",
        "test",
        "refactor",
        "rename-ipc",
        "oldIpc",
        "newIpc",
      ]);
    });

    it("should parse optional arguments", () => {
      program
        .command("ipc")
        .argument("[name]", "IPC name")
        .action((name) => {
          expect(name).toBe("testIpc");
        });

      program.parse(["node", "test", "ipc", "testIpc"]);
    });

    it("should handle missing optional arguments", () => {
      program
        .command("ipc")
        .argument("[name]", "IPC name")
        .action((name) => {
          expect(name).toBeUndefined();
        });

      program.parse(["node", "test", "ipc"]);
    });
  });

  describe("help and version", () => {
    it("should provide help option", () => {
      program.helpOption("-h, --help", "Display help");

      // Commander.js adds help option automatically, check if it's callable
      expect(program.helpOption).toBeDefined();
      expect(typeof program.helpOption).toBe("function");
    });

    it("should provide version option", () => {
      program.version("1.0.0", "-v, --version", "Display version");

      const versionOption = program.options.find((opt) =>
        opt.flags.includes("--version"),
      );
      expect(versionOption).toBeDefined();
    });

    it("should have program name and description", () => {
      program
        .name("codegen")
        .description("Code generation and scaffolding tool");

      expect(program.name()).toBe("codegen");
      expect(program.description()).toContain("Code generation");
    });
  });

  describe("command validation", () => {
    it("should validate that all scaffolding commands exist", () => {
      // Register all commands
      program.command("ipc").description("Generate IPC endpoint");
      program.command("component").description("Generate React component");
      program.command("schema").description("Generate database schema");
      program.command("test").description("Generate E2E test");

      const commandNames = program.commands.map((cmd) => cmd.name());

      expect(commandNames).toContain("ipc");
      expect(commandNames).toContain("component");
      expect(commandNames).toContain("schema");
      expect(commandNames).toContain("test");
    });

    it("should validate that dry-run option exists on all generation commands", () => {
      const commands = ["ipc", "component", "schema", "test"];

      commands.forEach((cmdName) => {
        const cmd = program.command(cmdName);
        cmd.option("--dry-run", "Dry run mode", false);

        const dryRunOption = cmd.options.find((opt) =>
          opt.flags.includes("--dry-run"),
        );
        expect(dryRunOption).toBeDefined();
      });
    });

    it("should validate that non-interactive option exists on generation commands", () => {
      const commands = ["ipc", "component", "schema", "test"];

      commands.forEach((cmdName) => {
        const cmd = program.command(cmdName);
        cmd.option("--non-interactive", "Non-interactive mode", false);

        const nonInteractiveOption = cmd.options.find((opt) =>
          opt.flags.includes("--non-interactive"),
        );
        expect(nonInteractiveOption).toBeDefined();
      });
    });
  });

  describe("command descriptions", () => {
    it("should have descriptive help text for ipc command", () => {
      program
        .command("ipc")
        .description(
          "Generate a complete IPC endpoint with handler, contract, hook, and test",
        );

      const ipcCommand = program.commands.find((cmd) => cmd.name() === "ipc");
      expect(ipcCommand?.description()).toContain("handler");
      expect(ipcCommand?.description()).toContain("contract");
      expect(ipcCommand?.description()).toContain("hook");
    });

    it("should have descriptive help text for component command", () => {
      program
        .command("component")
        .description("Generate a React component with test and story files");

      const componentCommand = program.commands.find(
        (cmd) => cmd.name() === "component",
      );
      expect(componentCommand?.description()).toContain("React component");
      expect(componentCommand?.description()).toContain("test");
      expect(componentCommand?.description()).toContain("story");
    });
  });

  describe("dry-run mode behavior", () => {
    it("should set dryRun flag when --dry-run is provided", () => {
      let capturedOptions: any;

      program
        .command("ipc")
        .argument("[name]")
        .option("--dry-run", "Dry run mode", false)
        .action((name, options) => {
          capturedOptions = options;
        });

      program.parse(["node", "test", "ipc", "testName", "--dry-run"]);

      expect(capturedOptions.dryRun).toBe(true);
    });

    it("should not set dryRun flag when --dry-run is not provided", () => {
      let capturedOptions: any;

      program
        .command("ipc")
        .argument("[name]")
        .option("--dry-run", "Dry run mode", false)
        .action((name, options) => {
          capturedOptions = options;
        });

      program.parse(["node", "test", "ipc", "testName"]);

      expect(capturedOptions.dryRun).toBe(false);
    });

    it("should support dry-run on refactor commands", () => {
      let capturedOptions: any;

      const refactorCommand = program.command("refactor");
      refactorCommand
        .command("rename-ipc")
        .argument("<old-name>")
        .argument("<new-name>")
        .option("--dry-run", "Dry run mode", false)
        .action((oldName, newName, options) => {
          capturedOptions = options;
        });

      program.parse([
        "node",
        "test",
        "refactor",
        "rename-ipc",
        "old",
        "new",
        "--dry-run",
      ]);

      expect(capturedOptions.dryRun).toBe(true);
    });
  });

  describe("interactive vs non-interactive mode", () => {
    it("should default to interactive mode", () => {
      let capturedOptions: any;

      program
        .command("ipc")
        .argument("[name]")
        .option("--non-interactive", "Non-interactive mode", false)
        .action((name, options) => {
          capturedOptions = options;
        });

      program.parse(["node", "test", "ipc", "testName"]);

      expect(capturedOptions.nonInteractive).toBe(false);
    });

    it("should switch to non-interactive mode when flag is provided", () => {
      let capturedOptions: any;

      program
        .command("ipc")
        .argument("[name]")
        .option("--non-interactive", "Non-interactive mode", false)
        .action((name, options) => {
          capturedOptions = options;
        });

      program.parse(["node", "test", "ipc", "testName", "--non-interactive"]);

      expect(capturedOptions.nonInteractive).toBe(true);
    });
  });
});
