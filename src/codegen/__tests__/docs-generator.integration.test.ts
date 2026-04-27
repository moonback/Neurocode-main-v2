/**
 * Integration tests for Documentation Generator
 *
 * Tests the complete end-to-end workflow from code generation to documentation.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
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

describe("Documentation Generator Integration Tests", () => {
  let tempDir: string;
  let fsManager: FileSystemManager;
  let docsGen: DocumentationGenerator;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "docs-gen-integration-test-"),
    );
    fsManager = createFileSystemManager(tempDir, false);
    docsGen = createDocumentationGenerator(tempDir, fsManager);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await docsGen.stopAllWatchers();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("IPC Endpoint Documentation Generation", () => {
    it("should generate complete markdown documentation for IPC endpoint with JSDoc", async () => {
      // Requirement 10.1: Generate JSDoc comments with parameter descriptions for IPC endpoints
      // Requirement 10.3: Extract JSDoc and generate markdown documentation
      // Requirement 10.4: Generate markdown documentation for IPC endpoints

      // Create contracts directory
      const contractsDir = path.join(tempDir, "src/ipc/types");
      await fs.mkdir(contractsDir, { recursive: true });

      const contractFile = path.join(contractsDir, "user.ts");
      const content = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

/**
 * Retrieves user information by user ID
 * 
 * This endpoint fetches detailed user profile data including
 * name, email, and account status.
 * 
 * @param {number} userId - The unique identifier of the user
 * @returns {object} User object containing profile information
 * 
 * @example
 * const user = await getUser({ userId: 123 });
 * console.log(user.name);
 */
