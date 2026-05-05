/**
 * Tests for Documentation Generator
 *
 * Tests JSDoc extraction, markdown generation, and documentation validation.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  createDocumentationGenerator,
  DocumentationGenerator,
} from "../docs-generator";
import { createFileSystemManager, FileSystemManager } from "../file-system";

describe("DocumentationGenerator", () => {
  let tempDir: string;
  let fsManager: FileSystemManager;
  let docsGen: DocumentationGenerator;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-gen-test-"));
    fsManager = createFileSystemManager(tempDir, false);
    docsGen = createDocumentationGenerator(tempDir, fsManager);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("extractJSDoc", () => {
    it("should extract JSDoc comments from a file", async () => {
      const testFile = path.join(tempDir, "test.ts");
      const content = `
/**
 * This is a test function
 * @param {string} name - The name parameter
 * @param {number} age - The age parameter
 * @returns {string} A greeting message
 * @example
 * greet("John", 30)
 */
export function greet(name: string, age: number): string {
  return \`Hello \${name}, you are \${age} years old\`;
}
`;

      await fs.writeFile(testFile, content);

      const jsdocs = await docsGen.extractJSDoc("test.ts");

      expect(jsdocs).toHaveLength(1);
      expect(jsdocs[0].name).toBe("greet");
      expect(jsdocs[0].description).toContain("test function");
      expect(jsdocs[0].params).toHaveLength(2);
      expect(jsdocs[0].params[0].name).toBe("name");
      expect(jsdocs[0].params[0].type).toBe("string");
      expect(jsdocs[0].params[1].name).toBe("age");
      expect(jsdocs[0].params[1].type).toBe("number");
      expect(jsdocs[0].returns).toContain("greeting message");
      expect(jsdocs[0].examples).toHaveLength(1);
    });

    it("should handle multiple JSDoc comments", async () => {
      const testFile = path.join(tempDir, "multi.ts");
      const content = `
/**
 * First function
 */
export function first() {}

/**
 * Second function
 */
export function second() {}
`;

      await fs.writeFile(testFile, content);

      const jsdocs = await docsGen.extractJSDoc("multi.ts");

      expect(jsdocs).toHaveLength(2);
      expect(jsdocs[0].name).toBe("first");
      expect(jsdocs[1].name).toBe("second");
    });

    it("should handle optional parameters", async () => {
      const testFile = path.join(tempDir, "optional.ts");
      const content = `
/**
 * Function with optional param
 * @param {string} required - Required parameter
 * @param {string} [optional] - Optional parameter
 */
export function test(required: string, optional?: string) {}
`;

      await fs.writeFile(testFile, content);

      const jsdocs = await docsGen.extractJSDoc("optional.ts");

      expect(jsdocs[0].params).toHaveLength(2);
      expect(jsdocs[0].params[0].optional).toBe(false);
      expect(jsdocs[0].params[1].optional).toBe(true);
    });
  });

  describe("extractIPCContracts", () => {
    it("should extract IPC contracts from a file", async () => {
      const testFile = path.join(tempDir, "contracts.ts");
      const content = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

/**
 * Gets user information
 */
export const getUserContract = {
  getUser: defineContract({
    channel: "user:get",
    input: z.object({ userId: z.number() }),
    output: z.object({ name: z.string(), email: z.string() }),
  }),
};
`;

      await fs.writeFile(testFile, content);

      const contracts = await docsGen.extractIPCContracts("contracts.ts");

      expect(contracts).toHaveLength(1);
      expect(contracts[0].name).toBe("getUser");
      expect(contracts[0].channel).toBe("user:get");
      expect(contracts[0].inputSchema).toContain("userId");
      expect(contracts[0].outputSchema).toContain("name");
    });
  });

  describe("generateIPCDocs", () => {
    it("should generate markdown documentation for IPC contracts", () => {
      const contracts = [
        {
          name: "getUser",
          channel: "user:get",
          inputSchema: "z.object({ userId: z.number() })",
          outputSchema: "z.object({ name: z.string() })",
          filePath: "src/ipc/types/user.ts",
          jsdoc: {
            name: "getUser",
            description: "Gets user information by ID",
            params: [
              {
                name: "userId",
                type: "number",
                description: "The user ID",
                optional: false,
              },
            ],
            returns: "User object with name and email",
            examples: ["getUser({ userId: 123 })"],
            tags: {},
          },
        },
      ];

      const markdown = docsGen.generateIPCDocs(contracts);

      expect(markdown).toContain("# IPC Endpoints Documentation");
      expect(markdown).toContain("## getUser");
      expect(markdown).toContain("Gets user information by ID");
      expect(markdown).toContain("**Channel:** `user:get`");
      expect(markdown).toContain("### Input");
      expect(markdown).toContain("### Output");
      expect(markdown).toContain("userId");
      expect(markdown).toContain("The user ID");
    });
  });

  describe("generateComponentDocs", () => {
    it("should generate markdown documentation for React components", () => {
      const components = [
        {
          name: "UserProfile",
          filePath: "src/components/UserProfile.tsx",
          props: [
            {
              name: "userId",
              type: "number",
              description: "The user ID to display",
              optional: false,
            },
            {
              name: "showEmail",
              type: "boolean",
              description: "Whether to show email",
              optional: true,
            },
          ],
          jsdoc: {
            name: "UserProfile",
            description: "Displays user profile information",
            params: [],
            examples: ["<UserProfile userId={123} showEmail={true} />"],
            tags: {},
          },
        },
      ];

      const markdown = docsGen.generateComponentDocs(components);

      expect(markdown).toContain("# React Components Documentation");
      expect(markdown).toContain("## UserProfile");
      expect(markdown).toContain("Displays user profile information");
      expect(markdown).toContain("### Props");
      expect(markdown).toContain("userId");
      expect(markdown).toContain("number");
      expect(markdown).toContain("Yes");
      expect(markdown).toContain("showEmail");
      expect(markdown).toContain("boolean");
      expect(markdown).toContain("No");
    });
  });

  describe("validateDocumentation", () => {
    it("should detect missing JSDoc comments", async () => {
      const testFile = path.join(tempDir, "missing-docs.ts");
      const content = `
export function undocumented() {
  return "no docs";
}

/**
 * This one has docs
 */
export function documented() {
  return "has docs";
}
`;

      await fs.writeFile(testFile, content);

      const result = await docsGen.validateDocumentation(["missing-docs.ts"]);

      expect(result.valid).toBe(true); // Only warnings, not errors
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].name).toBe("undocumented");
      expect(result.errors[0].message).toContain("Missing JSDoc");
    });

    it("should detect JSDoc without description", async () => {
      const testFile = path.join(tempDir, "empty-desc.ts");
      const content = `
/**
 * 
 */
export function emptyDescription() {}
`;

      await fs.writeFile(testFile, content);

      const result = await docsGen.validateDocumentation(["empty-desc.ts"]);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("missing a description");
    });
  });

  describe("generateIPCDocumentation", () => {
    it("should generate documentation for all contracts in a directory", async () => {
      // Create a contracts directory
      const contractsDir = path.join(tempDir, "src/ipc/types");
      await fs.mkdir(contractsDir, { recursive: true });

      const contractFile = path.join(contractsDir, "user.ts");
      const content = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

export const userContracts = {
  getUser: defineContract({
    channel: "user:get",
    input: z.object({ userId: z.number() }),
    output: z.object({ name: z.string() }),
  }),
};
`;

      await fs.writeFile(contractFile, content);

      const results = await docsGen.generateIPCDocumentation("src/ipc/types");

      expect(results).toHaveLength(1);
      expect(results[0].action).toBe("create");
      expect(results[0].path).toContain("user.md");

      // Verify the generated file exists
      const docsPath = path.join(tempDir, results[0].path);
      const docsContent = await fs.readFile(docsPath, "utf-8");
      expect(docsContent).toContain("# IPC Endpoints Documentation");
      expect(docsContent).toContain("getUser");
    });
  });

  describe("generateComponentDocumentation", () => {
    it("should generate documentation for all components in a directory", async () => {
      // Create a components directory
      const componentsDir = path.join(tempDir, "src/components");
      await fs.mkdir(componentsDir, { recursive: true });

      const componentFile = path.join(componentsDir, "Button.tsx");
      const content = `
/**
 * A reusable button component
 */
export function Button(props: ButtonProps) {
  return <button>{props.label}</button>;
}

interface ButtonProps {
  label: string;
  onClick?: () => void;
}
`;

      await fs.writeFile(componentFile, content);

      const results =
        await docsGen.generateComponentDocumentation("src/components");

      expect(results).toHaveLength(1);
      expect(results[0].action).toBe("create");
      expect(results[0].path).toContain("components.md");

      // Verify the generated file exists
      const docsPath = path.join(tempDir, results[0].path);
      const docsContent = await fs.readFile(docsPath, "utf-8");
      expect(docsContent).toContain("# React Components Documentation");
      expect(docsContent).toContain("Button");
    });
  });
});
