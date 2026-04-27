#!/usr/bin/env node

/**
 * Code Generation CLI Tool
 *
 * This CLI tool provides commands for scaffolding common patterns in the Dyad/Kiro application:
 * - IPC endpoints (handlers, contracts, hooks, tests)
 * - React components (component, test, story files)
 * - Database schemas (Drizzle schemas and migrations)
 * - E2E tests (Playwright test files)
 * - Code snippets (common patterns)
 * - Refactoring operations (rename IPC endpoints, components)
 * - Documentation generation
 *
 * Usage:
 *   npm run codegen -- <command> [options]
 *   or
 *   ts-node scripts/codegen.ts <command> [options]
 */

import { Command } from "commander";
import { readFileSync } from "fs";
import { join } from "path";
import {
  collectParameters,
  type ParameterDefinition,
  validators,
} from "../src/codegen/prompt-system";
import {
  printWarning,
  printInfo,
  printGenerationSummary,
  printValidationErrors,
  type GeneratedFileInfo,
} from "../src/codegen/output-formatter";
import { TemplateLoader } from "../src/codegen/template-loader";
import { TemplateEngine } from "../src/codegen/template-engine";
import { FileSystemManager } from "../src/codegen/file-system";
import { createIpcGenerator } from "../src/codegen/generators/ipc-generator";
import { createComponentGenerator } from "../src/codegen/generators/component-generator";
import { createDbGenerator } from "../src/codegen/generators/db-generator";
import { createTestGenerator } from "../src/codegen/generators/test-generator";
import { createSnippetGenerator } from "../src/codegen/generators/snippet-generator";
import { createRenameGenerator } from "../src/codegen/generators/rename-generator";
import { Orchestrator } from "../src/codegen/orchestrator";
import { ConfigLoader } from "../src/codegen/config-loader";
import { PostProcessor } from "../src/codegen/post-processor";

// Version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8"),
);

const program = new Command();

// Configure the main program
program
  .name("codegen")
  .description("Code generation and scaffolding tool for Dyad/Kiro")
  .version(packageJson.version, "-v, --version", "Display version number")
  .helpOption("-h, --help", "Display help for command");

/**
 * IPC Endpoint Generation Command
 *
 * Generates a complete IPC endpoint including:
 * - Main process handler
 * - IPC contract/channel definition
 * - React Query hook for renderer
 * - E2E test file
 */