export const userContracts = {
  getUser: defineContract({
    channel: "user:get",
    input: z.object({ userId: z.number() }),
    output: z.object({ 
      name: z.string(), 
      email: z.string(),
      status: z.enum(["active", "inactive"])
    }),
  }),
};
`;

      await fs.writeFile(contractFile, content);

      // Generate documentation
      const results = await docsGen.generateIPCDocumentation("src/ipc/types", {
        outputDir: "docs/ipc",
      });

      // Verify file was created
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe("create");
      expect(results[0].path).toContain("user.md");

      // Read generated documentation
      const docsPath = path.join(tempDir, results[0].path);
      const docsContent = await fs.readFile(docsPath, "utf-8");

      // Verify documentation structure
      expect(docsContent).toContain("# IPC Endpoints Documentation");
      expect(docsContent).toContain("## Table of Contents");
      expect(docsContent).toContain("## getUser");

      // Verify JSDoc description is included
      expect(docsContent).toContain("Retrieves user information by user ID");
      expect(docsContent).toContain(
        "This endpoint fetches detailed user profile data",
      );

      // Verify channel information
      expect(docsContent).toContain("**Channel:** `user:get`");

      // Verify file path
      expect(docsContent).toContain("**File:** `src/ipc/types/user.ts`");

      // Verify input/output schemas
      expect(docsContent).toContain("### Input");
      expect(docsContent).toContain("userId");
      expect(docsContent).toContain("### Output");
      expect(docsContent).toContain("name");
      expect(docsContent).toContain("email");

      // Verify parameter documentation
      expect(docsContent).toContain("**Parameters:**");
      expect(docsContent).toContain("userId");
      expect(docsContent).toContain("number");
      expect(docsContent).toContain("unique identifier");

      // Verify return documentation
      expect(docsContent).toContain("**Returns:**");
      expect(docsContent).toContain(
        "User object containing profile information",
      );

      // Verify examples
      expect(docsContent).toContain("### Examples");
      expect(docsContent).toContain("getUser({ userId: 123 })");
    });

    it("should generate documentation for multiple IPC endpoints in the same file", async () => {
      // Requirement 10.4: Generate markdown documentation for IPC endpoints

      const contractsDir = path.join(tempDir, "src/ipc/types");
      await fs.mkdir(contractsDir, { recursive: true });

      const contractFile = path.join(contractsDir, "user.ts");
      const content = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

/**
 * Gets user by ID
 * @param {number} userId - User ID
 */
export const userContracts = {
  getUser: defineContract({
    channel: "user:get",
    input: z.object({ userId: z.number() }),
    output: z.object({ name: z.string() }),
  }),
  
  /**
   * Updates user information
   * @param {number} userId - User ID
   * @param {string} name - New name
   */
  updateUser: defineContract({
    channel: "user:update",
    input: z.object({ userId: z.number(), name: z.string() }),
    output: z.object({ success: z.boolean() }),
  }),
};
`;

      await fs.writeFile(contractFile, content);

      const results = await docsGen.generateIPCDocumentation("src/ipc/types");
      const docsPath = path.join(tempDir, results[0].path);
      const docsContent = await fs.readFile(docsPath, "utf-8");

      // Verify both endpoints are documented
      expect(docsContent).toContain("## getUser");
      expect(docsContent).toContain("## updateUser");
      expect(docsContent).toContain("user:get");
      expect(docsContent).toContain("user:update");
    });
  });

  describe("React Component Documentation Generation", () => {
    it("should generate complete markdown documentation for component with JSDoc", async () => {
      // Requirement 10.2: Generate JSDoc comments with prop descriptions for React components
      // Requirement 10.3: Extract JSDoc and generate markdown documentation
      // Requirement 10.4: Generate markdown documentation for React components

      const componentsDir = path.join(tempDir, "src/components");
      await fs.mkdir(componentsDir, { recursive: true });

      const componentFile = path.join(componentsDir, "UserProfile.tsx");
      const content = `
/**
 * UserProfile Component
 * 
 * Displays user profile information including avatar, name, and bio.
 * Supports both compact and expanded view modes.
 * 
 * @example
 * <UserProfile 
 *   userId={123} 
 *   showAvatar={true}
 *   compact={false}
 * />
 */
export function UserProfile(props: UserProfileProps) {
  return (
    <div>
      <h1>{props.name}</h1>
      {props.showAvatar && <img src={props.avatarUrl} alt="Avatar" />}
    </div>
  );
}

interface UserProfileProps {
  /** The unique identifier of the user */
  userId: number;
  
  /** The display name of the user */
  name: string;
  
  /** URL to the user's avatar image */
  avatarUrl?: string;
  
  /** Whether to show the user's avatar */
  showAvatar?: boolean;
  
  /** Whether to use compact layout */
  compact?: boolean;
}
`;

      await fs.writeFile(componentFile, content);

      // Generate documentation
      const results = await docsGen.generateComponentDocumentation(
        "src/components",
        {
          outputDir: "docs/components",
        },
      );

      // Verify file was created
      expect(results).toHaveLength(1);
      expect(results[0].action).toBe("create");
      expect(results[0].path).toContain("components.md");

      // Read generated documentation
      const docsPath = path.join(tempDir, results[0].path);
      const docsContent = await fs.readFile(docsPath, "utf-8");

      // Verify documentation structure
      expect(docsContent).toContain("# React Components Documentation");
      expect(docsContent).toContain("## Table of Contents");
      expect(docsContent).toContain("## UserProfile");

      // Verify JSDoc description
      expect(docsContent).toContain("UserProfile Component");
      expect(docsContent).toContain(
        "Displays user profile information including avatar",
      );

      // Verify file path
      expect(docsContent).toContain(
        "**File:** `src/components/UserProfile.tsx`",
      );

      // Verify props table
      expect(docsContent).toContain("### Props");
      expect(docsContent).toContain("| Name | Type | Required | Description |");

      // Verify all props are documented
      expect(docsContent).toContain("userId");
      expect(docsContent).toContain("number");
      expect(docsContent).toContain("Yes");

      expect(docsContent).toContain("name");
      expect(docsContent).toContain("string");

      expect(docsContent).toContain("avatarUrl");
      expect(docsContent).toContain("No");

      expect(docsContent).toContain("showAvatar");
      expect(docsContent).toContain("boolean");

      // Verify examples
      expect(docsContent).toContain("### Examples");
      expect(docsContent).toContain("<UserProfile");
      expect(docsContent).toContain("userId={123}");
    });

    it("should generate documentation for multiple components", async () => {
      // Requirement 10.4: Generate markdown documentation for React components

      const componentsDir = path.join(tempDir, "src/components");
      await fs.mkdir(componentsDir, { recursive: true });

      // Create first component
      const component1File = path.join(componentsDir, "Button.tsx");
      const content1 = `
/**
 * A reusable button component
 */
export function Button(props: ButtonProps) {
  return <button onClick={props.onClick}>{props.label}</button>;
}

interface ButtonProps {
  label: string;
  onClick?: () => void;
}
`;

      await fs.writeFile(component1File, content1);

      // Create second component
      const component2File = path.join(componentsDir, "Input.tsx");
      const content2 = `
/**
 * A reusable input component
 */
export function Input(props: InputProps) {
  return <input type="text" value={props.value} onChange={props.onChange} />;
}

interface InputProps {
  value: string;
  onChange: (value: string) => void;
}
`;

      await fs.writeFile(component2File, content2);

      const results =
        await docsGen.generateComponentDocumentation("src/components");
      const docsPath = path.join(tempDir, results[0].path);
      const docsContent = await fs.readFile(docsPath, "utf-8");

      // Verify both components are documented
      expect(docsContent).toContain("## Button");
      expect(docsContent).toContain("## Input");
      expect(docsContent).toContain("A reusable button component");
      expect(docsContent).toContain("A reusable input component");
    });
  });

  describe("Documentation Updates", () => {
    it("should update documentation when JSDoc changes", async () => {
      // Requirement 10.5: Update documentation when code changes are detected

      const contractsDir = path.join(tempDir, "src/ipc/types");
      await fs.mkdir(contractsDir, { recursive: true });

      const contractFile = path.join(contractsDir, "test.ts");

      // Initial version
      const initialContent = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

/**
 * Initial description
 */
export const testContract = {
  testEndpoint: defineContract({
    channel: "test:endpoint",
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

      const docsPath = path.join(tempDir, "docs/ipc/test.md");
      const initialDocs = await fs.readFile(docsPath, "utf-8");

      expect(initialDocs).toContain("Initial description");

      // Update JSDoc
      const updatedContent = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

/**
 * Updated description with more details
 * @param {number} id - The identifier
 * @returns {string} The result string
 */
export const testContract = {
  testEndpoint: defineContract({
    channel: "test:endpoint",
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

      const updatedDocs = await fs.readFile(docsPath, "utf-8");

      // Verify updated content
      expect(updatedDocs).toContain("Updated description with more details");
      expect(updatedDocs).toContain("The identifier");
      expect(updatedDocs).toContain("The result string");
      expect(updatedDocs).not.toContain("Initial description");
    });

    it("should detect when documentation is outdated", async () => {
      // Requirement 10.5: Update documentation when code changes are detected

      const contractsDir = path.join(tempDir, "src/ipc/types");
      await fs.mkdir(contractsDir, { recursive: true });

      const contractFile = path.join(contractsDir, "test.ts");
      const content = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

export const testContract = {
  test: defineContract({
    channel: "test:test",
    input: z.object({ id: z.number() }),
    output: z.object({ result: z.string() }),
  }),
};
`;

      await fs.writeFile(contractFile, content);

      // Generate documentation
      await docsGen.generateIPCDocumentation("src/ipc/types", {
        outputDir: "docs/ipc",
      });

      const docsPath = path.join(tempDir, "docs/ipc/test.md");

      // Check documentation is up to date
      let isUpToDate = await docsGen.isDocumentationUpToDate(
        "src/ipc/types",
        "docs/ipc/test.md",
      );
      expect(isUpToDate).toBe(true);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify source file
      await fs.writeFile(contractFile, content + "\n// Modified");

      // Check documentation is now outdated
      isUpToDate = await docsGen.isDocumentationUpToDate(
        "src/ipc/types",
        "docs/ipc/test.md",
      );
      expect(isUpToDate).toBe(false);

      // Regenerate if outdated
      const wasRegenerated = await docsGen.regenerateIfOutdated(
        "src/ipc/types",
        "docs/ipc/test.md",
        "ipc",
        { outputDir: "docs/ipc" },
      );
      expect(wasRegenerated).toBe(true);

      // Check documentation is up to date again
      isUpToDate = await docsGen.isDocumentationUpToDate(
        "src/ipc/types",
        "docs/ipc/test.md",
      );
      expect(isUpToDate).toBe(true);
    });
  });

  describe("Documentation Validation", () => {
    it("should validate that all public APIs have documentation", async () => {
      // Requirement 10.6: Validate all public APIs have documentation comments

      const testFile = path.join(tempDir, "test.ts");
      const content = `
/**
 * This function has documentation
 */
export function documented() {
  return "documented";
}

export function undocumented() {
  return "undocumented";
}

/**
 * This class has documentation
 */
export class DocumentedClass {}

export class UndocumentedClass {}
`;

      await fs.writeFile(testFile, content);

      const result = await docsGen.validateDocumentation(["test.ts"]);

      // Should have warnings for undocumented exports
      expect(result.errors.length).toBeGreaterThan(0);

      // Check for specific undocumented items
      const undocumentedFunction = result.errors.find(
        (e) => e.name === "undocumented",
      );
      expect(undocumentedFunction).toBeDefined();
      expect(undocumentedFunction?.message).toContain("Missing JSDoc");

      const undocumentedClass = result.errors.find(
        (e) => e.name === "UndocumentedClass",
      );
      expect(undocumentedClass).toBeDefined();
    });

    it("should validate documentation completeness for a directory", async () => {
      // Requirement 10.6: Validate all public APIs have documentation comments

      const contractsDir = path.join(tempDir, "src/ipc/types");
      await fs.mkdir(contractsDir, { recursive: true });

      const contractFile = path.join(contractsDir, "test.ts");
      const content = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

/**
 * Well documented contract
 */
export const testContract = {
  test: defineContract({
    channel: "test:test",
    input: z.object({ id: z.number() }),
    output: z.object({ result: z.string() }),
  }),
};
`;

      await fs.writeFile(contractFile, content);

      // Generate documentation
      await docsGen.generateIPCDocumentation("src/ipc/types", {
        outputDir: "docs/ipc",
      });

      // Validate documentation completeness
      const result = await docsGen.validateDocumentationCompleteness(
        "src/ipc/types",
        "docs/ipc/test.md",
      );

      // Should be valid since we have JSDoc and generated docs
      expect(result.valid).toBe(true);
    });

    it("should warn when documentation file is missing", async () => {
      // Requirement 10.6: Validate all public APIs have documentation comments

      const contractsDir = path.join(tempDir, "src/ipc/types");
      await fs.mkdir(contractsDir, { recursive: true });

      const contractFile = path.join(contractsDir, "test.ts");
      const content = `
export const testContract = {
  test: { channel: "test:test" }
};
`;

      await fs.writeFile(contractFile, content);

      // Validate without generating docs first
      const result = await docsGen.validateDocumentationCompleteness(
        "src/ipc/types",
        "docs/ipc/test.md",
      );

      // Should have error about missing documentation file
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain("not found");
    });
  });

  describe("Complete End-to-End Workflow", () => {
    it("should handle complete workflow: generate IPC endpoint, document it, update it, re-document", async () => {
      // Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6

      // Step 1: Create IPC endpoint with JSDoc
      const contractsDir = path.join(tempDir, "src/ipc/types");
      await fs.mkdir(contractsDir, { recursive: true });

      const contractFile = path.join(contractsDir, "user.ts");
      const initialContent = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

/**
 * Gets user by ID
 * @param {number} userId - The user ID
 * @returns {object} User data
 */
export const userContracts = {
  getUser: defineContract({
    channel: "user:get",
    input: z.object({ userId: z.number() }),
    output: z.object({ name: z.string(), email: z.string() }),
  }),
};
`;

      await fs.writeFile(contractFile, initialContent);

      // Step 2: Generate documentation
      const results = await docsGen.generateIPCDocumentation("src/ipc/types", {
        outputDir: "docs/ipc",
      });

      expect(results).toHaveLength(1);
      expect(results[0].action).toBe("create");

      const docsPath = path.join(tempDir, results[0].path);
      let docsContent = await fs.readFile(docsPath, "utf-8");

      expect(docsContent).toContain("Gets user by ID");
      expect(docsContent).toContain("userId");

      // Step 3: Validate documentation
      let validation = await docsGen.validateDocumentationCompleteness(
        "src/ipc/types",
        "docs/ipc/user.md",
      );

      expect(validation.valid).toBe(true);

      // Step 4: Update JSDoc with more details
      const updatedContent = `
import { z } from "zod";
import { defineContract } from "../contracts/core";

/**
 * Retrieves user information by user ID
 * 
 * This endpoint fetches user profile data from the database.
 * 
 * @param {number} userId - The unique identifier of the user to retrieve
 * @returns {object} User object with name and email
 * 
 * @example
 * const user = await getUser({ userId: 123 });
 */
export const userContracts = {
  getUser: defineContract({
    channel: "user:get",
    input: z.object({ userId: z.number() }),
    output: z.object({ name: z.string(), email: z.string() }),
  }),
};
`;

      await fs.writeFile(contractFile, updatedContent);

      // Step 5: Regenerate documentation
      await docsGen.generateIPCDocumentation("src/ipc/types", {
        outputDir: "docs/ipc",
      });

      docsContent = await fs.readFile(docsPath, "utf-8");

      // Verify updated documentation
      expect(docsContent).toContain("Retrieves user information by user ID");
      expect(docsContent).toContain(
        "This endpoint fetches user profile data from the database",
      );
      expect(docsContent).toContain("unique identifier");
      expect(docsContent).toContain("### Examples");
      expect(docsContent).toContain("const user = await getUser");

      // Step 6: Validate updated documentation
      validation = await docsGen.validateDocumentationCompleteness(
        "src/ipc/types",
        "docs/ipc/user.md",
      );

      expect(validation.valid).toBe(true);
    });

    it("should handle complete workflow: generate component, document it, update it, re-document", async () => {
      // Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6

      // Step 1: Create component with JSDoc
      const componentsDir = path.join(tempDir, "src/components");
      await fs.mkdir(componentsDir, { recursive: true });

      const componentFile = path.join(componentsDir, "Button.tsx");
      const initialContent = `
/**
 * A simple button component
 */
export function Button(props: ButtonProps) {
  return <button onClick={props.onClick}>{props.label}</button>;
}

interface ButtonProps {
  label: string;
  onClick?: () => void;
}
`;

      await fs.writeFile(componentFile, initialContent);

      // Step 2: Generate documentation
      const results = await docsGen.generateComponentDocumentation(
        "src/components",
        {
          outputDir: "docs/components",
        },
      );

      expect(results).toHaveLength(1);

      const docsPath = path.join(tempDir, results[0].path);
      let docsContent = await fs.readFile(docsPath, "utf-8");

      expect(docsContent).toContain("A simple button component");
      expect(docsContent).toContain("Button");

      // Step 3: Update component with more details
      const updatedContent = `
/**
 * Button Component
 * 
 * A reusable button component with customizable styling and behavior.
 * Supports click handlers and various visual variants.
 * 
 * @example
 * <Button label="Click me" onClick={() => console.log('clicked')} />
 */
export function Button(props: ButtonProps) {
  return <button onClick={props.onClick}>{props.label}</button>;
}

interface ButtonProps {
  /** The text to display on the button */
  label: string;
  
  /** Optional click handler */
  onClick?: () => void;
  
  /** Visual variant of the button */
  variant?: "primary" | "secondary";
}
`;

      await fs.writeFile(componentFile, updatedContent);

      // Step 4: Regenerate documentation
      await docsGen.generateComponentDocumentation("src/components", {
        outputDir: "docs/components",
      });

      docsContent = await fs.readFile(docsPath, "utf-8");

      // Verify updated documentation
      expect(docsContent).toContain("Button Component");
      expect(docsContent).toContain(
        "A reusable button component with customizable styling",
      );
      expect(docsContent).toContain("variant");
      expect(docsContent).toContain("primary");
      expect(docsContent).toContain("### Examples");
    });
  });
});
