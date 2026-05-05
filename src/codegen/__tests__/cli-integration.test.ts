/**
 * Integration tests for CLI command parameter collection
 *
 * Tests the integration between CLI commands and the prompt system,
 * verifying both interactive and non-interactive modes work correctly.
 */

import { describe, it, expect } from "vitest";
import {
  collectParameters,
  validators,
  type ParameterDefinition,
} from "../prompt-system";

describe("CLI Integration Tests", () => {
  describe("IPC command parameter collection", () => {
    const ipcParameterDefinitions: ParameterDefinition[] = [
      {
        name: "name",
        description: "Name of the IPC endpoint",
        type: "string",
        required: true,
        validate: validators.combine(validators.notEmpty, validators.camelCase),
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

    it("should succeed in non-interactive mode with valid parameters", async () => {
      const result = await collectParameters(
        ipcParameterDefinitions,
        { name: "getUser", domain: "user" },
        { interactive: false },
      );

      expect(result.success).toBe(true);
      expect(result.parameters.name).toBe("getUser");
      expect(result.parameters.domain).toBe("user");
      expect(result.errors).toHaveLength(0);
    });

    it("should fail in non-interactive mode with missing parameters", async () => {
      const result = await collectParameters(
        ipcParameterDefinitions,
        { name: "getUser" },
        { interactive: false },
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("domain");
    });

    it("should fail in non-interactive mode with invalid camelCase name", async () => {
      const result = await collectParameters(
        ipcParameterDefinitions,
        { name: "GetUser", domain: "user" },
        { interactive: false },
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("camelCase");
    });
  });

  describe("Component command parameter collection", () => {
    const componentParameterDefinitions: ParameterDefinition[] = [
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

    it("should succeed in non-interactive mode with valid PascalCase name", async () => {
      const result = await collectParameters(
        componentParameterDefinitions,
        { name: "UserProfile" },
        { interactive: false },
      );

      expect(result.success).toBe(true);
      expect(result.parameters.name).toBe("UserProfile");
      expect(result.errors).toHaveLength(0);
    });

    it("should fail in non-interactive mode with invalid PascalCase name", async () => {
      const result = await collectParameters(
        componentParameterDefinitions,
        { name: "userProfile" },
        { interactive: false },
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("PascalCase");
    });
  });

  describe("Test command parameter collection", () => {
    const testParameterDefinitions: ParameterDefinition[] = [
      {
        name: "feature",
        description: "Name of the feature to test",
        type: "string",
        required: true,
        validate: validators.combine(validators.notEmpty, validators.kebabCase),
      },
    ];

    it("should succeed in non-interactive mode with valid kebab-case name", async () => {
      const result = await collectParameters(
        testParameterDefinitions,
        { feature: "user-authentication" },
        { interactive: false },
      );

      expect(result.success).toBe(true);
      expect(result.parameters.feature).toBe("user-authentication");
      expect(result.errors).toHaveLength(0);
    });

    it("should fail in non-interactive mode with invalid kebab-case name", async () => {
      const result = await collectParameters(
        testParameterDefinitions,
        { feature: "UserAuthentication" },
        { interactive: false },
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("kebab-case");
    });
  });

  describe("Schema command parameter collection", () => {
    const schemaParameterDefinitions: ParameterDefinition[] = [
      {
        name: "table",
        description: "Name of the database table",
        type: "string",
        required: true,
        validate: validators.combine(
          validators.notEmpty,
          validators.identifier,
        ),
      },
    ];

    it("should succeed in non-interactive mode with valid identifier", async () => {
      const result = await collectParameters(
        schemaParameterDefinitions,
        { table: "users" },
        { interactive: false },
      );

      expect(result.success).toBe(true);
      expect(result.parameters.table).toBe("users");
      expect(result.errors).toHaveLength(0);
    });

    it("should accept identifiers with underscores and hyphens", async () => {
      const result1 = await collectParameters(
        schemaParameterDefinitions,
        { table: "user_profiles" },
        { interactive: false },
      );

      expect(result1.success).toBe(true);

      const result2 = await collectParameters(
        schemaParameterDefinitions,
        { table: "user-profiles" },
        { interactive: false },
      );

      expect(result2.success).toBe(true);
    });

    it("should fail with invalid identifier starting with number", async () => {
      const result = await collectParameters(
        schemaParameterDefinitions,
        { table: "123users" },
        { interactive: false },
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("start with a letter");
    });
  });
});