program
  .command("ipc")
  .description(
    "Generate a complete IPC endpoint with handler, contract, hook, and test",
  )
  .argument(
    "[name]",
    'Name of the IPC endpoint (e.g., "getUser", "updateSettings")',
  )
  .option(
    "-d, --domain <domain>",
    'Domain/namespace for the IPC endpoint (e.g., "user", "settings")',
  )
  .option(
    "-i, --input-schema <schema>",
    "Input schema definition (TypeScript type or Zod schema)",
  )
  .option(
    "-o, --output-schema <schema>",
    "Output schema definition (TypeScript type or Zod schema)",
  )
  .option(
    "-m, --mutation",
    "Mark this endpoint as a mutation (uses useMutation instead of useQuery)",
    false,
  )
  .option(
    "--dry-run",
    "Show what would be generated without creating files",
    false,
  )
  .option("--no-test", "Skip generating E2E test file")
  .option(
    "--non-interactive",
    "Run in non-interactive mode (all parameters must be provided)",
    false,
  )
  .action(
    async (name: string | undefined, options: Record<string, unknown>) => {
      // Define parameter requirements for IPC generation
      const parameterDefinitions: ParameterDefinition[] = [
        {
          name: "name",
          description: "Name of the IPC endpoint",
          type: "string",
          required: true,
          validate: validators.combine(
            validators.notEmpty,
            validators.camelCase,
          ),
        },
        {
          name: "domain",
          description: "Domain/namespace for the IPC endpoint",
          type: "string",
          required: true,
          validate: validators.combine(
            validators.notEmpty,
            validators.identifier,
          ),
        },
      ];

      // Collect parameters (either from CLI args or interactive prompts)
      const result = await collectParameters(
        parameterDefinitions,
        { name, ...options },
        {
          interactive: !options.nonInteractive,
          dryRun: options.dryRun as boolean,
        },
      );

      if (!result.success) {
        printValidationErrors(result.errors);
        process.exit(1);
      }

      // Show dry-run or generation message
      if (options.dryRun) {
        printInfo("Running in dry-run mode - no files will be created");
      }

      // Initialize generator components
      const templatesDir = join(__dirname, "../src/codegen/templates");
      const projectRoot = join(__dirname, "..");

      const loader = new TemplateLoader({
        templatesDirectory: templatesDir,
        cacheEnabled: false, // Disable cache for CLI
      });
      const engine = new TemplateEngine();
      const fsManager = new FileSystemManager(
        projectRoot,
        options.dryRun as boolean,
      );
      const generator = createIpcGenerator(loader, engine, fsManager);

      try {
        const results = await generator.generate({
          name: result.parameters.name,
          domain: result.parameters.domain,
          inputSchema: options.inputSchema as string,
          outputSchema: options.outputSchema as string,
          mutation: options.mutation as boolean,
          skipTest: options.noTest as boolean,
        });

        const files: GeneratedFileInfo[] = results.map((r) => ({
          path: r.path,
          action: r.action as any, // Cast to any to handle extended actions if needed
          size: r.size,
        }));

        printGenerationSummary(files, {
          dryRun: options.dryRun as boolean,
          verbose: true,
        });

        // Post-processing (formatting and linting)
        if (!options.dryRun && options.format !== false) {
          const postProcessor = new PostProcessor({
            format: true,
            lint: !!options.lint,
            projectRoot,
          });
          const generatedPaths = results
            .filter(
              (r) =>
                r.success && (r.action === "create" || r.action === "update"),
            )
            .map((r) => r.path);
          await postProcessor.processFiles(generatedPaths);
        }
      } catch (error) {
        printWarning(
          `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

/**
 * React Component Generation Command
 *
 * Generates a React component with:
 * - Component file (.tsx)
 * - Test file (.test.tsx)
 * - Storybook story file (.stories.tsx)
 */
program
  .command("component")
  .description("Generate a React component with test and story files")
  .argument(
    "[name]",
    'Name of the component (e.g., "UserProfile", "SettingsPanel")',
  )
  .option("--no-test", "Skip generating test file")
  .option("--no-story", "Skip generating Storybook story file")
  .option("--base-ui", "Include Base UI component imports and patterns", false)
  .option(
    "--dry-run",
    "Show what would be generated without creating files",
    false,
  )
  .option(
    "--non-interactive",
    "Run in non-interactive mode (all parameters must be provided)",
    false,
  )
  .action(
    async (name: string | undefined, options: Record<string, unknown>) => {
      // Define parameter requirements for component generation
      const parameterDefinitions: ParameterDefinition[] = [
        {
          name: "name",
          description: "Name of the React component",
          type: "string",
          required: true,
          validate: validators.combine(
            validators.notEmpty,
            validators.pascalCase,
          ),
        },
      ];

      // Collect parameters (either from CLI args or interactive prompts)
      const result = await collectParameters(
        parameterDefinitions,
        { name, ...options },
        {
          interactive: !options.nonInteractive,
          dryRun: options.dryRun as boolean,
        },
      );

      if (!result.success) {
        printValidationErrors(result.errors);
        process.exit(1);
      }

      // Show dry-run or generation message
      if (options.dryRun) {
        printInfo("Running in dry-run mode - no files will be created");
      }

      // Initialize generator components
      const templatesDir = join(__dirname, "../src/codegen/templates");
      const projectRoot = join(__dirname, "..");

      const loader = new TemplateLoader({
        templatesDirectory: templatesDir,
        cacheEnabled: false,
      });
      const engine = new TemplateEngine();
      const fsManager = new FileSystemManager(
        projectRoot,
        options.dryRun as boolean,
      );
      const generator = createComponentGenerator(loader, engine, fsManager);

      try {
        const results = await generator.generate({
          name: result.parameters.name,
          directory: options.dir as string,
          skipTest: options.noTest as boolean,
          skipStory: options.noStory as boolean,
          baseUi: options.baseUi as boolean,
        });

        const files: GeneratedFileInfo[] = results.map((r) => ({
          path: r.path,
          action: r.action as any,
          size: r.size,
        }));

        printGenerationSummary(files, {
          dryRun: options.dryRun as boolean,
          verbose: true,
        });

        // Post-processing
        if (!options.dryRun && options.format !== false) {
          const postProcessor = new PostProcessor({
            format: true,
            lint: !!options.lint,
            projectRoot,
          });
          const generatedPaths = results
            .filter(
              (r) =>
                r.success && (r.action === "create" || r.action === "update"),
            )
            .map((r) => r.path);
          await postProcessor.processFiles(generatedPaths);
        }
      } catch (error) {
        printWarning(
          `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

/**
 * Database Schema Generation Command
 *
 * Generates database schema and migration files using Drizzle ORM
 */
program
  .command("db")
  .description("Generate a Drizzle database schema")
  .argument("[name]", 'Name of the table (e.g., "users", "posts")')
  .option(
    "--no-append",
    "Create a new schema file instead of appending to schema.ts",
  )
  .option(
    "--dry-run",
    "Show what would be generated without creating files",
    false,
  )
  .option(
    "--non-interactive",
    "Run in non-interactive mode (all parameters must be provided)",
    false,
  )
  .action(
    async (name: string | undefined, options: Record<string, unknown>) => {
      const parameterDefinitions: ParameterDefinition[] = [
        {
          name: "name",
          description: "Name of the database table",
          type: "string",
          required: true,
          validate: validators.combine(
            validators.notEmpty,
            validators.identifier,
          ),
        },
      ];

      const result = await collectParameters(
        parameterDefinitions,
        { name, ...options },
        {
          interactive: !options.nonInteractive,
          dryRun: options.dryRun as boolean,
        },
      );

      if (!result.success) {
        printValidationErrors(result.errors);
        process.exit(1);
      }

      if (options.dryRun) {
        printInfo("Running in dry-run mode - no files will be created");
      }

      const templatesDir = join(__dirname, "../src/codegen/templates");
      const projectRoot = join(__dirname, "..");

      const loader = new TemplateLoader({
        templatesDirectory: templatesDir,
        cacheEnabled: false,
      });
      const engine = new TemplateEngine();
      const fsManager = new FileSystemManager(
        projectRoot,
        options.dryRun as boolean,
      );
      const generator = createDbGenerator(loader, engine, fsManager);

      try {
        const results = await generator.generate({
          name: result.parameters.name,
          append: options.append !== false,
        });

        const files: GeneratedFileInfo[] = results.map((r) => ({
          path: r.path,
          action: r.action as any,
          size: r.size,
        }));

        printGenerationSummary(files, {
          dryRun: options.dryRun as boolean,
          verbose: true,
        });

        // Post-processing
        if (!options.dryRun && options.format !== false) {
          const postProcessor = new PostProcessor({
            format: true,
            lint: !!options.lint,
            projectRoot,
          });
          const generatedPaths = results
            .filter(
              (r) =>
                r.success && (r.action === "create" || r.action === "update"),
            )
            .map((r) => r.path);
          await postProcessor.processFiles(generatedPaths);
        }
      } catch (error) {
        printWarning(
          `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

/**
 * E2E Test Generation Command
 *
 * Generates E2E test files with proper Playwright setup and fixtures
 */
program
  .command("test")
  .description("Generate E2E test file with Playwright setup")
  .argument("[name]", 'Name of the test (e.g., "loginFlow", "chatInteraction")')
  .option(
    "-f, --feature <feature>",
    'Feature name for the filename (e.g., "user-auth")',
  )
  .option(
    "--dry-run",
    "Show what would be generated without creating files",
    false,
  )
  .option(
    "--non-interactive",
    "Run in non-interactive mode (all parameters must be provided)",
    false,
  )
  .action(
    async (name: string | undefined, options: Record<string, unknown>) => {
      const parameterDefinitions: ParameterDefinition[] = [
        {
          name: "name",
          description: "Name of the test case",
          type: "string",
          required: true,
          validate: validators.notEmpty,
        },
      ];

      const result = await collectParameters(
        parameterDefinitions,
        { name, ...options },
        {
          interactive: !options.nonInteractive,
          dryRun: options.dryRun as boolean,
        },
      );

      if (!result.success) {
        printValidationErrors(result.errors);
        process.exit(1);
      }

      if (options.dryRun) {
        printInfo("Running in dry-run mode - no files will be created");
      }

      const templatesDir = join(__dirname, "../src/codegen/templates");
      const projectRoot = join(__dirname, "..");

      const loader = new TemplateLoader({
        templatesDirectory: templatesDir,
        cacheEnabled: false,
      });
      const engine = new TemplateEngine();
      const fsManager = new FileSystemManager(
        projectRoot,
        options.dryRun as boolean,
      );
      const generator = createTestGenerator(loader, engine, fsManager);

      try {
        const results = await generator.generate({
          name: result.parameters.name,
          feature: options.feature as string,
        });

        const files: GeneratedFileInfo[] = results.map((r) => ({
          path: r.path,
          action: r.action as any,
          size: r.size,
        }));

        printGenerationSummary(files, {
          dryRun: options.dryRun as boolean,
          verbose: true,
        });

        // Post-processing
        if (!options.dryRun && options.format !== false) {
          const postProcessor = new PostProcessor({
            format: true,
            lint: !!options.lint,
            projectRoot,
          });
          const generatedPaths = results
            .filter(
              (r) =>
                r.success && (r.action === "create" || r.action === "update"),
            )
            .map((r) => r.path);
          await postProcessor.processFiles(generatedPaths);
        }
      } catch (error) {
        printWarning(
          `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

/**
 * Code Snippet Insertion Command
 *
 * Inserts common code patterns/snippets
 */
program
  .command("snippet")
  .description("Insert a code snippet for common patterns")
  .argument(
    "<type>",
    'Type of snippet (e.g., "ipc-registration", "react-hook")',
  )
  .argument("[name]", "Name for the snippet entities")
  .option("-f, --file <file>", "Target file to insert snippet into")
  .option(
    "--dry-run",
    "Show what would be generated without creating files",
    false,
  )
  .action(
    async (
      type: string,
      name: string | undefined,
      options: Record<string, unknown>,
    ) => {
      const projectRoot = join(__dirname, "..");
      const configLoader = new ConfigLoader(projectRoot);
      const config = await configLoader.loadConfig();

      const templatesDir = config.templatesDirectory
        ? join(projectRoot, config.templatesDirectory)
        : join(__dirname, "../src/codegen/templates");

      const loader = new TemplateLoader({
        templatesDirectory: templatesDir,
        cacheEnabled: false,
      });
      const engine = new TemplateEngine();
      const fsManager = new FileSystemManager(
        projectRoot,
        options.dryRun as boolean,
      );
      const generator = createSnippetGenerator(loader, engine, fsManager);

      try {
        const results = await generator.generate({
          type,
          file: options.file as string,
          params: { name },
        });

        if (options.file) {
          const files: GeneratedFileInfo[] = results.map((r) => ({
            path: r.path,
            action: r.action as any,
            size: r.size,
          }));

          printGenerationSummary(files, {
            dryRun: options.dryRun as boolean,
            verbose: true,
          });
        } else {
          // Just print the snippet
          const result = results[0] as any;
          console.log("\n--- Snippet Result ---");
          console.log(result.content);
          console.log("----------------------\n");
        }
      } catch (error) {
        printWarning(
          `Snippet generation failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

/**
 * Rename Entities Command
 *
 * Safely renames IPC endpoints or components.
 */
program
  .command("rename")
  .description("Safely rename an IPC endpoint or component")
  .argument("<type>", 'Type of entity ("ipc" or "component")')
  .argument("<oldName>", "Current name of the entity")
  .argument("<newName>", "New name for the entity")
  .option("-d, --domain <domain>", "Domain for IPC endpoint", "app")
  .option(
    "--dry-run",
    "Show what would be renamed without making changes",
    false,
  )
  .action(
    async (
      type: string,
      oldName: string,
      newName: string,
      options: Record<string, unknown>,
    ) => {
      if (type !== "ipc" && type !== "component") {
        printWarning('Type must be either "ipc" or "component"');
        process.exit(1);
      }

      if (options.dryRun) {
        printInfo("Running in dry-run mode - no changes will be made");
      }

      const projectRoot = join(__dirname, "..");
      const fsManager = new FileSystemManager(
        projectRoot,
        options.dryRun as boolean,
      );
      const generator = createRenameGenerator(fsManager);

      try {
        const results = await generator.generate({
          type: type as "ipc" | "component",
          oldName,
          newName,
          domain: options.domain as string,
        });

        const files: GeneratedFileInfo[] = results.map((r) => ({
          path: r.path,
          action: r.action as any,
          size: r.size,
        }));

        printGenerationSummary(files, {
          dryRun: options.dryRun as boolean,
          verbose: true,
        });

        // Post-processing for renames (formatting the new files)
        if (!options.dryRun && options.format !== false) {
          const postProcessor = new PostProcessor({
            format: true,
            lint: false,
            projectRoot,
          });
          const generatedPaths = results
            .filter(
              (r) =>
                r.success && (r.action === "create" || r.action === "update"),
            )
            .map((r) => r.path);
          await postProcessor.processFiles(generatedPaths);
        }
      } catch (error) {
        printWarning(
          `Rename failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    },
  );

/**
 * Complex Workflow Command
 *
 * Coordinates multiple generators for a full feature.
 */
program
  .command("workflow")
  .description("Execute a complex multi-generator workflow")
  .argument("<name>", "Name of the feature")
  .option("-d, --domain <domain>", "Domain/Module name", "app")
  .option("--no-ipc", "Skip IPC generation")
  .option("--no-component", "Skip Component generation")
  .option("--no-db", "Skip Database generation")
  .option(
    "--dry-run",
    "Show what would be generated without making changes",
    false,
  )
  .action(async (name: string, options: Record<string, unknown>) => {
    if (options.dryRun) {
      printInfo("Running in dry-run mode - no changes will be made");
    }

    const projectRoot = join(__dirname, "..");
    const configLoader = new ConfigLoader(projectRoot);
    const config = await configLoader.loadConfig();

    const templatesDir = config.templatesDirectory
      ? join(projectRoot, config.templatesDirectory)
      : join(__dirname, "../src/codegen/templates");

    const loader = new TemplateLoader({
      templatesDirectory: templatesDir,
      cacheEnabled: false,
    });
    const engine = new TemplateEngine();
    const fsManager = new FileSystemManager(
      projectRoot,
      options.dryRun as boolean,
    );

    const ipcGen = createIpcGenerator(loader, engine, fsManager);
    const componentGen = createComponentGenerator(loader, engine, fsManager);
    const dbGen = createDbGenerator(loader, engine, fsManager);
    const testGen = createTestGenerator(loader, engine, fsManager);

    const orchestrator = new Orchestrator(ipcGen, componentGen, dbGen, testGen);

    try {
      const results = await orchestrator.executeWorkflow({
        name,
        domain: options.domain as string,
        withIpc: options.ipc !== false,
        withComponent: options.component !== false,
        withDb: options.db !== false,
      });

      const files: GeneratedFileInfo[] = results.map((r) => ({
        path: r.path,
        action: r.action as any,
        size: r.size,
      }));

      printGenerationSummary(files, {
        dryRun: options.dryRun as boolean,
        verbose: true,
      });

      // Post-processing
      if (!options.dryRun && options.format !== false) {
        const postProcessor = new PostProcessor({
          format: true,
          lint: !!options.lint,
          projectRoot,
        });
        const generatedPaths = results
          .filter(
            (r) =>
              r.success && (r.action === "create" || r.action === "update"),
          )
          .map((r) => r.path);
        await postProcessor.processFiles(generatedPaths);
      }
    } catch (error) {
      printWarning(
        `Workflow failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  });

// Parse command-line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
