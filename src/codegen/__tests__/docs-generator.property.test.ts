/**
 * Property-based tests for Documentation Generator
 *
 * Tests universal properties that should hold for documentation generation.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  createDocumentationGenerator,
  DocumentationGenerator,
} from "../docs-generator";
import { createFileSystemManager, FileSystemManager } from "../file-system";

describe("Documentation Generator Property Tests", () => {
  let tempDir: string;
  let fsManager: FileSystemManager;
  let docsGen: DocumentationGenerator;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-gen-prop-test-"));
    fsManager = createFileSystemManager(tempDir, false);
    docsGen = createDocumentationGenerator(tempDir, fsManager);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await docsGen.stopAllWatchers();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Property 10: Documentation Synchronization
   * **Validates: Requirements 10.5**
   *
   * For any code file with JSDoc comments, updating the code then regenerating
   * documentation SHALL reflect the current JSDoc content (documentation stays in sync).
   */
  describe("Property 10: Documentation Synchronization", () => {
    // Arbitrary for valid TypeScript identifiers
    const identifierArb = fc
      .stringMatching(/^[a-z][a-zA-Z0-9]{2,15}$/)
      .filter((s) => !["function", "const", "let", "var"].includes(s));

    // Arbitrary for parameter names
    const paramNameArb = fc.stringMatching(/^[a-z][a-zA-Z0-9]{1,10}$/);

    it("regenerating docs after code changes produces different documentation", async () => {
      await fc.assert(
        fc.asyncProperty(
          identifierArb,
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 101, max: 200 }),
          async (contractName, value1, value2) => {
            // Create contracts directory
            const contractsDir = path.join(tempDir, "src/ipc/types");
            await fs.mkdir(contractsDir, { recursive: true });

            const contractFile = path.join(contractsDir, "test.ts");

            // Initial contract
            const initialContent = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

/**
 * Test contract version ${value1}
 */
export const testContract = {
  ${contractName}: defineContract({
    channel: "test:${contractName}",
    input: z.object({ id: z.number() }),
    output: z.object({ result: z.string() }),
  }),
};
`;

            await fs.writeFile(contractFile, initialContent);

            // Generate initial documentation
            await docsGen.generateIPCDocumentation("src/ipc/types", {
              outputDir: "docs/ipc",
            });

            // Read initial documentation
            const docsPath = path.join(tempDir, "docs/ipc/test.md");
            const initialDocs = await fs.readFile(docsPath, "utf-8");

            // Update the contract
            const updatedContent = `
import { z } from "zod";
import { defineContract} from "../contracts/core";

/**
 * Test contract version ${value2}
 */
export const testContract = {
  ${contractName}: defineContract({
    channel: "test:${contractName}",
    input: z.object({ id: z.number() }),
    output: z.object({ result: z.string() }),
  }),
};
`;

            await fs.writeFile(contractFile, updatedContent);

            // Regenerate documentation
            await docsGen.generateIPCDocumentation("src/ipc/types", {
              outputDir: "docs/ipc",
            });

            // Read updated documentation
            const updatedDocs = await fs.readFile(docsPath, "utf-8");

            // Verify documentation changed (synchronization occurred)
            expect(updatedDocs).not.toBe(initialDocs);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    }, 10000); // 10 second timeout

    it("adding parameters to code is reflected in regenerated docs", async () => {
      await fc.assert(
        fc.asyncProperty(
          identifierArb,
          paramNameArb,
          paramNameArb,
          async (contractName, param1Name, param2Name) => {
            // Ensure param names are different
            if (param1Name === param2Name) {
              return true; // Skip this case
            }

            // Create contracts directory
            const contractsDir = path.join(tempDir, "src/ipc/types");
            await fs.mkdir(contractsDir, { recursive: true });

            const contractFile = path.join(contractsDir, "test.ts");

            // Initial contract with one parameter
            const initialContent = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

export const testContract = {
  ${contractName}: defineContract({
    channel: "test:${contractName}",
    input: z.object({ ${param1Name}: z.number() }),
    output: z.object({ result: z.string() }),
  }),
};
`;

            await fs.writeFile(contractFile, initialContent);

            // Generate initial documentation
            await docsGen.generateIPCDocumentation("src/ipc/types", {
              outputDir: "docs/ipc",
            });

            // Read initial documentation
            const docsPath = path.join(tempDir, "docs/ipc/test.md");
            const initialDocs = await fs.readFile(docsPath, "utf-8");

            // Verify only first parameter is in docs
            expect(initialDocs).toContain(param1Name);
            expect(initialDocs).not.toContain(param2Name);

            // Update contract with two parameters
            const updatedContent = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

export const testContract = {
  ${contractName}: defineContract({
    channel: "test:${contractName}",
    input: z.object({ ${param1Name}: z.number(), ${param2Name}: z.string() }),
    output: z.object({ result: z.string() }),
  }),
};
`;

            await fs.writeFile(contractFile, updatedContent);

            // Regenerate documentation
            await docsGen.generateIPCDocumentation("src/ipc/types", {
              outputDir: "docs/ipc",
            });

            // Read updated documentation
            const updatedDocs = await fs.readFile(docsPath, "utf-8");

            // Verify both parameters are now in docs (synchronization occurred)
            expect(updatedDocs).toContain(param1Name);
            expect(updatedDocs).toContain(param2Name);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    }, 10000); // 10 second timeout

    it("documentation timestamp updates when regenerated", async () => {
      await fc.assert(
        fc.asyncProperty(identifierArb, async (contractName) => {
          // Create contracts directory
          const contractsDir = path.join(tempDir, "src/ipc/types");
          await fs.mkdir(contractsDir, { recursive: true });

          const contractFile = path.join(contractsDir, "test.ts");
          const content = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

export const testContract = {
  ${contractName}: defineContract({
    channel: "test:${contractName}",
    input: z.object({ id: z.number() }),
    output: z.object({ result: z.string() }),
  }),
};
`;

          await fs.writeFile(contractFile, content);

          // Generate initial documentation
          await docsGen.generateIPCDocumentation("src/ipc/types", {
            outputDir: "docs/ipc",
          });

          const docsPath = path.join(tempDir, "docs/ipc/test.md");
          const initialDocs = await fs.readFile(docsPath, "utf-8");

          // Extract timestamp from initial docs
          const timestampMatch = initialDocs.match(/Generated on: (.+)/);
          expect(timestampMatch).toBeTruthy();

          // Wait a bit to ensure timestamp difference
          await new Promise((resolve) => setTimeout(resolve, 10));

          // Regenerate documentation
          await docsGen.generateIPCDocumentation("src/ipc/types", {
            outputDir: "docs/ipc",
          });

          const updatedDocs = await fs.readFile(docsPath, "utf-8");
          const updatedTimestampMatch = updatedDocs.match(/Generated on: (.+)/);
          expect(updatedTimestampMatch).toBeTruthy();

          // Verify timestamp changed (documentation was regenerated)
          expect(updatedTimestampMatch![1]).not.toBe(timestampMatch![1]);

          return true;
        }),
        { numRuns: 100 },
      );
    }, 10000); // 10 second timeout

    it("component documentation updates when component code changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[A-Z][a-zA-Z0-9]{2,15}$/), // PascalCase component name
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 101, max: 200 }),
          async (componentName, version1, version2) => {
            // Create components directory
            const componentsDir = path.join(tempDir, "src/components");
            await fs.mkdir(componentsDir, { recursive: true });

            const componentFile = path.join(
              componentsDir,
              `${componentName}.tsx`,
            );

            // Initial component
            const initialContent = `
/**
 * Component version ${version1}
 */
export function ${componentName}(props: ${componentName}Props) {
  return <div>{props.label}</div>;
}

interface ${componentName}Props {
  label: string;
}
`;

            await fs.writeFile(componentFile, initialContent);

            // Generate initial documentation
            await docsGen.generateComponentDocumentation("src/components", {
              outputDir: "docs/components",
            });

            // Read initial documentation
            const docsPath = path.join(
              tempDir,
              "docs/components/components.md",
            );
            const initialDocs = await fs.readFile(docsPath, "utf-8");

            // Update the component
            const updatedContent = `
/**
 * Component version ${version2}
 */
export function ${componentName}(props: ${componentName}Props) {
  return <div>{props.label}</div>;
}

interface ${componentName}Props {
  label: string;
}
`;

            await fs.writeFile(componentFile, updatedContent);

            // Regenerate documentation
            await docsGen.generateComponentDocumentation("src/components", {
              outputDir: "docs/components",
            });

            // Read updated documentation
            const updatedDocs = await fs.readFile(docsPath, "utf-8");

            // Verify documentation changed (synchronization occurred)
            expect(updatedDocs).not.toBe(initialDocs);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    }, 10000); // 10 second timeout
  });
});
